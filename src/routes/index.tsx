import {
  createSignal,
  createMemo,
  For,
  Show,
  onMount,
  onCleanup,
} from "solid-js";
import { useNavigate } from "@solidjs/router";
import clsx from "clsx";
import { searchTopics, ALL_TOPICS, getTopicBySlug } from "~/lib/topics";

// ── Graph data types ─────────────────────────────────────────

interface KNode {
  id: string;
  label: string;
  slug?: string;
  x: number; y: number;
  vx: number; vy: number;
  r: number;
  isPrimary: boolean;
  color: string;
}
interface KEdge { a: string; b: string; }

// Tooltip info passed up from the canvas
interface HoverInfo {
  screenX: number;
  screenY: number;
  node: KNode;
}

// ── Build graph from topic data ──────────────────────────────

function buildGraph(): { nodes: KNode[]; edges: KEdge[] } {
  const nodeMap = new Map<string, KNode>();
  const edgeSet = new Set<string>();
  const edges: KEdge[] = [];

  const topicColors: Record<string, string> = {
    stoicism: "#2DD4BF", epistemology: "#8B5CF6", ethics: "#F59E0B",
    existentialism: "#EC4899", logic: "#3B82F6", metaphysics: "#6366F1",
    "political-philosophy": "#10B981", "philosophy-of-mind": "#F97316",
  };

  for (const topic of ALL_TOPICS) {
    nodeMap.set(topic.id, {
      id: topic.id, label: topic.name, slug: topic.slug,
      x: 0, y: 0, vx: 0, vy: 0, r: 7, isPrimary: true,
      color: topic.color ?? topicColors[topic.id] ?? "#34d399",
    });
  }

  for (const topic of ALL_TOPICS) {
    for (const rn of topic.relatedNodes) {
      if (rn.id === topic.id) continue;
      if (!nodeMap.has(rn.id)) {
        nodeMap.set(rn.id, {
          id: rn.id, label: rn.label, slug: undefined,
          x: 0, y: 0, vx: 0, vy: 0,
          r: 3.5 + (rn.weight ?? 1) * 0.8,
          isPrimary: false, color: "#6b7280",
        });
      }
      const key = [topic.id, rn.id].sort().join("||");
      if (!edgeSet.has(key)) { edgeSet.add(key); edges.push({ a: topic.id, b: rn.id }); }
    }
    for (const edge of topic.edges) {
      const targetIsPrimary = ALL_TOPICS.some((t) => t.id === edge.target);
      if (targetIsPrimary) {
        const key = [topic.id, edge.target].sort().join("||");
        if (!edgeSet.has(key)) { edgeSet.add(key); edges.push({ a: topic.id, b: edge.target }); }
      }
    }
  }

  return { nodes: Array.from(nodeMap.values()), edges };
}

// ── Full-screen knowledge graph canvas ──────────────────────

