import { createMemo, createSignal, For, Show } from "solid-js";
import clsx from "clsx";
import { useI18n } from "~/i18n";
import type { Topic } from "~/lib/topics";
import { buildQuiz, type QuizQuestion } from "~/lib/agent/quiz";

const PROMPT_KEY: Record<QuizQuestion["type"], string> = {
  category: "quiz.categoryPrompt",
  author: "quiz.authorPrompt",
  related: "quiz.relatedPrompt",
};

export function Quiz(props: { topic: Topic }) {
  const { t } = useI18n();
  const questions = createMemo(() => buildQuiz(props.topic));

  // questionId → selected option index
  const [answers, setAnswers] = createSignal<Record<string, number>>({});

  function choose(q: QuizQuestion, idx: number) {
    if (q.id in answers()) return; // lock after first answer
    setAnswers((prev) => ({ ...prev, [q.id]: idx }));
  }

  function restart() {
    setAnswers({});
  }

  const answeredCount = () => Object.keys(answers()).length;
  const correctCount = () =>
    questions().filter((q) => answers()[q.id] === q.answerIndex).length;
  const allAnswered = () => answeredCount() === questions().length;

  return (
    <Show when={questions().length > 0}>
      <div>
        <h2 class="text-lg font-semibold text-brand-text mb-1">{t("quiz.title")}</h2>
        <p class="text-sm text-brand-muted mb-4">{t("quiz.intro")}</p>

        <div class="space-y-5">
          <For each={questions()}>
            {(q) => {
              const selected = () => answers()[q.id];
              const answered = () => q.id in answers();
              return (
                <div class="rounded-xl border border-brand-border bg-brand-surface p-4">
                  <p class="text-sm font-medium text-brand-text mb-3">
                    {t(PROMPT_KEY[q.type], { subject: q.subject })}
                  </p>
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <For each={q.options}>
                      {(opt, i) => {
                        const isAnswer = () => i() === q.answerIndex;
                        const isPicked = () => selected() === i();
                        return (
                          <button
                            type="button"
                            disabled={answered()}
                            onClick={() => choose(q, i())}
                            class={clsx(
                              "text-left text-sm px-3 py-2 rounded-lg border transition-all duration-fast",
                              !answered() &&
                                "border-brand-border bg-brand-chip/40 hover:border-brand-primary/40 text-brand-text",
                              answered() && isAnswer() &&
                                "border-brand-secondary/50 bg-brand-secondary/10 text-brand-text",
                              answered() && isPicked() && !isAnswer() &&
                                "border-red-300 bg-red-50 text-red-700",
                              answered() && !isPicked() && !isAnswer() &&
                                "border-brand-border bg-brand-surface text-brand-muted"
                            )}
                          >
                            <span class="inline-flex items-center gap-2">
                              <Show when={answered() && isAnswer()}>
                                <span aria-hidden="true">✓</span>
                              </Show>
                              <Show when={answered() && isPicked() && !isAnswer()}>
                                <span aria-hidden="true">✗</span>
                              </Show>
                              {opt}
                            </span>
                          </button>
                        );
                      }}
                    </For>
                  </div>

                  <Show when={answered()}>
                    <p
                      class={clsx(
                        "text-xs mt-2.5",
                        selected() === q.answerIndex ? "text-brand-secondary" : "text-brand-muted"
                      )}
                    >
                      {selected() === q.answerIndex
                        ? t("quiz.correct")
                        : `${t("quiz.incorrect")} ${t("quiz.answerIs", {
                            answer: q.options[q.answerIndex],
                          })}`}
                    </p>
                  </Show>
                </div>
              );
            }}
          </For>
        </div>

        <Show when={allAnswered()}>
          <div class="mt-4 flex items-center justify-between">
            <span class="text-sm font-medium text-brand-text">
              {t("quiz.score", { correct: correctCount(), total: questions().length })}
            </span>
            <button
              type="button"
              onClick={restart}
              class="text-xs text-brand-primary hover:underline"
            >
              {t("quiz.restart")}
            </button>
          </div>
        </Show>
      </div>
    </Show>
  );
}
