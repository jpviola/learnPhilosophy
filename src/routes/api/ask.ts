import type { APIEvent } from "@solidjs/start/server";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

// ── Types ────────────────────────────────────────────────────

interface AskRequest {
  question: string;
  topicName: string;
  topicDescription: string;
  topicCategory: string;
  topicBody?: string;
  ontologyContext?: string;
  resourceTitles: string[];
  history?: { role: "user" | "assistant"; content: string }[];
}

// ── System prompt ────────────────────────────────────────────

function buildSystemPrompt(req: AskRequest): string {
  const resources =
    req.resourceTitles.length > 0
      ? `\nKey works on this topic: ${req.resourceTitles.join(", ")}.`
      : "";

  const knowledgeBase = req.topicBody 
    ? `\nCORE KNOWLEDGE BASE (Use this as your primary source):\n${req.topicBody}`
    : "";
  const ontologyContext = req.ontologyContext
    ? `\nONTOLOGY MAP (Use this to type entities, relations, rules, and source traceability):\n${req.ontologyContext}`
    : "";

  return `You are a knowledgeable and engaging philosophy teacher specializing in ${req.topicName} (${req.topicCategory}).

Topic context: ${req.topicDescription}${resources}${ontologyContext}${knowledgeBase}

Guidelines:
- Answer clearly and precisely, rooted in the topic context and knowledge base provided above (RAG).
- Use the ontology map to distinguish entity types, relationships, learning resources, and conceptual neighbors.
- Prefer relationships from the ontology when explaining how ideas connect.
- Preserve traceability: when using a claim from the provided topic body, resources, or ontology, mention the relevant work, philosopher, concept, or source context naturally.
- Reference specific philosophers, texts, or arguments from the resources when relevant.
- Keep answers focused: 2–4 paragraphs max.
- Use accessible language — assume a curious high school or early college student.
- If the question is outside this topic's scope, briefly redirect toward what the topic can offer.
- Do not use markdown headers. Use plain paragraphs. Bold key terms sparingly.
- If the user provides a history of conversation, maintain continuity and avoid repeating yourself.`;
}

// ── OpenSpace MCP integration ────────────────────────────────
// When OPENSPACE_URL is set (e.g. http://127.0.0.1:8081/mcp),
// questions are routed through OpenSpace's skill system.
// OpenSpace caches evolved skills — common questions are served
// without a full LLM call, cutting costs and latency.

async function callOpenSpace(
  url: string,
  req: AskRequest
): Promise<ReadableStream<Uint8Array>> {
  // Context Engineering: Only keep the last 6 messages
  const maxHistory = 6;
  const history = req.history?.slice(-maxHistory) ?? [];

  const body = JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    method: "tools/call",
    params: {
      name: "philosophy_qa",
      arguments: {
        question: req.question,
        topic: req.topicName,
        context: req.topicDescription,
        body: req.topicBody, // RAG: Full content
        ontology: req.ontologyContext,
        resources: req.resourceTitles,
        history, // Context Engineering: History
      },
    },
  });

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });

  if (!res.ok) throw new Error(`OpenSpace responded ${res.status}`);
  const data = await res.json();
  const text =
    data?.result?.content?.[0]?.text ?? "No response from OpenSpace.";

  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(text));
      controller.close();
    },
  });
}

// ── Nebius Token Factory streaming (OpenAI-compatible) ───────
// Uses any model available on Nebius (DeepSeek, Llama, Qwen…).
// Significantly cheaper than hosted frontier models for
// educational workloads. Swap NEBIUS_MODEL to try different ones.

async function callNebius(
  apiKey: string,
  req: AskRequest
): Promise<ReadableStream<Uint8Array>> {
  const client = new OpenAI({
    baseURL: "https://api.tokenfactory.nebius.com/v1/",
    apiKey,
  });

  const model = process.env.NEBIUS_MODEL ?? "deepseek-ai/DeepSeek-R1-0528";
  const encoder = new TextEncoder();

  // Context Engineering: Only keep the last 6 messages to stay within context window limits
  const maxHistory = 6;
  const history = req.history?.slice(-maxHistory) ?? [];

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: buildSystemPrompt(req) },
    ...history.map(h => ({ role: h.role, content: h.content })),
    { role: "user", content: req.question },
  ];

  const stream = await client.chat.completions.create({
    model,
    max_tokens: 1024,
    stream: true,
    messages,
  });

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          const text = chunk.choices[0]?.delta?.content ?? "";
          if (text) controller.enqueue(encoder.encode(text));
        }
      } finally {
        controller.close();
      }
    },
    cancel() {
      stream.controller.abort();
    },
  });
}

// ── Anthropic streaming ──────────────────────────────────────

async function callAnthropic(
  apiKey: string,
  req: AskRequest
): Promise<ReadableStream<Uint8Array>> {
  const client = new Anthropic({ apiKey });
  const encoder = new TextEncoder();

  // Context Engineering: Only keep the last 6 messages
  const maxHistory = 6;
  const history = req.history?.slice(-maxHistory) ?? [];

  const stream = client.messages.stream({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: buildSystemPrompt(req),
    messages: [
      ...history.map(h => ({ role: h.role, content: h.content })),
      { role: "user", content: req.question }
    ],
  });

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          if (
            chunk.type === "content_block_delta" &&
            chunk.delta.type === "text_delta"
          ) {
            controller.enqueue(encoder.encode(chunk.delta.text));
          }
        }
      } finally {
        controller.close();
      }
    },
    cancel() {
      stream.abort();
    },
  });
}

// ── Route handler ────────────────────────────────────────────

export async function POST(event: APIEvent) {
  let body: AskRequest;

  try {
    body = await event.request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!body.question?.trim()) {
    return new Response(JSON.stringify({ error: "question is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const openspaceUrl = process.env.OPENSPACE_URL;
  const nebiusKey = process.env.NEBIUS_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  if (!openspaceUrl && !nebiusKey && !anthropicKey) {
    return new Response(
      JSON.stringify({
        error:
          "Set NEBIUS_API_KEY, ANTHROPIC_API_KEY, or OPENSPACE_URL in your .env file.",
      }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    // Priority: Nebius → Anthropic → OpenSpace
    const stream = nebiusKey
      ? await callNebius(nebiusKey, body)
      : anthropicKey
        ? await callAnthropic(anthropicKey, body)
        : await callOpenSpace(openspaceUrl!, body);

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }
}
