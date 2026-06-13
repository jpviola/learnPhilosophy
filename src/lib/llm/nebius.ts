import OpenAI from "openai";
import { buildSystemPrompt } from "~/lib/prompts/templates";
import { trimHistory } from "~/lib/agent/conversation";
import type { AskRequest } from "~/lib/agent/types";

// Nebius Token Factory (OpenAI-compatible). Open-source models (DeepSeek, Llama,
// Qwen, MiniMax…) — significantly cheaper than frontier models for educational
// workloads. Swap NEBIUS_MODEL to try different ones.
//
// Default is a non-reasoning model so the answer streams directly. Reasoning
// models (e.g. DeepSeek-R1) emit <think> blocks; those are stripped downstream
// by the output filter as a safety net.
const DEFAULT_MODEL = "MiniMaxAI/MiniMax-M2.5-fast";

export async function callNebius(
  apiKey: string,
  req: AskRequest
): Promise<ReadableStream<Uint8Array>> {
  const client = new OpenAI({
    baseURL: "https://api.tokenfactory.nebius.com/v1/",
    apiKey,
  });

  const model = process.env.NEBIUS_MODEL ?? DEFAULT_MODEL;
  const encoder = new TextEncoder();
  const history = trimHistory(req.history);

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: buildSystemPrompt(req) },
    ...history.map((h) => ({ role: h.role, content: h.content })),
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
