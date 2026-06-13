import { createSignal, For, Show, onMount, onCleanup } from "solid-js";
import clsx from "clsx";
import { useI18n } from "~/i18n";
import { SUPPORTED_LOCALES, LOCALE_NAMES, type Locale } from "~/i18n/locale";

const FLAGS: Record<Locale, string> = {
  es: "🇪🇸",
  en: "🇬🇧",
  pt: "🇧🇷",
  it: "🇮🇹",
  fr: "🇫🇷",
};

export function LanguageSwitcher(props: { dark?: boolean }) {
  const { locale, setLocale, t } = useI18n();
  const [open, setOpen] = createSignal(false);
  let containerRef: HTMLDivElement | undefined;

  onMount(() => {
    const close = (e: MouseEvent) => {
      if (!containerRef?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    onCleanup(() => document.removeEventListener("mousedown", close));
  });

  return (
    <div ref={containerRef} class="relative">
      <button
        type="button"
        aria-label={t("header.languageAria")}
        aria-haspopup="listbox"
        aria-expanded={open()}
        onClick={() => setOpen((o) => !o)}
        class={clsx(
          "flex items-center gap-1.5 px-2.5 py-1.5 rounded-pill text-sm",
          "transition-colors duration-fast focus-visible:ring-2 focus-visible:ring-emerald-500",
          props.dark
            ? "text-white/60 hover:text-white hover:bg-white/10"
            : "text-brand-muted hover:text-brand-text hover:bg-brand-chip"
        )}
      >
        <span aria-hidden="true">{FLAGS[locale()]}</span>
        <span class="uppercase text-xs font-semibold tracking-wide">{locale()}</span>
      </button>

      <Show when={open()}>
        <ul
          role="listbox"
          class={clsx(
            "absolute right-0 mt-2 z-50 min-w-[9rem] py-1 rounded-xl overflow-hidden",
            "animate-scale-in shadow-[0_12px_40px_rgba(0,0,0,0.5)]",
            props.dark
              ? "bg-[#111] border border-white/10"
              : "bg-brand-surface border border-brand-border"
          )}
        >
          <For each={SUPPORTED_LOCALES}>
            {(loc) => (
              <li role="option" aria-selected={locale() === loc}>
                <button
                  type="button"
                  onClick={() => {
                    setLocale(loc);
                    setOpen(false);
                  }}
                  class={clsx(
                    "w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm",
                    "transition-colors duration-fast",
                    locale() === loc
                      ? props.dark
                        ? "bg-white/10 text-white"
                        : "bg-brand-chip text-brand-text"
                      : props.dark
                        ? "text-white/60 hover:bg-white/[0.06]"
                        : "text-brand-muted hover:bg-brand-chip/60"
                  )}
                >
                  <span aria-hidden="true">{FLAGS[loc]}</span>
                  <span>{LOCALE_NAMES[loc]}</span>
                </button>
              </li>
            )}
          </For>
        </ul>
      </Show>
    </div>
  );
}
