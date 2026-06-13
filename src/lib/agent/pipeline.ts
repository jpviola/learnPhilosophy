import { openProviderStream } from "~/lib/llm/provider";
import { createThinkFilter } from "~/lib/security/output-filter";
import { retrieveContext } from "~/lib/retrieval";
import type { AskRequest } from "./types";

export interface PipelineResult {
  provider: string;
  stream: ReadableStream<Uint8Array>;
  /** Whether retrieval trimmed the topic body for this turn. */
  retrieved: boolean;
}

// Above this size, send only the passages most relevant to the question instead
// of the whole topic body. Small bodies are cheap enough to pass through whole.
const RETRIEVAL_THRESHOLD = 1500;

/**
 * Orchestrates a single tutor turn: select relevant context (retrieval), pick a
 * provider (with fallback), then pass the token stream through the output filter
 * that removes reasoning blocks. The HTTP handler stays thin — validation and
 * transport live in the route.
 */
export async function runAskPipeline(req: AskRequest): Promise<PipelineResult> {
  let retrieved = false;
  if (req.topicBody && req.topicBody.length > RETRIEVAL_THRESHOLD) {
    const focused = retrieveContext(req.topicBody, req.question, 4);
    if (focused) {
      req = { ...req, topicBody: focused };
      retrieved = true;
    }
  }

  const { provider, stream } = await openProviderStream(req);
  return {
    provider,
    retrieved,
    stream: stream.pipeThrough(thinkFilterTransform()),
  };
}

/** Streaming transform that strips <think>…</think> reasoning across chunks. */
function thinkFilterTransform(): TransformStream<Uint8Array, Uint8Array> {
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  const filter = createThinkFilter();

  return new TransformStream({
    transform(chunk, controller) {
      const text = decoder.decode(chunk, { stream: true });
      const out = filter.process(text);
      if (out) controller.enqueue(encoder.encode(out));
    },
    flush(controller) {
      const out = filter.flush();
      if (out) controller.enqueue(encoder.encode(out));
    },
  });
}
