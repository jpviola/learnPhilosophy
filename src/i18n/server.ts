import { DEFAULT_LOCALE, type Locale } from "./locale";
import es, { type Messages } from "./messages/es";
import en from "./messages/en";
import pt from "./messages/pt";
import it from "./messages/it";
import fr from "./messages/fr";

// Solid-free message lookup for server code (API routes) that needs localized
// strings without the reactive i18n context.

const CATALOGS: Record<Locale, Messages> = { es, en, pt, it, fr };

function resolve(catalog: Messages, key: string): string | undefined {
  return key
    .split(".")
    .reduce<unknown>(
      (acc, part) =>
        acc && typeof acc === "object" ? (acc as Record<string, unknown>)[part] : undefined,
      catalog
    ) as string | undefined;
}

export function serverT(
  locale: Locale,
  key: string,
  params?: Record<string, string | number>
): string {
  const value = resolve(CATALOGS[locale] ?? CATALOGS[DEFAULT_LOCALE], key) ?? resolve(CATALOGS.en, key);
  if (typeof value !== "string") return key;
  return params
    ? value.replace(/\{(\w+)\}/g, (_, k) => (k in params ? String(params[k]) : `{${k}}`))
    : value;
}
