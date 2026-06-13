import type { ChatMessage } from "./types";

/** How many prior turns of context we keep. Bounds tokens and limits instruction drift. */
export const MAX_HISTORY = 6;

/** Keeps only the most recent MAX_HISTORY messages, dropping anything malformed. */
export function trimHistory(history: ChatMessage[] | undefined): ChatMessage[] {
  if (!Array.isArray(history)) return [];
  return history
    .filter(
      (m) =>
        m &&
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string" &&
        m.content.trim().length > 0
    )
    .slice(-MAX_HISTORY);
}
