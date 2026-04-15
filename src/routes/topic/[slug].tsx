import { createMemo, lazy, Show, For, Suspense, createSignal, createEffect } from "solid-js";
import { useParams, A } from "@solidjs/router";
import clsx from "clsx";
import { Container } from "~/components/Container";
import { SearchBar } from "~/components/SearchBar";
import { TopicChip, ChipRow } from "~/components/TopicChip";
import { TopicCard } from "~/components/TopicCard";
import { Button } from "~/components/Button";
import { getTopicBySlug, ALL_TOPICS, type Resource } from "~/lib/topics";
import { getContentBySlug } from "~/lib/content";

// ── Lightweight markdown → HTML (headings, bold, lists, paragraphs) ──
function markdownToHtml(md: string): string {
  return md
    // Strip frontmatter if somehow present
    .replace(/^---[\s\S]*?---\n/, "")
    // h2 / h3
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    // Bold
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    // Italic
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    // Inline code
    .replace(/`(.+?)`/g, "<code>$1</code>")
    // Unordered list items
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    // Blockquote
    .replace(/^> (.+)$/gm, "<blockquote>$1</blockquote>")
    // Wrap consecutive <li> in <ul>
    .replace(/(<li>[\s\S]+?<\/li>)(\n(?!<li>)|$)/g, "<ul>$1</ul>$2")
    // Paragraphs (blank-line-separated blocks that aren't headings/lists)
    .split(/\n\n+/)
    .map((block) => {
      const b = block.trim();
      if (!b) return "";
      if (/^<(h[23]|ul|li|blockquote)/.test(b)) return b;
      return `<p>${b.replace(/\n/g, " ")}</p>`;
    })
    .join("\n");
}

// Lazy-load the heavy graph panel
const GraphPanel = lazy(() =>
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
              {r.difficulty}
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
  return (
    <main class="min-h-screen flex items-center justify-center">
      <Container width="narrow" class="text-center py-24">
        <div class="text-5xl mb-6" aria-hidden="true">🔍</div>
        <h1 class="text-2xl font-bold text-brand-text mb-3">
          Topic not found
        </h1>
        <p class="text-brand-muted mb-8">
          We couldn't find a topic called{" "}
          <strong class="text-brand-text">"{props.slug}"</strong> — try
          searching for it or browse what's available.
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
          Back to all topics
        </A>
      </Container>
    </main>
  );
}

// ── Page ─────────────────────────────────────────────────

