import {
  createMemo,
  Show,
  For,
  Suspense,
  createSignal,
  createEffect,
  createResource,
} from "solid-js";
import { isServer } from "solid-js/web";
import { useParams, A } from "@solidjs/router";
import { clientOnly } from "@solidjs/start";
import clsx from "clsx";
import { Container } from "~/components/Container";
import { SearchBar } from "~/components/SearchBar";
import { TopicChip, ChipRow } from "~/components/TopicChip";
import { TopicCard } from "~/components/TopicCard";
import { Button } from "~/components/Button";
import { getTopicBySlug, ALL_TOPICS, type Resource } from "~/lib/topics";
import { getContentBySlug } from "~/lib/content";
import { AskPanel } from "~/components/AskPanel";
import { LearningPath } from "~/components/LearningPath";
import { Quiz } from "~/components/Quiz";
import { renderMarkdown } from "~/lib/markdown";
import { useI18n } from "~/i18n";

// Client-only: canvas doesn't render on the server to avoid hydration issues
const GraphPanel = clientOnly(() =>
  import("~/components/GraphPanel").then((m) => ({ default: m.GraphPanel }))
);

// ── Resource type helpers ────────────────────────────────

const TYPE_LABELS: Record<Resource["type"], string> = {
  book: "Book",
  article: "Article",
  video: "Video",
  course: "Course",
  paper: "Paper",
};

const TYPE_ICONS: Record<Resource["type"], string> = {
  book: "📖",
  article: "📄",
  video: "▶",
  course: "🎓",
  paper: "📑",
};

const DIFFICULTY_COLORS: Record<Resource["difficulty"], string> = {
  beginner: "text-teal-700 bg-teal-50 border-teal-200",
  intermediate: "text-amber-700 bg-amber-50 border-amber-200",
  advanced: "text-purple-700 bg-purple-50 border-purple-200",
};

// ── Sub-components ───────────────────────────────────────

function ResourceCard(props: { resource: Resource; index: number }) {
  const { resource: r } = props;
  const { t } = useI18n();
  return (
    <div
      class={clsx(
        "flex gap-4 p-4 rounded-xl bg-brand-surface border border-brand-border",
        "hover:border-brand-primary/30 hover:shadow-card transition-all duration-normal",
        "opacity-0 animate-fade-up"
      )}
      style={{
        "animation-delay": `${props.index * 50}ms`,
        "animation-fill-mode": "forwards",
      }}
    >
      {/* Icon */}
      <div
        class="w-10 h-10 rounded-lg bg-brand-chip border border-brand-border flex items-center justify-center flex-shrink-0 text-lg"
        aria-hidden="true"
      >
        {TYPE_ICONS[r.type]}
      </div>

      {/* Content */}
      <div class="flex-1 min-w-0">
        <div class="flex items-start justify-between gap-2 flex-wrap">
          <div>
            <p class="text-sm font-semibold text-brand-text leading-tight">
              {r.title}
            </p>
            <Show when={r.author}>
              <p class="text-xs text-brand-muted mt-0.5">by {r.author}</p>
            </Show>
          </div>
          <div class="flex items-center gap-1.5 flex-shrink-0">
            <span
              class={clsx(
                "text-xs font-medium px-2 py-0.5 rounded-pill border",
                DIFFICULTY_COLORS[r.difficulty]
              )}
            >
              {t(`common.${r.difficulty}`)}
            </span>
            <span class="text-xs text-brand-muted border border-brand-border px-2 py-0.5 rounded-pill bg-brand-chip">
              {TYPE_LABELS[r.type]}
            </span>
          </div>
        </div>
        <p class="text-sm text-brand-muted mt-2 leading-relaxed">
          {r.description}
        </p>
      </div>
    </div>
  );
}

function NotFound(props: { slug: string }) {
  const { t } = useI18n();
  return (
    <main class="min-h-screen flex items-center justify-center">
      <Container width="narrow" class="text-center py-24">
        <div class="text-5xl mb-6" aria-hidden="true">🔍</div>
        <h1 class="text-2xl font-bold text-brand-text mb-3">
          {t("topic.notFoundTitle")}
        </h1>
        <p class="text-brand-muted mb-8">
          {t("topic.notFoundBody", { slug: props.slug })}
        </p>
        <div class="max-w-md mx-auto mb-8">
          <SearchBar size="compact" />
        </div>
        <A
          href="/"
          class="inline-flex items-center gap-2 text-sm font-medium text-brand-primary hover:underline"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
          {t("topic.backToTopics")}
        </A>
      </Container>
    </main>
  );
}

