import { createMemo, Show, onMount, onCleanup } from "solid-js";
import { isServer } from "solid-js/web";
import clsx from "clsx";
import { ALL_TOPICS, getTopicBySlug } from "~/lib/topics";
import { getTopicColor } from "~/lib/palace";
import { tickNodes, nodeAt, LANDING_OPTS, type SimNode, type SimEdge } from "~/lib/graph/sim";

export interface HoverInfo {
  screenX: number;
  screenY: number;
  node: SimNode;
}

function buildGraph(): { nodes: SimNode[]; edges: SimEdge[] } {
  const nodeMap = new Map<string, SimNode>();
  const edgeSet = new Set<string>();
  const edges: SimEdge[] = [];

  const topicColors: Record<string, string> = {
    stoicism: "#2DD4BF",
    epistemology: "#8B5CF6",
    ethics: "#F59E0B",
    existentialism: "#EC4899",
    logic: "#3B82F6",
    metaphysics: "#6366F1",
    "political-philosophy": "#10B981",
    "philosophy-of-mind": "#F97316",
  };

  for (const topic of ALL_TOPICS) {
    nodeMap.set(topic.id, {
      id: topic.id,
      label: topic.name,
      slug: topic.slug,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      r: topic.isPrimary ? 7 : 4.5,
      isPrimary: topic.isPrimary ?? false,
      color: getTopicColor(topic),
    });
  }

  for (const topic of ALL_TOPICS) {
    for (const rn of topic.relatedNodes) {
      if (rn.id === topic.id) continue;
      if (!nodeMap.has(rn.id)) {
        nodeMap.set(rn.id, {
          id: rn.id,
          label: rn.label,
          slug: undefined,
          x: 0,
          y: 0,
          vx: 0,
          vy: 0,
          r: 3.5 + (rn.weight ?? 1) * 0.8,
          isPrimary: false,
          color: "#6b7280",
        });
      }
      const key = [topic.id, rn.id].sort().join("||");
      if (!edgeSet.has(key)) {
        edgeSet.add(key);
        edges.push({ a: topic.id, b: rn.id });
      }
    }
    for (const edge of topic.edges) {
      if (ALL_TOPICS.some((t) => t.id === edge.target)) {
        const key = [topic.id, edge.target].sort().join("||");
        if (!edgeSet.has(key)) {
          edgeSet.add(key);
          edges.push({ a: topic.id, b: edge.target });
        }
      }
    }
  }

  return { nodes: Array.from(nodeMap.values()), edges };
}

