import { createMemo, Show, onMount, onCleanup } from "solid-js";
import clsx from "clsx";
import { ALL_TOPICS, getTopicBySlug } from "~/lib/topics";
import { tickNodes, nodeAt, LANDING_OPTS, type SimNode, type SimEdge } from "~/lib/graph/sim";

// ── Types ────────────────────────────────────────────────────

export interface HoverInfo {
  screenX: number;
  screenY: number;
  node: SimNode;
}

// ── Build graph data from topic store ────────────────────────

function buildGraph(): { nodes: SimNode[]; edges: SimEdge[] } {
  const nodeMap = new Map<string, SimNode>();
  const edgeSet = new Set<string>();
  const edges: SimEdge[] = [];

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
      if (ALL_TOPICS.some(t => t.id === edge.target)) {
        const key = [topic.id, edge.target].sort().join("||");
        if (!edgeSet.has(key)) { edgeSet.add(key); edges.push({ a: topic.id, b: edge.target }); }
      }
    }
  }

  return { nodes: Array.from(nodeMap.values()), edges };
}

// ── Canvas graph component ────────────────────────────────────

export function LandingGraph(props: {
  onHover: (info: HoverInfo | null) => void;
  onNavigate: (slug: string, cx: number, cy: number) => void;
}) {
  let canvasRef: HTMLCanvasElement | undefined;
  let raf: number;

  onMount(() => {
    const canvas = canvasRef!;
    const ctx = canvas.getContext("2d")!;
    const { nodes, edges } = buildGraph();
    const liveMap = new Map(nodes.map(n => [n.id, n]));
    let w = 0, h = 0;
    let hoveredId: string | null = null;
    let dragNode: SimNode | null = null;
    let dragOffX = 0, dragOffY = 0;
    let hasDragged = false;

    function resize() {
      const dpr = window.devicePixelRatio || 1;
      w = canvas.offsetWidth; h = canvas.offsetHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
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
          n.x = cx + Math.cos(angle) * Math.min(w, h) * (ring + jitter);
          n.y = cy + Math.sin(angle) * Math.min(w, h) * (ring + jitter);
        }
        n.vx = (Math.random() - 0.5) * 0.5;
        n.vy = (Math.random() - 0.5) * 0.5;
      });
    }

    function roundRect(c: CanvasRenderingContext2D, x: number, y: number, rw: number, rh: number, r: number) {
      c.beginPath();
      c.moveTo(x + r, y); c.lineTo(x + rw - r, y);
      c.quadraticCurveTo(x + rw, y, x + rw, y + r);
      c.lineTo(x + rw, y + rh - r);
      c.quadraticCurveTo(x + rw, y + rh, x + rw - r, y + rh);
      c.lineTo(x + r, y + rh);
      c.quadraticCurveTo(x, y + rh, x, y + rh - r);
      c.lineTo(x, y + r); c.quadraticCurveTo(x, y, x + r, y);
      c.closePath();
    }

    function draw() {
      ctx.clearRect(0, 0, w, h);

      for (const edge of edges) {
        const a = liveMap.get(edge.a), b = liveMap.get(edge.b);
        if (!a || !b) continue;
        const isHot = hoveredId === edge.a || hoveredId === edge.b;
        const dist = Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
        const alpha = isHot ? 0.6 : Math.max(0.03, 0.18 - dist / 2400);
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
        ctx.strokeStyle = isHot ? `rgba(52,211,153,${alpha})` : `rgba(255,255,255,${alpha})`;
        ctx.lineWidth = isHot ? 1.2 : 0.6; ctx.stroke();
      }

      for (const node of nodes) {
        const isHot = node.id === hoveredId;
        const r = node.r + (isHot ? 3.5 : 0);
        if (isHot || node.isPrimary) { ctx.shadowBlur = isHot ? 22 : 9; ctx.shadowColor = node.color; }
        ctx.beginPath(); ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
        ctx.fillStyle = node.isPrimary
          ? isHot ? node.color : node.color + "CC"
          : isHot ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.32)";
        ctx.fill(); ctx.shadowBlur = 0;

        if (node.isPrimary || isHot) {
          const fontSize = node.isPrimary ? 11.5 : 10.5;
          ctx.font = `${node.isPrimary ? 600 : 400} ${fontSize}px Inter, sans-serif`;
          ctx.textAlign = "center"; ctx.textBaseline = "middle";
          const tw = ctx.measureText(node.label).width;
          const px = 5, py = 3, bx = node.x - tw / 2 - px, by = node.y + r + 7;
          const bw = tw + px * 2, bh = fontSize + py * 2;
          ctx.fillStyle = "rgba(8,8,8,0.75)";
          roundRect(ctx, bx, by, bw, bh, 4); ctx.fill();
          ctx.fillStyle = node.isPrimary
            ? isHot ? "#ffffff" : "rgba(255,255,255,0.85)"
            : "rgba(255,255,255,0.65)";
          ctx.fillText(node.label, node.x, by + bh / 2);
        }
      }
    }

    function hit(clientX: number, clientY: number) {
      return nodeAt(nodes, clientX, clientY, canvas);
    }

    function onMouseMove(e: MouseEvent) {
      if (dragNode) {
        const rect = canvas.getBoundingClientRect();
        dragNode.x = e.clientX - rect.left - dragOffX;
        dragNode.y = e.clientY - rect.top - dragOffY;
        dragNode.vx = 0; dragNode.vy = 0; hasDragged = true;
        canvas.style.cursor = "grabbing"; props.onHover(null); return;
      }
      const node = hit(e.clientX, e.clientY);
      const newId = node?.id ?? null;
      if (newId !== hoveredId) {
        hoveredId = newId;
        props.onHover(node ? { screenX: e.clientX, screenY: e.clientY, node } : null);
      } else if (node && hoveredId) {
        props.onHover({ screenX: e.clientX, screenY: e.clientY, node });
      }
      canvas.style.cursor = node ? "pointer" : "default";
    }

    function onMouseDown(e: MouseEvent) {
      const node = hit(e.clientX, e.clientY);
      if (!node) return;
      dragNode = node; hasDragged = false;
      const rect = canvas.getBoundingClientRect();
      dragOffX = e.clientX - rect.left - node.x;
      dragOffY = e.clientY - rect.top - node.y;
    }

    function onMouseUp() {
      const released = dragNode; dragNode = null;
      canvas.style.cursor = "default";
      if (released && !hasDragged && released.slug) {
        const rect = canvas.getBoundingClientRect();
        props.onNavigate(released.slug, released.x / rect.width * 100, released.y / rect.height * 100);
      }
    }

    function onMouseLeave() {
      hoveredId = null; props.onHover(null); dragNode = null;
    }

    function onTouchStart(e: TouchEvent) {
      if (e.touches.length !== 1) return;
      const t = e.touches[0];
      const node = hit(t.clientX, t.clientY);
      if (!node) return;
      dragNode = node; hasDragged = false;
      const rect = canvas.getBoundingClientRect();
      dragOffX = t.clientX - rect.left - node.x;
      dragOffY = t.clientY - rect.top - node.y;
    }

    function onTouchMove(e: TouchEvent) {
      if (!dragNode || e.touches.length !== 1) return;
      e.preventDefault();
      const t = e.touches[0];
      const rect = canvas.getBoundingClientRect();
      dragNode.x = t.clientX - rect.left - dragOffX;
      dragNode.y = t.clientY - rect.top - dragOffY;
      dragNode.vx = 0; dragNode.vy = 0; hasDragged = true;
    }

    function onTouchEnd() {
      if (dragNode && !hasDragged && dragNode.slug) {
        const rect = canvas.getBoundingClientRect();
        props.onNavigate(dragNode.slug, dragNode.x / rect.width * 100, dragNode.y / rect.height * 100);
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

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) {
      draw();
    } else {
      function loop() {
        tickNodes(nodes, edges, liveMap, w, h, dragNode, LANDING_OPTS);
        draw();
        raf = requestAnimationFrame(loop);
      }
      loop();
    }

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

// ── Hover tooltip ─────────────────────────────────────────────

export function NodeTooltip(props: { info: HoverInfo }) {
  const topic = createMemo(() =>
    props.info.node.slug ? getTopicBySlug(props.info.node.slug) : undefined
  );
  const W = 220, OFFSET = 18;
  const left = () => Math.min(props.info.screenX + OFFSET, window.innerWidth - W - 12);
  const top = () => {
    const raw = props.info.screenY - 12;
    return raw + 120 > window.innerHeight ? props.info.screenY - 120 : raw;
  };

  return (
    <div
      class={clsx(
        "fixed z-30 pointer-events-none",
        "bg-[#111] border border-white/10 rounded-xl",
        "shadow-[0_12px_40px_rgba(0,0,0,0.7)] px-3.5 py-3 animate-fade-up",
      )}
      style={{ left: `${left()}px`, top: `${top()}px`, width: `${W}px` }}
    >
      <div class="flex items-center gap-2 mb-1.5">
        <span class="w-2 h-2 rounded-full flex-shrink-0" style={{ background: props.info.node.color }} aria-hidden="true" />
        <span class="text-sm font-semibold text-white leading-tight">{props.info.node.label}</span>
      </div>
      <Show when={topic()}>
        {(t) => (
          <>
            <p class="text-xs text-white/45 leading-snug mb-2">{t().tagline}</p>
            <div class="flex items-center gap-3 pt-2 border-t border-white/[0.07]">
              <span class="text-xs text-white/30">
                <span class="text-emerald-400 font-semibold">{t().resourceCount}</span> resources
              </span>
              <span class="text-xs text-white/30">
                <span class="text-white/60 font-semibold">{(t().learnerCount / 1000).toFixed(1)}k</span> learners
              </span>
            </div>
          </>
        )}
      </Show>
      <Show when={!topic() && !props.info.node.slug}>
        <p class="text-xs text-white/30 leading-snug">Related concept</p>
      </Show>
      <Show when={props.info.node.slug}>
        <p class="text-[10px] text-white/20 mt-2">click to explore →</p>
      </Show>
    </div>
  );
}

// ── Click-ripple overlay ──────────────────────────────────────

export function RippleOverlay(props: { cx: number; cy: number }) {
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
