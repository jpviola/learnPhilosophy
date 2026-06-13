// Structured, one-line-per-request logging for the chat endpoint. Emits JSON to
// stdout so it can be shipped to any log aggregator later without code changes.
// This is the seam where real tracing/metrics (OpenTelemetry, etc.) would plug in.

import { estimateTokens, estimateCostUsd } from "./cost";

export interface TraceFields {
  provider?: string;
  locale?: string;
  level?: string;
  mode?: string;
  retrieved?: boolean;
  inputChars?: number;
  outputChars?: number;
  status: "ok" | "error";
  error?: string;
}

export interface Trace {
  end: (fields: TraceFields) => void;
}

/** Starts a trace; call `end` once the response is fully streamed or has failed. */
export function startTrace(event: string): Trace {
  const startedAt = Date.now();
  return {
    end(fields: TraceFields) {
      const inputTokens = estimateTokens(" ".repeat(fields.inputChars ?? 0));
      const outputTokens = estimateTokens(" ".repeat(fields.outputChars ?? 0));
      const record = {
        event,
        ts: new Date().toISOString(),
        durationMs: Date.now() - startedAt,
        ...fields,
        estTokens: { input: inputTokens, output: outputTokens },
        estCostUsd: fields.provider
          ? Number(
              estimateCostUsd(fields.provider, inputTokens, outputTokens).toFixed(6)
            )
          : 0,
      };
      const line = JSON.stringify(record);
      if (fields.status === "error") console.error(line);
      else console.log(line);
    },
  };
}