export default function TopicPage() {
  const params = useParams<{ slug: string }>();
  const [activeTab, setActiveTab] = createSignal<"resources" | "graph">(
    "resources"
  );

  const topic = createMemo(() => getTopicBySlug(params.slug));
  const mdContent = createMemo(() => getContentBySlug(params.slug));

  createEffect(() => {
    const t = topic();
    if (t) document.title = `${t.name} — LearnPhilosophy`;
    else document.title = "Topic not found — LearnPhilosophy";
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
        {(t) => (
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
                      Home
                    </A>
                    <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
                      <path stroke-linecap="round" stroke-linejoin="round" d="m9 18 6-6-6-6" />
                    </svg>
                    <span class="text-brand-muted">{t().category}</span>
                    <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
                      <path stroke-linecap="round" stroke-linejoin="round" d="m9 18 6-6-6-6" />
                    </svg>
                    <span class="text-brand-text font-medium" aria-current="page">
                      {t().name}
                    </span>
                  </nav>

                  <div class="flex flex-col lg:flex-row lg:items-start gap-8">
                    {/* Left: text content */}
                    <div class="flex-1 min-w-0">
                      {/* Accent bar */}
                      <div
                        class="w-10 h-1.5 rounded-pill mb-4"
                        style={{ background: t().color ?? "#2DD4BF" }}
                        aria-hidden="true"
                      />

                      <h1
                        id="topic-heading"
                        class="text-[clamp(2rem,5vw,3rem)] font-bold text-brand-text leading-tight tracking-tight mb-3"
                      >
                        {t().name}
                      </h1>

                      <p class="text-lg text-brand-muted font-medium mb-4">
                        {t().tagline}
                      </p>

                      {/* Markdown body if .md file exists, else plain description */}
                      <Show when={mdContent()?.body} fallback={
                        <p class="text-brand-muted leading-relaxed mb-6 max-w-2xl">
                          {t().description}
                        </p>
                      }>
                        {(body) => (
                          <div
                            class="prose-content text-brand-muted leading-relaxed mb-6 max-w-2xl"
                            innerHTML={markdownToHtml(body())}
                          />
                        )}
                      </Show>

                      {/* Tags */}
                      <ChipRow class="mb-6">
                        <For each={t().tags}>
                          {(tag) => <TopicChip label={tag} />}
                        </For>
                      </ChipRow>

                      {/* Stats */}
                      <div class="flex flex-wrap items-center gap-5">
                        <div>
                          <span class="text-2xl font-bold text-brand-secondary">
                            {t().resourceCount}
                          </span>
                          <span class="text-sm text-brand-muted ml-1.5">
                            resources
                          </span>
                        </div>
                        <div class="w-px h-5 bg-brand-border" aria-hidden="true" />
                        <div>
                          <span class="text-2xl font-bold text-brand-secondary">
                            {t().learnerCount.toLocaleString()}
                          </span>
                          <span class="text-sm text-brand-muted ml-1.5">
                            learners
                          </span>
                        </div>
                        <div class="w-px h-5 bg-brand-border" aria-hidden="true" />
                        <div>
                          <span class="text-sm font-semibold text-brand-muted">
                            {t().category}
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
                        Find another topic
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
                        {tab === "resources" ? "📚 Resources" : "🗺 Knowledge Map"}
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
                          Resources
                          <span class="ml-2 text-sm font-normal text-brand-muted">
                            ({t().resources.length})
                          </span>
                        </h2>
                        <Button variant="outline" size="sm">
                          Save path
                        </Button>
                      </div>

                      {/* Difficulty legend */}
                      <div class="flex flex-wrap items-center gap-2 mb-4">
                        {(["beginner", "intermediate", "advanced"] as const).map(
                          (d) => (
                            <span
                              class={clsx(
                                "text-xs font-medium px-2 py-0.5 rounded-pill border",
                                DIFFICULTY_COLORS[d]
                              )}
                            >
                              {d}
                            </span>
                          )
                        )}
                        <span class="text-xs text-brand-muted ml-1">
                          Difficulty levels
                        </span>
                      </div>

                      <div class="space-y-3">
                        <For each={t().resources}>
                          {(resource, i) => (
                            <ResourceCard resource={resource} index={i()} />
                          )}
                        </For>
                      </div>

                      {/* Contribution CTA */}
                      <div class="mt-6 p-4 rounded-xl border border-dashed border-brand-border bg-brand-chip/50 text-center">
                        <p class="text-sm text-brand-muted mb-2">
                          Know a great resource for{" "}
                          <span class="font-medium text-brand-text">{t().name}</span>?
                        </p>
                        <Button variant="ghost" size="sm" class="text-brand-primary hover:text-brand-primary-dark">
                          + Suggest a resource
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
                            Knowledge Map
                          </h2>
                          <span class="text-xs text-brand-muted bg-brand-chip border border-brand-border px-2 py-1 rounded-pill">
                            {t().relatedNodes.length} connections
                          </span>
                        </div>

                        <Suspense
                          fallback={
                            <div class="w-full h-[360px] rounded-xl border border-brand-border bg-brand-chip/50 flex items-center justify-center">
                              <div class="text-center">
                                <div class="w-8 h-8 border-2 border-brand-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                                <p class="text-sm text-brand-muted">Loading graph…</p>
                              </div>
                            </div>
                          }
                        >
                          <GraphPanel
                            nodes={t().relatedNodes}
                            edges={t().edges}
                            centerNodeId={t().id}
                            class="h-[360px] lg:h-[420px]"
                          />
                        </Suspense>

                        {/* Graph legend */}
                        <div class="mt-3 flex flex-wrap gap-3 text-xs text-brand-muted">
                          <span class="flex items-center gap-1.5">
                            <span class="w-3 h-3 rounded-full bg-brand-primary inline-block" aria-hidden="true" />
                            Current topic
                          </span>
                          <span class="flex items-center gap-1.5">
                            <span class="w-2.5 h-2.5 rounded-full bg-brand-secondary/70 inline-block" aria-hidden="true" />
                            Related concept
                          </span>
                          <span class="flex items-center gap-1.5">
                            <span class="w-4 h-px bg-brand-border inline-block" aria-hidden="true" />
                            Connection
                          </span>
                        </div>
                      </div>
                    </div>
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
                      Related topics
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