export function LandingGraph(props: {
  onHover: (info: HoverInfo | null) => void;
  onNavigate: (slug: string, cx: number, cy: number) => void;
}) {
  let canvasRef: HTMLCanvasElement | undefined;
  let raf: number = 0;

  onMount(() => {
    if (isServer || !canvasRef) return;

    const canvas = canvasRef;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let attempts = 0;
    const tryInit = () => {
      attempts++;
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      if (w === 0 || h === 0) {
        if (attempts < 50) setTimeout(tryInit, 100);
        return;
      }
      initGraph(w, h);
    };

    const initGraph = (initialW: number, initialH: number) => {
      const { nodes, edges } = buildGraph();
      if (nodes.length === 0) return;

      const liveMap = new Map(nodes.map((n) => [n.id, n]));
      let w = initialW;
      let h = initialH;
      const dpr = window.devicePixelRatio || 1;

      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.scale(dpr, dpr);

      const cx = w / 2;
      const cy = h / 2;
      nodes.forEach((n, i) => {
        const angle = ((i / nodes.length) * Math.PI * 2);
        const ring = n.isPrimary ? 0.27 : 0.42;
        const jitter = (Math.random() - 0.5) * 0.16;
        n.x = cx + Math.cos(angle) * Math.min(w, h) * (ring + jitter);
        n.y = cy + Math.sin(angle) * Math.min(w, h) * (ring + jitter);
        n.vx = (Math.random() - 0.5) * 0.5;
        n.vy = (Math.random() - 0.5) * 0.5;
      });

      let hoveredId: string | null = null;
      let dragNode: SimNode | null = null;

      const draw = () => {
        ctx.clearRect(0, 0, w, h);

        for (const edge of edges) {
          const a = liveMap.get(edge.a);
          const b = liveMap.get(edge.b);
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
          ? isHot
            ? node.color
            : node.color + "CC"
          : isHot
          ? "rgba(255,255,255,0.95)"
          : "rgba(255,255,255,0.32)";
        
        ctx.fill();
        ctx.shadowBlur = 0;

        if (node.isPrimary || isHot) {
          ctx.font = `${node.isPrimary ? "600" : "500"} ${node.isPrimary ? 12 : 11}px Inter, sans-serif`;
          ctx.fillStyle = isHot ? "white" : "rgba(255,255,255,0.7)";
          ctx.textAlign = "center";
          ctx.textBaseline = "top";
          ctx.fillText(node.label, node.x, node.y + r + 6);
        }
      }
      };

      const reducedMotion = window
        .matchMedia("(prefers-reduced-motion: reduce)")
        .matches;
      if (!reducedMotion) {
        const loop = () => {
          tickNodes(nodes, edges, liveMap, w, h, dragNode, LANDING_OPTS);
          draw();
          raf = requestAnimationFrame(loop);
        };
        loop();
      } else {
        draw();
      }

      const onMouseMove = (e: MouseEvent) => {
        if (dragNode) {
          const rect = canvas.getBoundingClientRect();
          dragNode.x = e.clientX - rect.left;
          dragNode.y = e.clientY - rect.top;
          dragNode.vx = 0;
          dragNode.vy = 0;
          canvas.style.cursor = "grabbing";
          props.onHover(null);
          return;
        }
        const node = nodeAt(nodes, e.clientX, e.clientY, canvas);
        if (node?.id !== hoveredId) {
          hoveredId = node?.id ?? null;
          props.onHover(
            node
              ? { screenX: e.clientX, screenY: e.clientY, node }
              : null
          );
        } else if (node) {
          props.onHover({ screenX: e.clientX, screenY: e.clientY, node });
        }
        canvas.style.cursor = node ? "pointer" : "default";
      };

      const onMouseDown = (e: MouseEvent) => {
        const node = nodeAt(nodes, e.clientX, e.clientY, canvas);
        if (node) dragNode = node;
      };

      const onMouseUp = () => {
        const released = dragNode;
        dragNode = null;
        canvas.style.cursor = "default";
        if (released && released.slug) {
          const rect = canvas.getBoundingClientRect();
          props.onNavigate(
            released.slug,
            (released.x / rect.width) * 100,
            (released.y / rect.height) * 100
          );
        }
      };

      const onMouseLeave = () => {
        hoveredId = null;
        props.onHover(null);
        dragNode = null;
      };

      const onResize = () => {
        w = canvas.offsetWidth;
        h = canvas.offsetHeight;
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        ctx.scale(dpr, dpr);
      };

      canvas.addEventListener("mousemove", onMouseMove);
      canvas.addEventListener("mousedown", onMouseDown);
      canvas.addEventListener("mouseup", onMouseUp);
      canvas.addEventListener("mouseleave", onMouseLeave);
      window.addEventListener("resize", onResize);

      onCleanup(() => {
        cancelAnimationFrame(raf);
        canvas.removeEventListener("mousemove", onMouseMove);
        canvas.removeEventListener("mousedown", onMouseDown);
        canvas.removeEventListener("mouseup", onMouseUp);
        canvas.removeEventListener("mouseleave", onMouseLeave);
        window.removeEventListener("resize", onResize);
      });
    };

    tryInit();
  });

  return (
    <canvas
      ref={canvasRef}
      class="absolute inset-0 w-full h-full"
      style="touch-action: none;"
    />
  );
}

export function NodeTooltip(props: { info: HoverInfo }) {
  const topic = createMemo(() =>
    props.info.node.slug ? getTopicBySlug(props.info.node.slug) : undefined
  );
  const W = 220;
  const OFFSET = 18;
  const left = () =>
    Math.min(props.info.screenX + OFFSET, window.innerWidth - W - 12);
  const top = () => {
    const raw = props.info.screenY - 12;
    return raw + 120 > window.innerHeight ? props.info.screenY - 120 : raw;
  };

  return (
    <div
      class={clsx(
        "fixed z-30 pointer-events-none",
        "bg-[#111] border border-white/10 rounded-xl",
        "shadow-[0_12px_40px_rgba(0,0,0,0.7)] px-3.5 py-3 animate-fade-up"
      )}
      style={{
        left: `${left()}px`,
        top: `${top()}px`,
        width: `${W}px`,
      }}
    >
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
      <Show when={topic()}>
        {(t) => (
          <>
            <p class="text-xs text-white/45 leading-snug mb-2">
              {t().tagline}
            </p>
            <div class="flex items-center gap-3 pt-2 border-t border-white/[0.07]">
              <span class="text-xs text-white/30">
                <span class="text-emerald-400 font-semibold">
                  {t().resourceCount}
                </span>{" "}
                resources
              </span>
              <span class="text-xs text-white/30">
                <span class="text-white/60 font-semibold">
                  {(t().learnerCount / 1000).toFixed(1)}k
                </span>{" "}
                learners
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
