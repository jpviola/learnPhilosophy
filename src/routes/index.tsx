import { createSignal, createMemo, For, Show, onMount, onCleanup } from "solid-js";
import { useNavigate } from "@solidjs/router";
import clsx from "clsx";
import { searchTopics, ALL_TOPICS } from "~/lib/topics";
import { LandingGraph, NodeTooltip, RippleOverlay, type HoverInfo } from "~/components/LandingGraph";

// ── Search ───────────────────────────────────────────────────

function HomeSearch() {
  const navigate = useNavigate();
  const [query, setQuery] = createSignal("");
  const [focused, setFocused] = createSignal(false);
  const [activeIdx, setActiveIdx] = createSignal(-1);
  let containerRef: HTMLDivElement | undefined;

  const results = createMemo(() => {
    const q = query().trim();
    if (!q) return [];
    return searchTopics(q).slice(0, 8);
  });
  const showDropdown = () => focused() && results().length > 0;

  onMount(() => {
    const close = (e: MouseEvent) => {
      if (!containerRef?.contains(e.target as Node)) {
        setFocused(false); setActiveIdx(-1);
      }
    };
    document.addEventListener("mousedown", close);
    onCleanup(() => document.removeEventListener("mousedown", close));
  });

  function go(slug?: string) {
    const s = slug ?? results()[activeIdx()]?.slug;
    if (s) { setFocused(false); navigate(`/topic/${s}`); }
  }

  function onKey(e: KeyboardEvent) {
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, results().length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, -1)); }
    else if (e.key === "Enter") { e.preventDefault(); go(); }
    else if (e.key === "Escape") { setFocused(false); setActiveIdx(-1); }
  }

  return (
    <div ref={containerRef} class="relative w-full">
      <div class="flex items-center gap-2.5">
        <span class="text-white/25 text-xl font-mono select-none flex-shrink-0" aria-hidden="true">=</span>
        <input
          type="text"
          autofocus
          placeholder="type a topic…"
          value={query()}
          onInput={(e) => { setQuery(e.currentTarget.value); setActiveIdx(-1); }}
          onFocus={() => setFocused(true)}
          onKeyDown={onKey}
          spellcheck={false}
          autocomplete="off"
          aria-label="Search philosophy topics"
          role="combobox"
          aria-expanded={showDropdown()}
          class={clsx(
            "flex-1 bg-transparent outline-none",
            "text-white text-xl placeholder:text-white/20",
            "caret-emerald-400 border-b-2 pb-1",
            "transition-colors duration-150",
            focused() ? "border-emerald-500" : "border-white/10",
          )}
        />
      </div>

      <Show when={showDropdown()}>
        <ul
          role="listbox"
          class={clsx(
            "absolute top-full left-0 right-0 mt-3 z-20",
            "bg-[#111] border border-white/10 rounded-xl overflow-hidden",
            "shadow-[0_16px_48px_rgba(0,0,0,0.8)]",
            "animate-scale-in"
          )}
        >
          <For each={results()}>
            {(topic, i) => (
              <li role="option" aria-selected={activeIdx() === i()}>
                <button
                  type="button"
                  class={clsx(
                    "w-full flex items-center gap-3 px-4 py-3 text-left",
                    "transition-colors duration-75 border-b border-white/[0.05] last:border-0",
                    activeIdx() === i() ? "bg-white/[0.07]" : "hover:bg-white/[0.04]"
                  )}
                  onClick={() => go(topic.slug)}
                  onMouseEnter={() => setActiveIdx(i())}
                >
                  <span
                    class="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: topic.color ?? "#34d399" }}
                    aria-hidden="true"
                  />
                  <span class="flex-1 min-w-0">
                    <span class="block text-sm font-medium text-white/90">{topic.name}</span>
                    <span class="block text-xs text-white/35 truncate mt-0.5">{topic.tagline}</span>
                  </span>
                  <span class="text-xs text-white/20 font-mono">{topic.resourceCount}</span>
                </button>
              </li>
            )}
          </For>
        </ul>
      </Show>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────

export default function HomePage() {
  const navigate = useNavigate();

  const [hoverInfo, setHoverInfo] = createSignal<HoverInfo | null>(null);
  const [ripple, setRipple] = createSignal<{ cx: number; cy: number } | null>(null);

  onMount(() => {
    document.title = "LearnPhilosophy — I want to learn";
    console.log('CLIENT: ALL_TOPICS length:', ALL_TOPICS.length);
  });

  function handleNavigate(slug: string, cx: number, cy: number) {
    setHoverInfo(null);
    setRipple({ cx, cy });
    setTimeout(() => navigate(`/topic/${slug}`), 380);
  }

  return (
    <div class="relative w-full h-screen bg-neutral-950 overflow-hidden">

      <LandingGraph onHover={setHoverInfo} onNavigate={handleNavigate} />

      <div
        class="absolute inset-0 pointer-events-none"
        style="background: radial-gradient(ellipse 50% 50% at 50% 50%, rgba(10,10,10,0.78) 0%, transparent 100%)"
        aria-hidden="true"
      />

      <div
        class="absolute inset-0 pointer-events-none"
        style="background: linear-gradient(to bottom, rgba(10,10,10,0.55) 0%, transparent 14%, transparent 86%, rgba(10,10,10,0.55) 100%)"
        aria-hidden="true"
      />

      <main
        class="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10"
        aria-label="LearnPhilosophy"
      >
        <h1
          class="font-bold tracking-tight leading-none mb-8 text-center"
          style={{
            "font-size": "clamp(2.2rem, 7vw, 4.5rem)",
            background: "linear-gradient(145deg, #ffffff 60%, rgba(255,255,255,0.28))",
            "-webkit-background-clip": "text",
            "-webkit-text-fill-color": "transparent",
            "background-clip": "text",
          }}
        >
          I want to learn
        </h1>

        <div class="pointer-events-auto w-full max-w-xs sm:max-w-sm px-6">
          <HomeSearch />
        </div>

        <div class="mt-7 h-5 flex items-center">
          <Show when={hoverInfo()}>
            {(info) => (
              <p class="text-xs text-white/35 tracking-wider animate-fade-in">
                <span class="text-white/60">{info().node.label}</span>
                <Show when={info().node.slug}>
                  {" "}&mdash;{" "}
                  <span class="text-emerald-500">click to explore</span>
                </Show>
              </p>
            )}
          </Show>
          <Show when={!hoverInfo()}>
            <p class="text-xs text-white/18 tracking-wider select-none">
              {ALL_TOPICS.length} topics &middot;{" "}
              {ALL_TOPICS.reduce((a, t) => a + t.resourceCount, 0)} resources
              &middot; drag to rearrange
            </p>
          </Show>
        </div>
      </main>

      <Show when={hoverInfo()}>
        {(info) => <NodeTooltip info={info()} />}
      </Show>

      <Show when={ripple()}>
        {(r) => <RippleOverlay cx={r().cx} cy={r().cy} />}
      </Show>
    </div>
  );
}
