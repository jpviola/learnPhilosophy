import {
  createSignal,
  createMemo,
  Show,
  For,
  onCleanup,
} from "solid-js";
import clsx from "clsx";
import { marked } from "marked";
import type { Topic } from "~/lib/topics";

// ── Suggested questions per topic ───────────────────────────

const SUGGESTED: Record<string, string[]> = {
  stoicism: [
    "How do Stoics distinguish what is and isn't in our control?",
    "What does Marcus Aurelius mean by 'living according to nature'?",
    "How is Stoic virtue different from modern ideas of success?",
  ],
  epistemology: [
    "What is the difference between knowledge and justified belief?",
    "How did Descartes' skepticism shape modern epistemology?",
    "Can we ever be certain of anything?",
  ],
  ethics: [
    "What distinguishes virtue ethics from deontology?",
    "How does Kant's categorical imperative work in practice?",
    "Is utilitarianism compatible with individual rights?",
  ],
  existentialism: [
    "What does Sartre mean by 'existence precedes essence'?",
    "How does Camus distinguish the absurd from nihilism?",
    "What is 'bad faith' and why does Sartre condemn it?",
  ],
  logic: [
    "What is the difference between validity and soundness?",
    "How does formal logic relate to everyday reasoning?",
    "What are the main logical fallacies to watch out for?",
  ],
  metaphysics: [
    "What is the mind-body problem and why does it matter?",
    "How does Aristotle's concept of substance differ from Plato's forms?",
    "Is causality something real in the world or just a mental habit?",
  ],
  "political-philosophy": [
    "What is the social contract and who originated it?",
    "How does Rawls' veil of ignorance work?",
    "Can there be legitimate authority without consent?",
  ],
  "philosophy-of-mind": [
    "What are qualia and why are they philosophically puzzling?",
    "Does functionalism solve the mind-body problem?",
    "What is Nagel's point about 'what it's like to be a bat'?",
  ],
};

function getSuggested(slug: string): string[] {
  return SUGGESTED[slug] ?? [
    "What are the core ideas of this school of thought?",
    "Who are the most important thinkers in this area?",
    "How does this philosophy apply to everyday life?",
  ];
}

// ── Component ────────────────────────────────────────────────

interface AskPanelProps {
  topic: Topic;
}

