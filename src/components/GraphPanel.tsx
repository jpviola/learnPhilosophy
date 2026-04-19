import { createSignal, onMount, onCleanup, createEffect } from "solid-js";
import { useNavigate } from "@solidjs/router";
import clsx from "clsx";
import type { TopicNode, TopicEdge } from "~/lib/topics";
import { getTopicBySlug } from "~/lib/topics";
import { tickNodes, nodeAt, PANEL_OPTS, type SimNode, type SimEdge } from "~/lib/graph/sim";

interface GraphPanelProps {
  nodes: TopicNode[];
  edges: TopicEdge[];
  centerNodeId: string;
  class?: string;
}

const COLORS = ["#2DD4BF","#8B5CF6","#F59E0B","#EC4899","#3B82F6","#10B981","#F97316","#6366F1"];

function toSimNodes(nodes: TopicNode[], centerId: string, w: number, h: number): SimNode[] {
  return nodes.map((n, i) => {
    const isCenter = n.id === centerId;
    const angle = (i / nodes.length) * Math.PI * 2;
    const radius = isCenter ? 0 : 110 + Math.random() * 40;
    return {
      id: n.id, label: n.label, slug: n.id,
      x: w / 2 + Math.cos(angle) * radius,
      y: h / 2 + Math.sin(angle) * radius,
      vx: 0, vy: 0,
      r: isCenter ? 20 : 8 + (n.weight ?? 1) * 4,
      isPrimary: isCenter, color: isCenter ? "#2DD4BF" : COLORS[i % COLORS.length],
      pinned: isCenter,
    };
  });
}

export function GraphPanel(props: GraphPanelProps) {
  const navigate = useNavigate();
  let canvasRef: HTMLCanvasElement | undefined;
  let rafId: number;
  let simNodes: SimNode[] = [];
  let simEdges: SimEdge[] = [];
  let nodeMap = new Map<string, SimNode>();
  let ctx: CanvasRenderingContext2D | null = null;
  let dragNode: SimNode | null = null;
  let dragOffset = { x: 0, y: 0 };
  let hasDragged = false;

  const [hovered, setHovered] = createSignal<string | null>(null);
  const [dims, setDims] = createSignal({ w: 400, h: 360 });

  function initNodes() {
    const { w, h } = dims();
    simNodes = toSimNodes(props.nodes, props.centerNodeId, w, h);
    simEdges = props.edges.map(e => ({ a: e.source, b: e.target }));
    nodeMap = new Map(simNodes.map(n => [n.id, n]));
  }

  function draw() {
    if (!ctx) return;
    const { w, h } = dims();
    ctx.clearRect(0, 0, w, h);
    const hov = hovered();

    for (const edge of simEdges) {
      const src = nodeMap.get(edge.a), tgt = nodeMap.get(edge.b);
      if (!src || !tgt) continue;
      const hot = hov === edge.a || hov === edge.b;
      ctx.beginPath(); ctx.moveTo(src.x, src.y); ctx.lineTo(tgt.x, tgt.y);
      ctx.strokeStyle = hot ? "rgba(45,212,191,0.5)" : "rgba(229,231,235,0.9)";
      ctx.lineWidth = hot ? 1.5 : 1; ctx.stroke();
    }

    for (let i = 0; i < simNodes.length; i++) {
      const n = simNodes[i];
      const isHov = hov === n.id;
      if (isHov || n.isPrimary) {
        ctx.shadowBlur = n.isPrimary ? 16 : 10;
        ctx.shadowColor = n.color + "66";
      }
      ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      ctx.fillStyle = n.isPrimary ? "#2DD4BF" : isHov ? n.color : n.color + "CC";
      ctx.fill();
      if (!n.isPrimary) { ctx.strokeStyle = "white"; ctx.lineWidth = 1.5; ctx.stroke(); }
      ctx.shadowBlur = 0; ctx.shadowColor = "transparent";
      const fs = n.isPrimary ? 13 : isHov ? 12 : 11;
      ctx.font = `${n.isPrimary ? 600 : 500} ${fs}px Inter, sans-serif`;
      ctx.fillStyle = n.isPrimary ? "#0F172A" : isHov ? "#111111" : "#6B7280";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(n.label, n.x, n.y + n.r + (n.isPrimary ? 14 : 12));
    }
  }

  function loop() {
    tickNodes(simNodes, simEdges, nodeMap, dims().w, dims().h, dragNode, PANEL_OPTS);
    draw();
    rafId = requestAnimationFrame(loop);
  }

  function onMouseMove(e: MouseEvent) {
    if (dragNode) {
      const rect = canvasRef!.getBoundingClientRect();
      dragNode.x = e.clientX - rect.left - dragOffset.x;
      dragNode.y = e.clientY - rect.top - dragOffset.y;
      dragNode.vx = 0; dragNode.vy = 0; hasDragged = true;
    }
    const hit = nodeAt(simNodes, e.clientX, e.clientY, canvasRef!);
    setHovered(hit?.id ?? null);
    if (canvasRef) canvasRef.style.cursor = hit ? "pointer" : "grab";
  }

  function onMouseDown(e: MouseEvent) {
    const hit = nodeAt(simNodes, e.clientX, e.clientY, canvasRef!);
    if (!hit) return;
    dragNode = hit; hasDragged = false;
    const rect = canvasRef!.getBoundingClientRect();
    dragOffset = { x: e.clientX - rect.left - hit.x, y: e.clientY - rect.top - hit.y };
  }

  function onMouseUp() {
    const was = dragNode; dragNode = null;
    if (canvasRef) canvasRef.style.cursor = "grab";
    if (was && !hasDragged && !was.isPrimary && getTopicBySlug(was.id)) {
      navigate(`/topic/${was.id}`);
    }
  }

  onMount(() => {
    const resize = () => {
      if (!canvasRef) return;
      const p = canvasRef.parentElement!;
      const dpr = window.devicePixelRatio || 1;
      canvasRef.width = p.clientWidth * dpr;
      canvasRef.height = p.clientHeight * dpr;
      canvasRef.style.width = `${p.clientWidth}px`;
      canvasRef.style.height = `${p.clientHeight}px`;
      if (!ctx) ctx = canvasRef.getContext("2d");
      ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
      setDims({ w: p.clientWidth, h: p.clientHeight });
      initNodes();
    };

    const ro = new ResizeObserver(resize);
    if (canvasRef?.parentElement) ro.observe(canvasRef.parentElement);
    resize();

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      draw();
    } else {
      loop();
    }

    onCleanup(() => { cancelAnimationFrame(rafId); ro.disconnect(); });
  });

  createEffect(() => { props.nodes; initNodes(); });

  return (
    <div class={clsx(
      "relative w-full h-full min-h-[320px] rounded-xl overflow-hidden",
      "bg-gradient-to-br from-brand-bg to-white border border-brand-border",
      props.class
    )}>
      <canvas
        ref={canvasRef}
        class="graph-canvas w-full h-full"
        aria-label="Topic relationship graph — drag nodes to explore"
        onMouseMove={onMouseMove}
        onMouseDown={onMouseDown}
        onMouseUp={onMouseUp}
        onMouseLeave={() => setHovered(null)}
      />
      <div class="absolute bottom-3 right-3 text-xs text-brand-muted/70 bg-white/80 px-2 py-1 rounded-lg border border-brand-border/50 backdrop-blur-sm select-none pointer-events-none">
        Click a node to explore
      </div>
    </div>
  );
}
