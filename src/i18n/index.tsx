import {
  createContext,
  createSignal,
  createEffect,
  useContext,
  onMount,
  type Accessor,
  type JSX,
} from "solid-js";
import { isServer, getRequestEvent } from "solid-js/web";
import { DEFAULT_LOCALE, resolveLocale, type Locale } from "./locale";
import es, { type Messages } from "./messages/es";
import en from "./messages/en";
import pt from "./messages/pt";
import it from "./messages/it";
import fr from "./messages/fr";

const CATALOGS: Record<Locale, Messages> = { es, en, pt, it, fr };
const COOKIE = "lp_locale";
const ONE_YEAR = 60 * 60 * 24 * 365;

type Params = Record<string, string | number>;

export interface I18nValue {
  locale: Accessor<Locale>;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: Params) => string;
}

const I18nContext = createContext<I18nValue>();

function readCookie(): string | undefined {
  const raw = isServer
    ? getRequestEvent()?.request.headers.get("cookie") ?? ""
    : typeof document !== "undefined"
      ? document.cookie
      : "";
  const match = raw.match(new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

// The first render (SSR and hydration) only reads the cookie, so both sides agree.
// Browser-language detection is deferred to onMount to avoid hydration mismatches.
function initialLocale(): Locale {
  const cookie = readCookie();
  return cookie ? resolveLocale(cookie) : DEFAULT_LOCALE;
}

function resolveMessage(catalog: Messages, key: string): string | undefined {
  return key
    .split(".")
    .reduce<unknown>(
      (acc, part) =>
        acc && typeof acc === "object"
          ? (acc as Record<string, unknown>)[part]
          : undefined,
      catalog
    ) as string | undefined;
}

function interpolate(template: string, params?: Params): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, k) =>
    k in params ? String(params[k]) : `{${k}}`
  );
}

export function I18nProvider(props: { children: JSX.Element }) {
  const [locale, setLocaleSignal] = createSignal<Locale>(initialLocale());

  function setLocale(next: Locale) {
    setLocaleSignal(next);
    if (!isServer) {
      document.cookie = `${COOKIE}=${next}; path=/; max-age=${ONE_YEAR}; samesite=lax`;
    }
  }

  onMount(() => {
    // First visit with no cookie: adopt the browser language, then remember it.
    if (!readCookie()) setLocale(resolveLocale(navigator.language));
  });

  createEffect(() => {
    if (!isServer) document.documentElement.lang = locale();
  });

  const t = (key: string, params?: Params): string => {
    const current = resolveMessage(CATALOGS[locale()], key);
    if (typeof current === "string") return interpolate(current, params);
    const fallback = resolveMessage(CATALOGS.en, key);
    return typeof fallback === "string" ? interpolate(fallback, params) : key;
  };

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {props.children}
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within <I18nProvider>");
  return ctx;
}
