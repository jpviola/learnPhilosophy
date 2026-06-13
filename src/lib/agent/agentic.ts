import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { buildSystemPrompt } from "~/lib/prompts/templates";
import { trimHistory } from "./conversation";
import { TOOLS, executeTool, dedupeActions, type TutorAction } from "./tools/registry";
import type { AskRequest } from "./types";

// Tool-using ("agentic") tutor turn: the model may call topic-graph tools
// (search/related/learning-path) across a few rounds, then produces the final
// answer (streamed). Tool calls also yield `actions` — topics and a learning
// path — surfaced to the UI so the user can navigate from the chat.

const MAX_ROUNDS = 4;
const MAX_TOKENS = 1024;

export interface AgenticResult {
  provider: string;
  stream: ReadableStream<Uint8Array>;
  actions: TutorAction[];
}

const encoder = new TextEncoder();

function singleChunkStream(text: string): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      if (text) controller.enqueue(encoder.encode(text));
      controller.close();
    },
  });
}

/** Runs a tool-enabled turn against whichever provider supports it. */
export async function runAgenticTurn(req: AskRequest): Promise<AgenticResult> {
  if (process.env.NEBIUS_API_KEY) return runOpenAIAgentic(req, process.env.NEBIUS_API_KEY);
  if (process.env.ANTHROPIC_API_KEY) return runAnthropicAgentic(req, process.env.ANTHROPIC_API_KEY);
  throw new Error("No tool-capable provider configured");
}

// ── OpenAI-compatible (Nebius) ───────────────────────────────

async function runOpenAIAgentic(req: AskRequest, apiKey: string): Promise<AgenticResult> {
  const client = new OpenAI({ baseURL: "https://api.tokenfactory.nebius.com/v1/", apiKey });
  const model = process.env.NEBIUS_MODEL ?? "MiniMaxAI/MiniMax-M2.5-fast";

  const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = TOOLS.map((t) => ({
    type: "function",
    function: { name: t.name, description: t.description, parameters: t.parameters as any },
  }));

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: buildSystemPrompt(req) },
    ...trimHistory(req.history).map((h) => ({ role: h.role, content: h.content })),
    { role: "user", content: req.question },
  ];

  const actions: TutorAction[] = [];

  for (let round = 0; round < MAX_ROUNDS; round++) {
    const resp = await client.chat.completions.create({
      model,
      max_tokens: MAX_TOKENS,
      messages,
      tools,
      tool_choice: "auto",
    });
    const msg = resp.choices[0]?.message;
    if (!msg) break;

    if (!msg.tool_calls || msg.tool_calls.length === 0) {
      return { provider: "nebius", actions: dedupeActions(actions), stream: singleChunkStream(msg.content ?? "") };
    }

    messages.push(msg as OpenAI.Chat.Completions.ChatCompletionMessageParam);
    for (const call of msg.tool_calls) {
      let args: Record<string, unknown> = {};
      try {
        args = JSON.parse(call.function.arguments || "{}");
      } catch {
        /* leave args empty on malformed JSON */
      }
      const outcome = executeTool(call.function.name, args);
      actions.push(...outcome.actions);
      messages.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(outcome.result) });
    }
  }

  // Tools exhausted the round budget — force a final answer (no tools), streamed.
  const stream = await client.chat.completions.create({
    model,
    max_tokens: MAX_TOKENS,
    stream: true,
    messages,
  });
  const bytes = new ReadableStream<Uint8Array>({
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
  return { provider: "nebius", actions: dedupeActions(actions), stream: bytes };
}

// ── Anthropic ────────────────────────────────────────────────

async function runAnthropicAgentic(req: AskRequest, apiKey: string): Promise<AgenticResult> {
  const client = new Anthropic({ apiKey });
  const system = buildSystemPrompt(req);
  const tools = TOOLS.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: t.parameters,
  }));

  const messages: Anthropic.MessageParam[] = [
    ...trimHistory(req.history).map((h) => ({ role: h.role, content: h.content })),
    { role: "user", content: req.question },
  ];

  const actions: TutorAction[] = [];

  for (let round = 0; round < MAX_ROUNDS; round++) {
    const resp = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: MAX_TOKENS,
      system,
      messages,
      tools: tools as any,
    });

    if (resp.stop_reason !== "tool_use") {
      const text = resp.content
        .filter((b) => b.type === "text")
        .map((b) => (b as { text: string }).text)
        .join("");
      return { provider: "anthropic", actions: dedupeActions(actions), stream: singleChunkStream(text) };
    }

    messages.push({ role: "assistant", content: resp.content });
    const toolResults: unknown[] = [];
    for (const block of resp.content) {
      if (block.type === "tool_use") {
        const outcome = executeTool(block.name, (block.input ?? {}) as Record<string, unknown>);
        actions.push(...outcome.actions);
        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: JSON.stringify(outcome.result),
        });
      }
    }
    messages.push({ role: "user", content: toolResults as any });
  }

  const stream = client.messages.stream({ model: "claude-sonnet-4-6", max_tokens: MAX_TOKENS, system, messages });
  const bytes = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
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
  return { provider: "anthropic", actions: dedupeActions(actions), stream: bytes };
}
