import { searchTopics } from "~/lib/topics";

// Deterministic query understanding. Classifies an incoming message so the route
// can short-circuit greetings (no LLM call) and surface a navigation target when
// the user clearly asks to open a topic. Everything else is a normal question.

export type Intent = "greeting" | "navigate" | "question";

export interface RouteResult {
  intent: Intent;
  topicSlug?: string;
  topicName?: string;
}

const GREETINGS = new Set(
  (
    "hi hello hey yo thanks thank you " +
    "hola buenas buenos hey gracias chau " +
    "ola oi olá obrigado obrigada " +
    "ciao salve grazie buongiorno " +
    "salut bonjour merci coucou"
  )
    .toLowerCase()
    .split(/\s+/)
);

const NAV_RE =
  /\b(ll[eé]vame|llev[aá]me|ir a|abr[ií]r?|mu[eé]strame|mostrame|ver el tema|open|show me|go to|take me to|navigate to|ouvrir|aller [aà]|montre|apri|aprire|mostra|abrir?|abre)\b/i;

function normalizeWord(w: string): string {
  return w.toLowerCase().replace(/[^\p{L}]/gu, "");
}

/** Strips a leading navigation phrase so the remainder can be matched to a topic. */
function navTarget(question: string): string {
  return question.replace(NAV_RE, " ").replace(/\b(el|la|los|las|the|le|il)\b/gi, " ").trim();
}

export function classifyIntent(question: string): RouteResult {
  const q = question.trim();
  const words = q.split(/\s+/);

  // Greeting: a short message that is mostly a greeting word.
  if (words.length <= 3 && words.some((w) => GREETINGS.has(normalizeWord(w)))) {
    return { intent: "greeting" };
  }

  // Navigation: an explicit "open/take me to X" that resolves to a topic.
  if (NAV_RE.test(q)) {
    const target = navTarget(q);
    const match = target ? searchTopics(target)[0] : undefined;
    if (match) {
      return { intent: "navigate", topicSlug: match.slug, topicName: match.name };
    }
  }

  return { intent: "question" };
}
