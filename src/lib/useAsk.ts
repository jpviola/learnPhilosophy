import { createSignal, createMemo, onCleanup } from "solid-js";
import { marked } from "marked";
import { level, buildLearnerContext, recordQuestion } from "~/lib/learner";
import type { Locale } from "~/i18n/locale";
import type { ChatMessage, TutorMode } from "~/lib/agent/types";

export interface AskContext {
  topicName: string;
  topicDescription: string;
  topicCategory: string;
  topicBody?: string;
  ontologyContext?: string;
  resourceTitles: string[];
}

/**
 * Shared chat logic for the topic panel and the global chat bar: streams an
 * answer from /api/ask, tracks history, and personalizes the request with the
 * learner's level and memory. Presentation stays in the components.
 */
export function useAsk(opts: {
  context: () => AskContext;
  locale: () => Locale;
  mode: () => TutorMode;
}) {
  const [question, setQuestion] = createSignal("");
  const [answer, setAnswer] = createSignal("");
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const [asked, setAsked] = createSignal(false);
  const [history, setHistory] = createSignal<ChatMessage[]>([]);

  let abortController: AbortController | null = null;
  onCleanup(() => abortController?.abort());

  const answerHtml = createMemo(() => {
    const raw = answer();
    if (!raw) return "";
    try {
      return marked.parse(raw) as string;
    } catch {
      return raw;
    }
  });

  async function submit(q: string, errorFallback: string) {
    const trimmed = q.trim();
    if (!trimmed || loading()) return;

    abortController?.abort();
    abortController = new AbortController();

    setQuestion(trimmed);
    setAnswer("");
    setError(null);
    setLoading(true);
    setAsked(true);
    recordQuestion(trimmed);

    try {
      const ctx = opts.context();
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: abortController.signal,
        body: JSON.stringify({
          question: trimmed,
          ...ctx,
          history: history(),
          locale: opts.locale(),
          level: level(),
          mode: opts.mode(),
          learnerContext: buildLearnerContext(),
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

      setHistory((prev) => [
        ...prev,
        { role: "user", content: trimmed },
        { role: "assistant", content: answer() },
      ]);
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setError((err as Error).message ?? errorFallback);
    } finally {
      setLoading(false);
    }
  }

  /** Clears the current answer but keeps the conversation history. */
  function reset() {
    abortController?.abort();
    setAnswer("");
    setError(null);
    setAsked(false);
    setQuestion("");
  }

  /** Resets everything, including history (e.g. when the topic changes). */
  function resetConversation() {
    reset();
    setHistory([]);
  }

  return {
    question,
    setQuestion,
    answer,
    answerHtml,
    loading,
    error,
    asked,
    history,
    submit,
    reset,
    resetConversation,
  };
}
