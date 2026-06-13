import {
  LEARNER_LEVELS,
  TUTOR_MODES,
  type AskRequest,
  type ChatMessage,
} from "~/lib/agent/types";

// ── Limits ───────────────────────────────────────────────────
export const LIMITS = {
  question: 2000,
  topicBody: 60000,
  ontologyContext: 20000,
  resourceTitles: 50,
  history: 6,
  learnerContext: 2000,
};

export interface GuardResult {
  ok: boolean;
  status: number;
  error?: string;
}

/** Validates and clamps an incoming request. Mutates nothing; returns a verdict. */
export function guardRequest(body: unknown): GuardResult {
  if (typeof body !== "object" || body === null) {
    return { ok: false, status: 400, error: "Invalid request body" };
  }
  const req = body as Partial<AskRequest>;

  if (typeof req.question !== "string" || !req.question.trim()) {
    return { ok: false, status: 400, error: "question is required" };
  }
  if (req.question.length > LIMITS.question) {
    return {
      ok: false,
      status: 413,
      error: `question too long (max ${LIMITS.question} characters)`,
    };
  }
  if (req.topicBody && req.topicBody.length > LIMITS.topicBody) {
    return { ok: false, status: 413, error: "topicBody too large" };
  }
  if (
    req.history &&
    (!Array.isArray(req.history) || !req.history.every(isValidMessage))
  ) {
    return { ok: false, status: 400, error: "history is malformed" };
  }
  if (req.level && !LEARNER_LEVELS.includes(req.level)) {
    return { ok: false, status: 400, error: "invalid level" };
  }
  if (req.mode && !TUTOR_MODES.includes(req.mode)) {
    return { ok: false, status: 400, error: "invalid mode" };
  }
  if (req.learnerContext && req.learnerContext.length > LIMITS.learnerContext) {
    return { ok: false, status: 413, error: "learnerContext too large" };
  }
  if (req.tools !== undefined && typeof req.tools !== "boolean") {
    return { ok: false, status: 400, error: "tools must be a boolean" };
  }
  return { ok: true, status: 200 };
}

function isValidMessage(m: unknown): m is ChatMessage {
  return (
    typeof m === "object" &&
    m !== null &&
    ((m as ChatMessage).role === "user" ||
      (m as ChatMessage).role === "assistant") &&
    typeof (m as ChatMessage).content === "string"
  );
}

// ── In-memory rate limiting ──────────────────────────────────
// Sliding window per client key. Note: process-local — adequate for a single
// node, but a serverless/multi-instance deployment needs a shared store (KV/Redis).

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 20;
const hits = new Map<string, number[]>();

export function rateLimit(key: string): { ok: boolean; retryAfter?: number } {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);

  if (recent.length >= MAX_REQUESTS) {
    const retryAfter = Math.ceil((WINDOW_MS - (now - recent[0])) / 1000);
    hits.set(key, recent);
    return { ok: false, retryAfter };
  }
  recent.push(now);
  hits.set(key, recent);
  return { ok: true };
}

/** Best-effort client identity from proxy headers, falling back to a constant. */
export function clientKey(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "anonymous";
}
