import { createMemo, createSignal, For, Show, onMount } from "solid-js";
import { A } from "@solidjs/router";
import clsx from "clsx";
import { useI18n } from "~/i18n";
import { buildLearningPath, type PathStep } from "~/lib/agent/tools/topic-tools";
import { getViewedTopics } from "~/lib/learner";

const ROLE_STYLE: Record<PathStep["role"], string> = {
  foundation: "bg-brand-chip text-brand-muted border-brand-border",
  focus: "bg-brand-primary/15 text-brand-primary border-brand-primary/30",
  next: "bg-brand-chip text-brand-muted border-brand-border",
};

export function LearningPath(props: { slug: string }) {
  const { t } = useI18n();
  const steps = createMemo(() => buildLearningPath(props.slug));

  // "Visited" marks are client-only to avoid SSR/hydration divergence.
  const [visited, setVisited] = createSignal<Set<string>>(new Set());
  onMount(() => setVisited(new Set(getViewedTopics().map((v) => v.slug))));

  return (
    <Show when={steps().length > 1}>
      <div>
        <h2 class="text-lg font-semibold text-brand-text mb-1">{t("path.title")}</h2>
        <p class="text-sm text-brand-muted mb-4">{t("path.intro")}</p>

        <ol class="relative border-l border-brand-border ml-2 space-y-3">
          <For each={steps()}>
            {(step) => {
              const isFocus = step.role === "focus";
              const done = () => visited().has(step.topic.slug) && !isFocus;
              return (
                <li class="ml-4">
                  <span
                    class={clsx(
                      "absolute -left-[7px] w-3 h-3 rounded-full border-2 border-brand-bg",
                      isFocus ? "bg-brand-primary" : done() ? "bg-brand-secondary" : "bg-brand-border"
                    )}
                    aria-hidden="true"
                  />
                  <A
                    href={`/topic/${step.topic.slug}`}
                    class={clsx(
                      "group flex items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5",
                      "transition-all duration-fast hover:border-brand-primary/40",
                      isFocus ? "bg-brand-primary/5 border-brand-primary/30" : "bg-brand-surface border-brand-border"
                    )}
                    aria-current={isFocus ? "step" : undefined}
                  >
                    <span class="min-w-0">
                      <span class="block text-sm font-medium text-brand-text truncate">
                        {step.topic.name}
                      </span>
                      <span class="block text-xs text-brand-muted truncate">
                        {step.topic.tagline}
                      </span>
                    </span>
                    <span class="flex items-center gap-2 flex-shrink-0">
                      <Show when={done()}>
                        <span class="text-brand-secondary text-sm" aria-hidden="true">✓</span>
                      </Show>
                      <span
                        class={clsx(
                          "text-[10px] font-medium uppercase tracking-wide px-2 py-0.5 rounded-pill border",
                          ROLE_STYLE[step.role]
                        )}
                      >
                        {t(`path.${step.role}`)}
                      </span>
                    </span>
                  </A>
                </li>
              );
            }}
          </For>
        </ol>
      </div>
    </Show>
  );
}
