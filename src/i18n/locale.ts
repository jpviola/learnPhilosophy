// Supported UI + tutor languages. The full i18n message catalogs land in Phase 1;
// this module exists now so the agent pipeline can be locale-aware from the start.

export const SUPPORTED_LOCALES = ["es", "en", "pt", "it", "fr"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "es";

export const LOCALE_NAMES: Record<Locale, string> = {
  es: "Español",
  en: "English",
  pt: "Português",
  it: "Italiano",
  fr: "Français",
};

// Used in prompts to instruct the model which language to answer in.
export const LOCALE_ENDONYM_FOR_PROMPT: Record<Locale, string> = {
  es: "Spanish (español)",
  en: "English",
  pt: "Portuguese (português)",
  it: "Italian (italiano)",
  fr: "French (français)",
};

/** Normalizes any value (e.g. navigator.language "pt-BR") to a supported locale. */
export function resolveLocale(input: string | null | undefined): Locale {
  if (!input) return DEFAULT_LOCALE;
  const base = input.toLowerCase().split("-")[0];
  return (SUPPORTED_LOCALES as readonly string[]).includes(base)
    ? (base as Locale)
    : DEFAULT_LOCALE;
}
