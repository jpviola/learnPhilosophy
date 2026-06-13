import { callNebius } from "./nebius";
import { callAnthropic } from "./anthropic";
import { callOpenSpace } from "./openspace";
import type { AskRequest } from "~/lib/agent/types";

type ProviderFn = (req: AskRequest) => Promise<ReadableStream<Uint8Array>>;

interface Provider {
  name: string;
  call: ProviderFn;
}

/** Providers available given the current environment, in priority order. */
export function availableProviders(): Provider[] {
  const list: Provider[] = [];
  const nebius = process.env.NEBIUS_API_KEY;
  const anthropic = process.env.ANTHROPIC_API_KEY;
  const openspace = process.env.OPENSPACE_URL;

  if (nebius) list.push({ name: "nebius", call: (r) => callNebius(nebius, r) });
  if (anthropic)
    list.push({ name: "anthropic", call: (r) => callAnthropic(anthropic, r) });
  if (openspace)
    list.push({ name: "openspace", call: (r) => callOpenSpace(openspace, r) });

  return list;
}

export interface ProviderStream {
  provider: string;
  stream: ReadableStream<Uint8Array>;
}

/**
 * Tries each available provider in order until one successfully opens a stream.
 * This is a runtime fallback: if the primary fails *before* streaming begins
 * (auth, network, rate limit), the next provider is attempted. Errors that occur
 * mid-stream are not recovered — the stream is already committed to the client.
 */
export async function openProviderStream(req: AskRequest): Promise<ProviderStream> {
  const providers = availableProviders();
  if (providers.length === 0) {
    throw new Error(
      "No LLM provider configured. Set NEBIUS_API_KEY, ANTHROPIC_API_KEY, or OPENSPACE_URL."
    );
  }

  let lastError: unknown;
  for (const provider of providers) {
    try {
      const stream = await provider.call(req);
      return { provider: provider.name, stream };
    } catch (err) {
      lastError = err;
      console.warn(`[llm] provider "${provider.name}" failed, trying next:`, err);
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error("All LLM providers failed");
}
