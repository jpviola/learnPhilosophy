import { openProviderStream } from "~/lib/llm/provider";
import { createThinkFilter } from "~/lib/security/output-filter";
import { retrieveContextAsync } from "~/lib/retrieval";
import { rewriteForRetrieval } from "./query-rewriter";
import { runAgenticTurn } from "./agentic";
import type { TutorAction } from "./tools/registry";
import type { AskRequest } from "./types";

export interface PipelineResult {
  provider: string;
  stream: ReadableStream<Uint8Array>;
  /** Whether retrieval trimmed the topic body for this turn. */
  retrieved: boolean;
  /** Topics / learning path the tutor surfaced via tools (for the UI). */
  actions: TutorAction[];
}

function toolCapableProviderAvailable(): boolean {
  return Boolean(process.env.NEBIUS_API_KEY || process.env.ANTHROPIC_API_KEY);
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
    // Rewrite the query (anaphora) for retrieval recall, then select passages
    // (semantic if embeddings are configured, lexical otherwise).
    const retrievalQuery = rewriteForRetrieval(req.question, req.history);
    const focused = await retrieveContextAsync(req.topicBody, retrievalQuery, 4);
    if (focused) {
      req = { ...req, topicBody: focused };
      retrieved = true;
    }
  }

  // Tool-using turn: the tutor may navigate the topic graph and build a path.
  // Falls back to a plain answer if the agentic loop fails.
  if (req.tools && toolCapableProviderAvailable()) {
    try {
      const { provider, stream, actions } = await runAgenticTurn(req);
      return { provider, retrieved, actions, stream: stream.pipeThrough(thinkFilterTransform()) };
    } catch (err) {
      console.warn("[pipeline] agentic turn failed, falling back to plain answer:", err);
    }
  }

  const { provider, stream } = await openProviderStream(req);
  return {
    provider,
    retrieved,
    actions: [],
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
