// Rough token + cost estimation. We don't get exact token counts from the
// streaming providers here, so we approximate from character counts (~4 chars
// per token is a reasonable heuristic for these models). Good enough for trend
// monitoring and budget alerts, not for billing.

const CHARS_PER_TOKEN = 4;

// Approximate USD per 1K tokens by provider (open-source models on Nebius are
// far cheaper than hosted frontier models). Tune as pricing changes.
const COST_PER_1K: Record<string, { input: number; output: number }> = {
  nebius: { input: 0.0002, output: 0.0006 },
  anthropic: { input: 0.003, output: 0.015 },
  openspace: { input: 0, output: 0 },
};

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

export function estimateCostUsd(
  provider: string,
  inputTokens: number,
  outputTokens: number
): number {
  const rate = COST_PER_1K[provider] ?? { input: 0, output: 0 };
  return (inputTokens / 1000) * rate.input + (outputTokens / 1000) * rate.output;
}
