import type { APIEvent } from "@solidjs/start/server";
import { getContentBySlug } from "~/lib/content";
import { translateBody } from "~/lib/translate";
import { rateLimit, clientKey } from "~/lib/security/input-guard";
import { resolveLocale, SUPPORTED_LOCALES } from "~/i18n/locale";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function POST(event: APIEvent) {
  const limit = rateLimit(clientKey(event.request));
  if (!limit.ok) return json({ error: "Too many requests" }, 429);

  let payload: { slug?: string; locale?: string };
  try {
    payload = await event.request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const content = payload.slug ? getContentBySlug(payload.slug) : undefined;
  if (!content) return json({ error: "Unknown topic" }, 404);

  const locale = resolveLocale(payload.locale);
  if (!(SUPPORTED_LOCALES as readonly string[]).includes(locale)) {
    return json({ error: "Unsupported locale" }, 400);
  }

  // Already in the requested language — nothing to translate.
  if (content.meta.lang === locale) {
    return json({ body: content.body, translated: false, sameLanguage: true });
  }

  const result = await translateBody(locale, content.body);
  return json(result);
}