// ── Page ─────────────────────────────────────────────────

export default function TopicPage() {
  const params = useParams<{ slug: string }>();
  const { t, locale } = useI18n();
  const [activeTab, setActiveTab] = createSignal<"resources" | "graph">(
    "resources"
  );
  const [showOriginal, setShowOriginal] = createSignal(false);

  const topic = createMemo(() => getTopicBySlug(params.slug));
  const mdContent = createMemo(() => getContentBySlug(params.slug));

  // Hybrid i18n: when the body's source language differs from the UI locale,
  // fetch an on-demand (cached) AI translation. Falls back to the original.
  const needsTranslation = createMemo(() => {
    const c = mdContent();
    return !!c && c.body.length > 0 && c.meta.lang !== locale();
  });

  const [translation] = createResource(
    () =>
      !isServer && needsTranslation() && !showOriginal()
        ? { slug: params.slug, locale: locale() }
        : null,
    async (src) => {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(src),
      });
      if (!res.ok) return null;
      return (await res.json()) as { body: string; translated: boolean };
    }
  );

  const displayBody = () => {
    const c = mdContent();
    if (!c) return undefined;
    if (showOriginal() || !needsTranslation()) return c.body;
    const tr = translation();
    return tr?.translated ? tr.body : c.body;
  };
  const isTranslating = () =>
    needsTranslation() && !showOriginal() && translation.loading;
  const isTranslated = () =>
    needsTranslation() && !showOriginal() && translation()?.translated === true;

  createEffect(() => {
    const current = topic();
    document.title = current
      ? `${current.name} — LearnPhilosophy`
      : t("topic.docNotFound");
  });

  const relatedTopics = createMemo(() =>
    ALL_TOPICS.filter(
      (t) =>
        t.slug !== params.slug &&
        (t.category === topic()?.category ||
          t.tags.some((tag) => topic()?.tags.includes(tag)))
    ).slice(0, 4)
  );

  return (
    <>
      <Show when={topic()} fallback={<NotFound slug={params.slug} />}>
        {(tp) => (
          <>
            <main>
              {/* ── Topic Hero ──────────────────────────────────── */}
              <section
                aria-labelledby="topic-heading"
                class="pt-28 pb-10 sm:pt-32 sm:pb-14 border-b border-brand-border"
              >
                <Container width="wide">
                  {/* Breadcrumb */}
                  <nav
                    aria-label="Breadcrumb"
                    class="flex items-center gap-1.5 text-xs text-brand-muted mb-6"
                  >
                    <A href="/" class="hover:text-brand-text transition-colors duration-fast">
                      {t("topic.home")}
                    </A>
                    <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
                      <path stroke-linecap="round" stroke-linejoin="round" d="m9 18 6-6-6-6" />
                    </svg>
                    <span class="text-brand-muted">{tp().category}</span>
                    <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
                      <path stroke-linecap="round" stroke-linejoin="round" d="m9 18 6-6-6-6" />
                    </svg>
                    <span class="text-brand-text font-medium" aria-current="page">
                      {tp().name}
                    </span>
                  </nav>

                  <div class="flex flex-col lg:flex-row lg:items-start gap-8">
                    {/* Left: text content */}
                    <div class="flex-1 min-w-0">
                      {/* Accent bar */}
                      <div
                        class="w-10 h-1.5 rounded-pill mb-4"
                        style={{ background: tp().color ?? "#2DD4BF" }}
                        aria-hidden="true"
                      />

                      <h1
                        id="topic-heading"
                        class="text-[clamp(2rem,5vw,3rem)] font-bold text-brand-text leading-tight tracking-tight mb-3"
                      >
                        {tp().name}
                      </h1>

                      <p class="text-lg text-brand-muted font-medium mb-4">
                        {tp().tagline}
                      </p>

                      {/* Markdown body if .md file exists, else plain description */}
                      <Show when={mdContent()?.body} fallback={
                        <p class="text-brand-muted leading-relaxed mb-6 max-w-2xl">
                          {tp().description}
                        </p>
                      }>
                        <div class="mb-6 max-w-2xl">
                          {/* Translation status / controls */}
                          <Show
                            when={
                              needsTranslation() &&
                              (isTranslating() || isTranslated() || showOriginal())
                            }
                          >
                            <div class="flex items-center gap-3 mb-2 text-xs">
                              <Show when={!showOriginal()}>
                                <Show
                                  when={!isTranslating()}
                                  fallback={
                                    <span class="text-brand-muted animate-pulse">
                                      {t("content.translating")}
                                    </span>
                                  }
                                >
                                  <Show when={isTranslated()}>
                                    <span class="inline-flex items-center gap-1 text-brand-primary bg-brand-primary/10 border border-brand-primary/20 rounded-pill px-2 py-0.5">
                                      ✨ {t("content.aiTranslated")}
                                    </span>
                                  </Show>
                                </Show>
                              </Show>
                              <button
                                type="button"
                                onClick={() => setShowOriginal((v) => !v)}
                                class="text-brand-primary hover:underline"
                              >
                                {showOriginal()
                                  ? t("content.showTranslation")
                                  : t("content.showOriginal")}
                              </button>
                            </div>
                          </Show>
                          <div
                            class="prose-content text-brand-muted leading-relaxed"
                            innerHTML={renderMarkdown(displayBody() ?? "")}
                          />
                        </div>
                      </Show>

                      {/* Tags */}
                      <ChipRow class="mb-6">
                        <For each={tp().tags}>
                          {(tag) => <TopicChip label={tag} />}
                        </For>
                      </ChipRow>

                      {/* Stats */}
                      <div class="flex flex-wrap items-center gap-5">
                        <Show when={tp().resources.length > 0}>
                          <div>
                            <span class="text-2xl font-bold text-brand-secondary">
                              {tp().resources.length}
                            </span>
                            <span class="text-sm text-brand-muted ml-1.5">
                              {t("common.resources")}
                            </span>
                          </div>
                          <div class="w-px h-5 bg-brand-border" aria-hidden="true" />
                        </Show>
                        <div>
                          <span class="text-sm font-semibold text-brand-muted">
                            {tp().category}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: compact search */}
                    <div class="w-full lg:w-72 xl:w-80 flex-shrink-0">
                      <label
                        for="topic-search"
                        class="block text-xs font-semibold uppercase tracking-wider text-brand-muted mb-2"
                      >
                        {t("topic.findAnother")}
                      </label>
                      <SearchBar size="compact" />
                    </div>
                  </div>
                </Container>
              </section>

              {/* ── Split View: Resources + Graph ───────────────── */}
              <section aria-label="Resources and knowledge graph" class="py-section-sm sm:py-section-md">
                <Container width="wide">
                  {/* Mobile tabs */}
                  <div
                    class="flex lg:hidden mb-6 bg-brand-chip rounded-xl p-1 border border-brand-border"
                    role="tablist"
                    aria-label="View selection"
                  >
                    {(["resources", "graph"] as const).map((tab) => (
                      <button
                        role="tab"
                        aria-selected={activeTab() === tab}
                        type="button"
                        class={clsx(
                          "flex-1 py-2 px-4 rounded-lg text-sm font-medium capitalize",
                          "transition-all duration-normal",
                          "focus-visible:ring-2 focus-visible:ring-brand-primary",
                          activeTab() === tab
                            ? "bg-white text-brand-text shadow-sm border border-brand-border"
                            : "text-brand-muted hover:text-brand-text"
                        )}
                        onClick={() => setActiveTab(tab)}
                      >
                        {tab === "resources" ? t("topic.tabResources") : t("topic.tabMap")}
                      </button>
                    ))}
                  </div>

                  <div class="flex flex-col lg:flex-row gap-6 xl:gap-8">
                    {/* Resources panel */}
                    <div
                      class={clsx(
                        "flex-1 min-w-0",
                        "lg:block",
                        activeTab() !== "resources" && "hidden lg:block"
                      )}
                      role="tabpanel"
                      aria-label="Learning resources"
                    >
                      <div class="flex items-center justify-between mb-5">
                        <h2 class="text-lg font-semibold text-brand-text">
                          {t("topic.resources")}
                          <span class="ml-2 text-sm font-normal text-brand-muted">
                            ({tp().resources.length})
                          </span>
                        </h2>
                        <Button variant="outline" size="sm">
                          {t("topic.savePath")}
                        </Button>
                      </div>

                      {/* Difficulty legend — only when there are resources to label */}
                      <Show when={tp().resources.length > 0}>
                        <div class="flex flex-wrap items-center gap-2 mb-4">
                          {(["beginner", "intermediate", "advanced"] as const).map(
                            (d) => (
                              <span
                                class={clsx(
                                  "text-xs font-medium px-2 py-0.5 rounded-pill border",
                                  DIFFICULTY_COLORS[d]
                                )}
                              >
                                {t(`common.${d}`)}
                              </span>
                            )
                          )}
                          <span class="text-xs text-brand-muted ml-1">
                            {t("topic.difficultyLevels")}
                          </span>
                        </div>
                      </Show>

                      <Show
                        when={tp().resources.length > 0}
                        fallback={
                          <div class="p-5 rounded-xl border border-dashed border-brand-border bg-brand-chip/40 text-sm text-brand-muted leading-relaxed">
                            {t("topic.noResources", { name: tp().name })}
                          </div>
                        }
                      >
                        <div class="space-y-3">
                          <For each={tp().resources}>
                            {(resource, i) => (
                              <ResourceCard resource={resource} index={i()} />
                            )}
                          </For>
                        </div>
                      </Show>

                      {/* Contribution CTA */}
                      <div class="mt-6 p-4 rounded-xl border border-dashed border-brand-border bg-brand-chip/50 text-center">
                        <p class="text-sm text-brand-muted mb-2">
                          {t("topic.knowResource", { name: tp().name })}
                        </p>
                        <Button variant="ghost" size="sm" class="text-brand-primary hover:text-brand-primary-dark">
                          {t("topic.suggestResource")}
                        </Button>
                      </div>
                    </div>

                    {/* Graph panel — sticky on desktop */}
                    <div
                      class={clsx(
                        "w-full lg:w-[420px] xl:w-[480px] flex-shrink-0",
                        "lg:block",
                        activeTab() !== "graph" && "hidden lg:block"
                      )}
                      role="tabpanel"
                      aria-label="Knowledge graph"
                    >
                      <div class="lg:sticky lg:top-24">
                        <div class="flex items-center justify-between mb-4">
                          <h2 class="text-lg font-semibold text-brand-text">
                            {t("topic.knowledgeMap")}
                          </h2>
                          <span class="text-xs text-brand-muted bg-brand-chip border border-brand-border px-2 py-1 rounded-pill">
                            {t("topic.connectionsCount", { count: tp().relatedNodes.length })}
                          </span>
                        </div>

                        <Suspense
                          fallback={
                            <div class="w-full h-[360px] rounded-xl border border-brand-border bg-brand-chip/50 flex items-center justify-center">
                              <div class="text-center">
                                <div class="w-8 h-8 border-2 border-brand-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                                <p class="text-sm text-brand-muted">{t("topic.loadingGraph")}</p>
                              </div>
                            </div>
                          }
                        >
                          <GraphPanel
                            nodes={tp().relatedNodes}
                            edges={tp().edges}
                            centerNodeId={tp().id}
                            class="h-[360px] lg:h-[420px]"
                          />
                        </Suspense>

                        {/* Graph legend */}
                        <div class="mt-3 flex flex-wrap gap-3 text-xs text-brand-muted">
                          <span class="flex items-center gap-1.5">
                            <span class="w-3 h-3 rounded-full bg-brand-primary inline-block" aria-hidden="true" />
                            {t("topic.legendCurrent")}
                          </span>
                          <span class="flex items-center gap-1.5">
                            <span class="w-2.5 h-2.5 rounded-full bg-brand-secondary/70 inline-block" aria-hidden="true" />
                            {t("topic.legendRelated")}
                          </span>
                          <span class="flex items-center gap-1.5">
                            <span class="w-4 h-px bg-brand-border inline-block" aria-hidden="true" />
                            {t("topic.legendConnection")}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Container>
              </section>

              {/* ── Ask AI ──────────────────────────────────────── */}
              <AskPanel topic={tp()} />

              {/* ── Learn: path + quiz ──────────────────────────── */}
              <section
                aria-label="Learning path and quiz"
                class="py-section-sm sm:py-section-md border-t border-brand-border"
              >
                <Container width="wide">
                  <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
                    <LearningPath slug={tp().slug} />
                    <Quiz topic={tp()} />
                  </div>
                </Container>
              </section>

              {/* ── Related Topics ──────────────────────────────── */}
              <Show when={relatedTopics().length > 0}>
                <section
                  aria-labelledby="related-heading"
                  class="py-section-sm sm:py-section-md border-t border-brand-border"
                >
                  <Container width="wide">
                    <h2
                      id="related-heading"
                      class="text-xl font-bold text-brand-text mb-6"
                    >
                      {t("topic.relatedTopics")}
                    </h2>
                    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <For each={relatedTopics()}>
                        {(related, i) => (
                          <TopicCard topic={related} animationDelay={i() * 60} />
                        )}
                      </For>
                    </div>
                  </Container>
                </section>
              </Show>
            </main>
          </>
        )}
      </Show>
    </>
  );
}