function KnowledgeGraph(props: {
  onHover: (info: HoverInfo | null) => void;
  onNavigate: (slug: string, x: number, y: number) => void;
}) {
  let canvasRef: HTMLCanvasElement | undefined;
  let raf: number;

  onMount(() => {
    const canvas = canvasRef!;
    const ctx = canvas.getContext("2d")!;

    const { nodes, edges } = buildGraph();
    let w = 0, h = 0;
    let hoveredId: string | null = null;
    let dragNode: KNode | null = null;
    let dragOffX = 0, dragOffY = 0;
    let hasDragged = false;

    // ── Resize ───────────────────────────────────────────────
    function resize() {
      const dpr = window.devicePixelRatio || 1;
      w = canvas.offsetWidth;
      h = canvas.offsetHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.scale(dpr, dpr);
      placeNodes();
    }

    function placeNodes() {
      const cx = w / 2, cy = h / 2;
      nodes.forEach((n, i) => {
        if (n.x === 0 && n.y === 0) {
          const angle = (i / nodes.length) * Math.PI * 2;
          const ring = n.isPrimary ? 0.27 : 0.42;
          const jitter = (Math.random() - 0.5) * 0.16;
          const dist = Math.min(w, h) * (ring + jitter);
          n.x = cx + Math.cos(angle) * dist;
          n.y = cy + Math.sin(angle) * dist;
        }
        n.vx = (Math.random() - 0.5) * 0.5;
        n.vy = (Math.random() - 0.5) * 0.5;
      });
    }

    // ── Physics ──────────────────────────────────────────────
    function tick() {
      const cx = w / 2, cy = h / 2;
      for (const node of nodes) {
        if (node === dragNode) continue;

        // Repulsion
        for (const other of nodes) {
          if (other === node) continue;
          const dx = node.x - other.x, dy = node.y - other.y;
          const distSq = dx * dx + dy * dy + 1;
          const dist = Math.sqrt(distSq);
          const force = (node.isPrimary ? 4000 : 1800) / distSq;
          node.vx += (dx / dist) * force;
          node.vy += (dy / dist) * force;
        }

        // Edge springs
        for (const edge of edges) {
          const isA = edge.a === node.id, isB = edge.b === node.id;
          if (!isA && !isB) continue;
          const other = nodes.find((n) => n.id === (isA ? edge.b : edge.a));
          if (!other) continue;
          const dx = other.x - node.x, dy = other.y - node.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const ideal = node.isPrimary && other.isPrimary ? 210 : 130;
          const stretch = (dist - ideal) / dist;
          node.vx += dx * stretch * 0.022;
          node.vy += dy * stretch * 0.022;
        }

        // Center gravity
        node.vx += (cx - node.x) * 0.004;
        node.vy += (cy - node.y) * 0.004;

        node.vx *= 0.78; node.vy *= 0.78;
        node.x += node.vx; node.y += node.vy;

        const pad = 64;
        node.x = Math.max(pad, Math.min(w - pad, node.x));
        node.y = Math.max(pad, Math.min(h - pad, node.y));
      }
    }

    // ── Draw ─────────────────────────────────────────────────
    function roundRect(
      c: CanvasRenderingContext2D,
      x: number, y: number, rw: number, rh: number, r: number
    ) {
      c.beginPath();
      c.moveTo(x + r, y);
      c.lineTo(x + rw - r, y);
      c.quadraticCurveTo(x + rw, y, x + rw, y + r);
      c.lineTo(x + rw, y + rh - r);
      c.quadraticCurveTo(x + rw, y + rh, x + rw - r, y + rh);
      c.lineTo(x + r, y + rh);
      c.quadraticCurveTo(x, y + rh, x, y + rh - r);
      c.lineTo(x, y + r);
      c.quadraticCurveTo(x, y, x + r, y);
      c.closePath();
    }

    function draw() {
      ctx.clearRect(0, 0, w, h);

      // Edges
      for (const edge of edges) {
        const a = nodes.find((n) => n.id === edge.a);
        const b = nodes.find((n) => n.id === edge.b);
        if (!a || !b) continue;
        const isHot = hoveredId === edge.a || hoveredId === edge.b;
        const dist = Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
        const alpha = isHot ? 0.6 : Math.max(0.03, 0.18 - dist / 2400);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.strokeStyle = isHot
          ? `rgba(52,211,153,${alpha})`
          : `rgba(255,255,255,${alpha})`;
        ctx.lineWidth = isHot ? 1.2 : 0.6;
        ctx.stroke();
      }

      // Nodes
      for (const node of nodes) {
        const isHot = node.id === hoveredId;
        const r = node.r + (isHot ? 3.5 : 0);

        if (isHot || node.isPrimary) {
          ctx.shadowBlur = isHot ? 22 : 9;
          ctx.shadowColor = node.color;
        }

        ctx.beginPath();
        ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
        ctx.fillStyle = node.isPrimary
          ? isHot ? node.color : node.color + "CC"
          : isHot ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.32)";
        ctx.fill();
        ctx.shadowBlur = 0;

        // Label (always on primary, only on hover for sub-nodes)
        if (node.isPrimary || isHot) {
          const fontSize = node.isPrimary ? 11.5 : 10.5;
          ctx.font = `${node.isPrimary ? 600 : 400} ${fontSize}px Inter, sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";

          const tw = ctx.measureText(node.label).width;
          const px = 5, py = 3;
          const bx = node.x - tw / 2 - px;
          const by = node.y + r + 7;
          const bw = tw + px * 2;
          const bh = fontSize + py * 2;

          ctx.fillStyle = "rgba(8,8,8,0.75)";
          roundRect(ctx, bx, by, bw, bh, 4);
          ctx.fill();

          ctx.fillStyle = node.isPrimary
            ? isHot ? "#ffffff" : "rgba(255,255,255,0.85)"
            : "rgba(255,255,255,0.65)";
          ctx.fillText(node.label, node.x, by + bh / 2);
        }
      }
    }

    // ── Hit test ─────────────────────────────────────────────
    function nodeAt(clientX: number, clientY: number): KNode | undefined {
      const rect = canvas.getBoundingClientRect();
      const x = clientX - rect.left, y = clientY - rect.top;
      return nodes.find((n) => {
        const dx = x - n.x, dy = y - n.y;
        return Math.sqrt(dx * dx + dy * dy) <= n.r + 10;
      });
    }

    // ── Mouse ────────────────────────────────────────────────
    function onMouseMove(e: MouseEvent) {
      if (dragNode) {
        const rect = canvas.getBoundingClientRect();
        dragNode.x = e.clientX - rect.left - dragOffX;
        dragNode.y = e.clientY - rect.top - dragOffY;
        dragNode.vx = 0; dragNode.vy = 0;
        hasDragged = true;
        canvas.style.cursor = "grabbing";
        props.onHover(null);
        return;
      }
      const hit = nodeAt(e.clientX, e.clientY);
      const newId = hit?.id ?? null;
      if (newId !== hoveredId) {
        hoveredId = newId;
        props.onHover(hit
          ? { screenX: e.clientX, screenY: e.clientY, node: hit }
          : null
        );
      } else if (hit && hoveredId) {
        // Update position while staying on same node
        props.onHover({ screenX: e.clientX, screenY: e.clientY, node: hit });
      }
      canvas.style.cursor = hit ? "pointer" : "default";
    }

    function onMouseDown(e: MouseEvent) {
      const hit = nodeAt(e.clientX, e.clientY);
      if (hit) {
        dragNode = hit; hasDragged = false;
        const rect = canvas.getBoundingClientRect();
        dragOffX = e.clientX - rect.left - hit.x;
        dragOffY = e.clientY - rect.top - hit.y;
      }
    }

    function onMouseUp(e: MouseEvent) {
      const released = dragNode;
      dragNode = null;
      canvas.style.cursor = "default";
      if (released && !hasDragged && released.slug) {
        // Pass canvas-space coords for the ripple origin
        const rect = canvas.getBoundingClientRect();
        props.onNavigate(
          released.slug,
          released.x / (rect.width) * 100,   // % of viewport
          released.y / (rect.height) * 100
        );
      }
    }

    function onMouseLeave() {
      hoveredId = null;
      props.onHover(null);
      dragNode = null;
    }

    // Touch
    function onTouchStart(e: TouchEvent) {
      if (e.touches.length !== 1) return;
      const t = e.touches[0];
      const hit = nodeAt(t.clientX, t.clientY);
      if (hit) {
        dragNode = hit; hasDragged = false;
        const rect = canvas.getBoundingClientRect();
        dragOffX = t.clientX - rect.left - hit.x;
        dragOffY = t.clientY - rect.top - hit.y;
      }
    }
    function onTouchMove(e: TouchEvent) {
      if (!dragNode || e.touches.length !== 1) return;
      e.preventDefault();
      const t = e.touches[0];
      const rect = canvas.getBoundingClientRect();
      dragNode.x = t.clientX - rect.left - dragOffX;
      dragNode.y = t.clientY - rect.top - dragOffY;
      dragNode.vx = 0; dragNode.vy = 0;
      hasDragged = true;
    }
    function onTouchEnd(e: TouchEvent) {
      if (dragNode && !hasDragged && dragNode.slug) {
        const rect = canvas.getBoundingClientRect();
        props.onNavigate(
          dragNode.slug,
          dragNode.x / rect.width * 100,
          dragNode.y / rect.height * 100
        );
      }
      dragNode = null;
    }

    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("mousedown", onMouseDown);
    canvas.addEventListener("mouseup", onMouseUp);
    canvas.addEventListener("mouseleave", onMouseLeave);
    canvas.addEventListener("touchstart", onTouchStart, { passive: true });
    canvas.addEventListener("touchmove", onTouchMove, { passive: false });
    canvas.addEventListener("touchend", onTouchEnd);
    window.addEventListener("resize", resize);
    resize();

    function loop() { tick(); draw(); raf = requestAnimationFrame(loop); }
    loop();

    onCleanup(() => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("mousedown", onMouseDown);
      canvas.removeEventListener("mouseup", onMouseUp);
      canvas.removeEventListener("mouseleave", onMouseLeave);
      canvas.removeEventListener("touchstart", onTouchStart);
      canvas.removeEventListener("touchmove", onTouchMove);
      canvas.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("resize", resize);
    });
  });

  return (
    <canvas
      ref={canvasRef}
      class="absolute inset-0 w-full h-full"
      style="touch-action: none;"
    />
  );
}

// ── Hover tooltip ────────────────────────────────────────────

function NodeTooltip(props: { info: HoverInfo }) {
  const topic = createMemo(() =>
    props.info.node.slug ? getTopicBySlug(props.info.node.slug) : undefined
  );

  // Clamp to viewport so it doesn't overflow edges
  const OFFSET = 18;
  const W = 220;

  const left = () => {
    const raw = props.info.screenX + OFFSET;
    return Math.min(raw, window.innerWidth - W - 12);
  };
  const top = () => {
    const raw = props.info.screenY - 12;
    // Flip above cursor if near bottom
    return raw + 120 > window.innerHeight
      ? props.info.screenY - 120
      : raw;
  };

  return (
    <div
      class={clsx(
        "fixed z-30 pointer-events-none",
        "bg-[#111] border border-white/10 rounded-xl",
        "shadow-[0_12px_40px_rgba(0,0,0,0.7)]",
        "px-3.5 py-3",
        "animate-fade-up",
      )}
      style={{
        left: `${left()}px`,
        top: `${top()}px`,
        width: `${W}px`,
      }}
    >
      {/* Color bar + name */}
      <div class="flex items-center gap-2 mb-1.5">
        <span
          class="w-2 h-2 rounded-full flex-shrink-0"
          style={{ background: props.info.node.color }}
          aria-hidden="true"
        />
        <span class="text-sm font-semibold text-white leading-tight">
          {props.info.node.label}
        </span>
      </div>

      {/* Tagline & stats — only for primary topics */}
      <Show when={topic()}>
        {(t) => (
          <>
            <p class="text-xs text-white/45 leading-snug mb-2">
              {t().tagline}
            </p>
            <div class="flex items-center gap-3 pt-2 border-t border-white/[0.07]">
              <span class="text-xs text-white/30">
                <span class="text-emerald-400 font-semibold">{t().resourceCount}</span> resources
              </span>
              <span class="text-xs text-white/30">
                <span class="text-white/60 font-semibold">
                  {(t().learnerCount / 1000).toFixed(1)}k
                </span> learners
              </span>
            </div>
          </>
        )}
      </Show>

      {/* Sub-concept hint */}
      <Show when={!topic() && !props.info.node.slug}>
        <p class="text-xs text-white/30 leading-snug">
          Related concept
        </p>
      </Show>

      {/* Click hint */}
      <Show when={props.info.node.slug}>
        <p class="text-[10px] text-white/20 mt-2">
          click to explore →
        </p>
      </Show>
    </div>
  );
}

// ── Click-transition ripple overlay ─────────────────────────

function RippleOverlay(props: { cx: number; cy: number }) {
  return (
    <div
      class="fixed inset-0 z-40 pointer-events-none"
      style={{
        background: `radial-gradient(circle at ${props.cx}% ${props.cy}%, rgba(10,10,10,0) 0%, rgba(10,10,10,0) 20%, rgba(10,10,10,1) 70%)`,
        animation: "ripple-expand 380ms cubic-bezier(0.4,0,0.2,1) forwards",
      }}
      aria-hidden="true"
    />
  );
}

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
  });

  function handleNavigate(slug: string, cx: number, cy: number) {
    // Show ripple then navigate
    setHoverInfo(null);
    setRipple({ cx, cy });
    setTimeout(() => navigate(`/topic/${slug}`), 380);
  }

  return (
    <div class="relative w-full h-screen bg-neutral-950 overflow-hidden">

      {/* Interactive knowledge graph — full viewport */}
      <KnowledgeGraph
        onHover={setHoverInfo}
        onNavigate={handleNavigate}
      />

      {/* Centre vignette so text stays legible */}
      <div
        class="absolute inset-0 pointer-events-none"
        style="background: radial-gradient(ellipse 50% 50% at 50% 50%, rgba(10,10,10,0.78) 0%, transparent 100%)"
        aria-hidden="true"
      />

      {/* Top + bottom fades */}
      <div
        class="absolute inset-0 pointer-events-none"
        style="background: linear-gradient(to bottom, rgba(10,10,10,0.55) 0%, transparent 14%, transparent 86%, rgba(10,10,10,0.55) 100%)"
        aria-hidden="true"
      />

      {/* Centre UI overlay */}
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

        {/* Status line below search */}
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

      {/* Hover tooltip — rendered outside main so it's never clipped */}
      <Show when={hoverInfo()}>
        {(info) => <NodeTooltip info={info()} />}
      </Show>

      {/* Click ripple overlay */}
      <Show when={ripple()}>
        {(r) => <RippleOverlay cx={r().cx} cy={r().cy} />}
      </Show>
    </div>
  );
}
