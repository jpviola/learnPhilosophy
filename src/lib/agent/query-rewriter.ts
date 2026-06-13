import type { ChatMessage } from "./types";

// Lightweight query rewriting for retrieval only (never shown to the user, never
// replaces the question sent to the model). On short follow-up questions that lean
// on anaphora ("¿y él?", "tell me more"), it appends the most recent substantive
// user turn so retrieval still finds the right passages. Deterministic and
// conservative — when in doubt it returns the question unchanged.

const FOLLOWUP_RE =
  /^(y |e |and |et |¿y\b|y qué|qué más|que mas|más|mas|more|tell me more|continúa|continua|continue|sigue|et alors|e poi|dimmi di più|conte mais)/i;

const ANAPHORA_RE =
  /\b(él|ella|eso|esto|esa|ese|esos|esas|it|that|this|they|them|lui|elle|ça|cela|il|ele|ela|isso|esse|essa)\b/i;

export function rewriteForRetrieval(
  question: string,
  history: ChatMessage[] | undefined
): string {
  const q = question.trim();
  const looksLikeFollowUp =
    (q.length < 48 && FOLLOWUP_RE.test(q)) || (q.length < 60 && ANAPHORA_RE.test(q));
  if (!looksLikeFollowUp || !history?.length) return question;

  // The most recent user message longer than this one is the likely subject.
  const subject = [...history]
    .reverse()
    .find((m) => m.role === "user" && m.content.trim().length > q.length);
  if (!subject) return question;

  return `${q} (context: ${subject.content.trim().slice(0, 140)})`;
}
