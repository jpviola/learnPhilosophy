import Anthropic from "@anthropic-ai/sdk";
import { buildSystemPrompt } from "~/lib/prompts/templates";
import { trimHistory } from "~/lib/agent/conversation";
import type { AskRequest } from "~/lib/agent/types";

export async function callAnthropic(
  apiKey: string,
  req: AskRequest
): Promise<ReadableStream<Uint8Array>> {
  const client = new Anthropic({ apiKey });
  const encoder = new TextEncoder();
  const history = trimHistory(req.history);

  const stream = client.messages.stream({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: buildSystemPrompt(req),
    messages: [
      ...history.map((h) => ({ role: h.role, content: h.content })),
      { role: "user", content: req.question },
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