export function AskPanel(props: AskPanelProps) {
  const [question, setQuestion] = createSignal("");
  const [answer, setAnswer] = createSignal("");
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const [asked, setAsked] = createSignal(false);

  let abortController: AbortController | null = null;
  let textareaRef: HTMLTextAreaElement | undefined;

  onCleanup(() => abortController?.abort());

  const suggestions = createMemo(() => getSuggested(props.topic.slug));

  const answerHtml = createMemo(() => {
    const raw = answer();
    if (!raw) return "";
    try {
      return marked.parse(raw) as string;
    } catch {
      return raw;
    }
  });

  async function submit(q: string) {
    const trimmed = q.trim();
    if (!trimmed || loading()) return;

    abortController?.abort();
    abortController = new AbortController();

    setQuestion(trimmed);
    setAnswer("");
    setError(null);
    setLoading(true);
    setAsked(true);

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: abortController.signal,
        body: JSON.stringify({
          question: trimmed,
          topicName: props.topic.name,
          topicDescription: props.topic.description,
          topicCategory: props.topic.category,
          resourceTitles: props.topic.resources.map((r) => r.title),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        setAnswer((prev) => prev + decoder.decode(value, { stream: true }));
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setError((err as Error).message ?? "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit(question());
    }
  }

  function reset() {
    abortController?.abort();
    setAnswer("");
    setError(null);
    setAsked(false);
    setQuestion("");
    setTimeout(() => textareaRef?.focus(), 0);
  }

  return (
    <section
      aria-labelledby="ask-heading"
      class="py-section-sm sm:py-section-md border-t border-brand-border"
    >
      <div class="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div class="flex items-start gap-3 mb-6">
          <div
            class="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-base"
            style={{ background: props.topic.color ?? "#2DD4BF", opacity: "0.15" }}
            aria-hidden="true"
          >
            <span style={{ opacity: "1", filter: "none" }}>✦</span>
          </div>
          <div>
            <h2
              id="ask-heading"
              class="text-xl font-bold text-brand-text leading-tight"
            >
              Ask about {props.topic.name}
            </h2>
            <p class="text-sm text-brand-muted mt-0.5">
              AI answers grounded in the topic's concepts and sources
            </p>
          </div>
        </div>

        {/* Input area — hidden once answered */}
        <Show when={!asked()}>
          <div class="space-y-4">
            {/* Suggestions */}
            <div class="flex flex-wrap gap-2">
              <For each={suggestions()}>
                {(s) => (
                  <button
                    type="button"
                    class={clsx(
                      "text-xs px-3 py-1.5 rounded-pill border border-brand-border",
                      "bg-brand-chip text-brand-muted hover:text-brand-text",
                      "hover:border-brand-primary/40 transition-all duration-fast",
                      "text-left leading-snug"
                    )}
                    onClick={() => {
                      setQuestion(s);
                      submit(s);
                    }}
                  >
                    {s}
                  </button>
                )}
              </For>
            </div>

            {/* Textarea + send */}
            <div class="relative">
              <textarea
                ref={textareaRef}
                value={question()}
                onInput={(e) => setQuestion(e.currentTarget.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Ask anything about ${props.topic.name}…`}
                rows={3}
                class={clsx(
                  "w-full resize-none rounded-xl px-4 py-3 pr-12",
                  "bg-brand-surface border border-brand-border",
                  "text-sm text-brand-text placeholder:text-brand-muted",
                  "focus:outline-none focus:ring-2 focus:ring-brand-primary/40 focus:border-brand-primary",
                  "transition-all duration-normal"
                )}
              />
              <button
                type="button"
                disabled={!question().trim()}
                onClick={() => submit(question())}
                aria-label="Send question"
                class={clsx(
                  "absolute bottom-3 right-3 w-7 h-7 rounded-lg flex items-center justify-center",
                  "transition-all duration-fast",
                  question().trim()
                    ? "bg-brand-primary text-white hover:opacity-90"
                    : "bg-brand-chip text-brand-muted cursor-not-allowed"
                )}
              >
                <svg
                  class="w-3.5 h-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  stroke-width="2.5"
                  aria-hidden="true"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M4.5 10.5 12 3m0 0 7.5 7.5M12 3v18"
                  />
                </svg>
              </button>
            </div>
            <p class="text-xs text-brand-muted">
              Press Enter to send · Shift+Enter for new line
            </p>
          </div>
        </Show>

        {/* Answer area */}
        <Show when={asked()}>
          <div class="space-y-4">
            {/* Question bubble */}
            <div class="flex justify-end">
              <div
                class={clsx(
                  "max-w-sm px-4 py-2.5 rounded-2xl rounded-tr-sm",
                  "bg-brand-primary/10 border border-brand-primary/20",
                  "text-sm text-brand-text"
                )}
              >
                {question()}
              </div>
            </div>

            {/* Answer bubble */}
            <div
              class={clsx(
                "rounded-2xl rounded-tl-sm p-5",
                "bg-brand-surface border border-brand-border",
                "text-sm text-brand-text leading-relaxed"
              )}
            >
              <Show when={loading() && !answer()}>
                <div class="flex items-center gap-2 text-brand-muted">
                  <div class="flex gap-1">
                    <span class="w-1.5 h-1.5 rounded-full bg-brand-primary animate-bounce [animation-delay:0ms]" />
                    <span class="w-1.5 h-1.5 rounded-full bg-brand-primary animate-bounce [animation-delay:150ms]" />
                    <span class="w-1.5 h-1.5 rounded-full bg-brand-primary animate-bounce [animation-delay:300ms]" />
                  </div>
                  <span class="text-xs">Thinking…</span>
                </div>
              </Show>

              <Show when={error()}>
                <p class="text-red-600 text-sm">{error()}</p>
              </Show>

              <Show when={answer()}>
                <div
                  class="prose-content space-y-3"
                  innerHTML={answerHtml()}
                />
                <Show when={loading()}>
                  <span
                    class="inline-block w-0.5 h-4 bg-brand-primary animate-pulse ml-0.5 align-middle"
                    aria-hidden="true"
                  />
                </Show>
              </Show>
            </div>

            {/* Actions */}
            <Show when={!loading()}>
              <div class="flex items-center justify-between">
                <button
                  type="button"
                  onClick={reset}
                  class={clsx(
                    "text-xs text-brand-muted hover:text-brand-text",
                    "flex items-center gap-1.5 transition-colors duration-fast"
                  )}
                >
                  <svg
                    class="w-3.5 h-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    stroke-width="2"
                    aria-hidden="true"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3"
                    />
                  </svg>
                  Ask another question
                </button>
                <span class="text-xs text-brand-muted opacity-60">
                  Powered by Claude
                </span>
              </div>
            </Show>
          </div>
        </Show>
      </div>
    </section>
  );
}
