import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { LOCALE_ENDONYM_FOR_PROMPT, type Locale } from "~/i18n/locale";

// On-demand translation of topic markdown into the learner's locale (hybrid i18n:
// source content stays in its original language). Results are cached in process
// memory keyed by content hash, so each (topic, locale) is translated once.
// Concurrent requests for the same key share one in-flight promise.

const cache = new Map<string, string>();
const inflight = new Map<string, Promise<string>>();
const MAX_ENTRIES = 500;

function hash(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

function cacheKey(locale: Locale, body: string): string {
  return `${locale}:${hash(body)}`;
}

function rememberTranslation(key: string, value: string) {
  if (cache.size >= MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
  cache.set(key, value);
}

function buildPrompt(locale: Locale): string {
  const language = LOCALE_ENDONYM_FOR_PROMPT[locale];
  return `You are a professional translator. Translate the user's Markdown into ${language}. Preserve all Markdown formatting (headings, lists, tables, links, emphasis) exactly. Keep proper nouns — names of philosophers and works — accurate. Output ONLY the translated Markdown, with no preamble, notes, or code fences.`;
}

async function callLLM(body: string, locale: Locale): Promise<string> {
  const system = buildPrompt(locale);

  const nebiusKey = process.env.NEBIUS_API_KEY;
  if (nebiusKey) {
    const client = new OpenAI({
      baseURL: "https://api.tokenfactory.nebius.com/v1/",
      apiKey: nebiusKey,
    });
    const model = process.env.NEBIUS_MODEL ?? "MiniMaxAI/MiniMax-M2.5-fast";
    const res = await client.chat.completions.create({
      model,
      max_tokens: 8192,
      messages: [
        { role: "system", content: system },
        { role: "user", content: body },
      ],
    });
    return res.choices[0]?.message?.content?.trim() || body;
  }

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (anthropicKey) {
    const client = new Anthropic({ apiKey: anthropicKey });
    const res = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 8192,
      system,
      messages: [{ role: "user", content: body }],
    });
    const block = res.content.find((b) => b.type === "text");
    return block && block.type === "text" ? block.text.trim() : body;
  }

  throw new Error("No translation provider configured");
}

export interface TranslationResult {
  body: string;
  translated: boolean;
}

/**
 * Returns the body translated into `locale`, cached. On any failure (no provider,
 * upstream error) it gracefully returns the original body with translated:false.
 */
export async function translateBody(
  locale: Locale,
  body: string
): Promise<TranslationResult> {
  const key = cacheKey(locale, body);

  const cached = cache.get(key);
  if (cached) return { body: cached, translated: true };

  const existing = inflight.get(key);
  if (existing) return { body: await existing, translated: true };

  const promise = callLLM(body, locale);
  inflight.set(key, promise);
  try {
    const result = await promise;
    rememberTranslation(key, result);
    return { body: result, translated: true };
  } catch {
    return { body, translated: false };
  } finally {
    inflight.delete(key);
  }
}
