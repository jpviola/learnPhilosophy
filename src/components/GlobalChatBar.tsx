import { createSignal, createMemo, Show, onMount } from "solid-js";
import { useNavigate } from "@solidjs/router";
import clsx from "clsx";
import { useI18n } from "~/i18n";
import { useAsk, type AskContext } from "~/lib/useAsk";
import { mode, hydrateLearner } from "~/lib/learner";
import { searchTopics } from "~/lib/topics";
import { TutorControls } from "~/components/TutorControls";

export function GlobalChatBar() {
  const { t, locale } = useI18n();
  const navigate = useNavigate();
  const [open, setOpen] = createSignal(false);

  onMount(hydrateLearner);

  const context = (): AskContext => ({
    topicName: t("chat.generalTopic"),
    topicDescription: t("chat.generalDescription"),
    topicCategory: "Philosophy",
    resourceTitles: [],
  });

  const ask = useAsk({ context, locale, mode });

  // Suggest a concrete topic to open, based on the question just asked.
  const suggestedTopic = createMemo(() => {
    const q = ask.question().trim();
    if (!q) return undefined;
    return searchTopics(q)[0];
  });

  function send() {
    ask.submit(ask.question(), t("ask.errorGeneric"));
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div class="fixed bottom-5 right-5 z-50 print:hidden">
      {/* Collapsed launcher */}
      <Show when={!open()}>
        <button
          type="button"
          onClick={() => setOpen(true)}
          class={clsx(
            "flex items-center gap-2 pl-3.5 pr-4 py-3 rounded-full",
            "bg-brand-primary text-white shadow-card-hover",
            "hover:opacity-95 transition-all duration-fast",
            "focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2"
          )}
        >
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M8 10h8M8 14h5m-9 7 3.5-2.5A2 2 0 0 1 10.7 18H17a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H7a3 3 0 0 0-3 3v14z" />
          </svg>
          <span class="text-sm font-semibold">{t("chat.open")}</span>
        </button>
      </Show>

      {/* Expanded panel */}
      <Show when={open()}>
        <div
          class={clsx(
            "w-[min(92vw,380px)] rounded-2xl overflow-hidden animate-scale-in",
            "bg-brand-surface border border-brand-border shadow-card-hover flex flex-col",
            "max-h-[min(80vh,620px)]"
          )}
          role="dialog"
          aria-label={t("chat.title")}
        >
          {/* Header */}
          <div class="flex items-center justify-between px-4 py-3 border-b border-brand-border bg-brand-chip/40">
            <div class="flex items-center gap-2">
              <span class="text-brand-primary" aria-hidden="true">✦</span>
              <span class="text-sm font-semibold text-brand-text">{t("chat.title")}</span>
            </div>
            <button
              type="button"
              aria-label={t("chat.close")}
              onClick={() => setOpen(false)}
              class="text-brand-muted hover:text-brand-text transition-colors"
            >
              <svg class="w-4 h-4" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                <path d="M4.707 3.293a1 1 0 0 0-1.414 1.414L6.586 8l-3.293 3.293a1 1 0 1 0 1.414 1.414L8 9.414l3.293 3.293a1 1 0 0 0 1.414-1.414L9.414 8l3.293-3.293a1 1 0 0 0-1.414-1.414L8 6.586 4.707 3.293z" />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div class="flex-1 overflow-y-auto px-4 py-4 space-y-3 text-sm">
            <Show
              when={ask.asked()}
              fallback={<p class="text-brand-muted leading-relaxed">{t("chat.intro")}</p>}
            >
              <div class="flex justify-end">
                <div class="max-w-[85%] px-3 py-2 rounded-2xl rounded-tr-sm bg-brand-primary/10 border border-brand-primary/20 text-brand-text">
                  {ask.question()}
                </div>
              </div>

              <div class="rounded-2xl rounded-tl-sm p-3 bg-brand-chip/50 border border-brand-border text-brand-text leading-relaxed">
                <Show when={ask.loading() && !ask.answer()}>
                  <span class="text-xs text-brand-muted">{t("ask.thinking")}</span>
                </Show>
                <Show when={ask.error()}>
                  <p class="text-red-600 text-xs">{ask.error()}</p>
                </Show>
                <Show when={ask.answer()}>
                  <div class="prose-content space-y-2" innerHTML={ask.answerHtml()} />
                </Show>
              </div>

              <Show when={!ask.loading() && suggestedTopic()}>
                {(topic) => (
                  <button
                    type="button"
                    onClick={() => {
                      navigate(`/topic/${topic().slug}`);
                      setOpen(false);
                    }}
                    class="inline-flex items-center gap-1.5 text-xs font-medium text-brand-primary hover:underline"
                  >
                    <span aria-hidden="true">→</span>
                    {t("chat.openTopic", { name: topic().name })}
                  </button>
                )}
              </Show>
            </Show>
          </div>

          {/* Controls + input */}
          <div class="border-t border-brand-border px-4 py-3 space-y-3">
            <TutorControls />
            <div class="relative">
              <textarea
                value={ask.question()}
                onInput={(e) => ask.setQuestion(e.currentTarget.value)}
                onKeyDown={handleKeyDown}
                placeholder={t("chat.placeholder")}
                rows={2}
                class={clsx(
                  "w-full resize-none rounded-xl px-3 py-2 pr-10 text-sm",
                  "bg-brand-bg border border-brand-border text-brand-text placeholder:text-brand-muted",
                  "focus:outline-none focus:ring-2 focus:ring-brand-primary/40 focus:border-brand-primary"
                )}
              />
              <button
                type="button"
                aria-label={t("chat.send")}
                disabled={!ask.question().trim() || ask.loading()}
                onClick={send}
                class={clsx(
                  "absolute bottom-2 right-2 w-7 h-7 rounded-lg flex items-center justify-center transition-all",
                  ask.question().trim() && !ask.loading()
                    ? "bg-brand-primary text-white hover:opacity-90"
                    : "bg-brand-chip text-brand-muted cursor-not-allowed"
                )}
              >
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 10.5 12 3m0 0 7.5 7.5M12 3v18" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </Show>
    </div>
  );
}
