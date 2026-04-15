import {
  createSignal,
  onMount,
  onCleanup,
  createEffect,
} from "solid-js";
import { useNavigate } from "@solidjs/router";
import clsx from "clsx";
import type { TopicNode, TopicEdge } from "~/lib/topics";

// ── Force-directed graph (self-contained, no external deps) ──

interface GraphNode extends TopicNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  pinned?: boolean;
}

interface GraphPanelProps {
  nodes: TopicNode[];
  edges: TopicEdge[];
  centerNodeId: string;
  class?: string;
}

const COLORS = [
  "#2DD4BF",
  "#8B5CF6",
  "#F59E0B",
  "#EC4899",
  "#3B82F6",
  "#10B981",
  "#F97316",
  "#6366F1",
];

export function GraphPanel(props: GraphPanelProps) {
  const navigate = useNavigate();
  let canvasRef: HTMLCanvasElement | undefined;
  let animFrameId: number;
  let simNodes: GraphNode[] = [];

  const [hoveredNode, setHoveredNode] = createSignal<string | null>(null);
  const [dimensions, setDimensions] = createSignal({ w: 400, h: 360 });

  // Build simulation nodes
  function initNodes() {
    const { w, h } = dimensions();
    simNodes = props.nodes.map((n, i) => {
      const angle = (i / props.nodes.length) * Math.PI * 2;
      const radius = n.id === props.centerNodeId ? 0 : 110 + Math.random() * 40;
      return {
        ...n,
        x: w / 2 + Math.cos(angle) * radius,
        y: h / 2 + Math.sin(angle) * radius,
        vx: 0,
        vy: 0,
        pinned: n.id === props.centerNodeId,
      };
    });
  }

  function tick() {
    const { w, h } = dimensions();
    const cx = w / 2;
    const cy = h / 2;

    for (const node of simNodes) {
      if (node.pinned) {
        node.x = cx;
        node.y = cy;
        continue;
      }

      // Repulsion from other nodes
      for (const other of simNodes) {
        if (other.id === node.id) continue;
        const dx = node.x - other.x;
        const dy = node.y - other.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = 2200 / (dist * dist);
        node.vx += (dx / dist) * force;
        node.vy += (dy / dist) * force;
      }

      // Edge attraction
      for (const edge of props.edges) {
        const isConnected =
          edge.source === node.id || edge.target === node.id;
        if (!isConnected) continue;
        const otherId = edge.source === node.id ? edge.target : edge.source;
        const other = simNodes.find((n) => n.id === otherId);
        if (!other) continue;
        const dx = other.x - node.x;
        const dy = other.y - node.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const strength = (edge.strength ?? 0.5) * 0.04;
        node.vx += dx * strength;
        node.vy += dy * strength;
      }

      // Center gravity (weak pull to center)
      node.vx += (cx - node.x) * 0.008;
      node.vy += (cy - node.y) * 0.008;

      // Damping
      node.vx *= 0.82;
      node.vy *= 0.82;

      node.x += node.vx;
      node.y += node.vy;

      // Boundary
      const pad = 32;
      node.x = Math.max(pad, Math.min(w - pad, node.x));
      node.y = Math.max(pad, Math.min(h - pad, node.y));
    }
  }

  function draw() {
    const canvas = canvasRef;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { w, h } = dimensions();

    // HiDPI
    const dpr = window.devicePixelRatio || 1;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, w, h);

    // Draw edges
    for (const edge of props.edges) {
      const src = simNodes.find((n) => n.id === edge.source);
      const tgt = simNodes.find((n) => n.id === edge.target);
      if (!src || !tgt) continue;

      const isHighlighted =
        hoveredNode() === edge.source || hoveredNode() === edge.target;

      ctx.beginPath();
      ctx.moveTo(src.x, src.y);
      ctx.lineTo(tgt.x, tgt.y);
      ctx.strokeStyle = isHighlighted
        ? "rgba(45,212,191,0.5)"
        : "rgba(229,231,235,0.9)";
      ctx.lineWidth = isHighlighted ? 1.5 : 1;
      ctx.stroke();
    }

    // Draw nodes
    for (let i = 0; i < simNodes.length; i++) {
      const node = simNodes[i];
      const isCenter = node.id === props.centerNodeId;
      const isHovered = hoveredNode() === node.id;
      const weight = node.weight ?? 1;
      const radius = isCenter ? 20 : 8 + weight * 4;

      const color = isCenter ? "#2DD4BF" : COLORS[i % COLORS.length];

      // Shadow on hover
      if (isHovered || isCenter) {
        ctx.shadowBlur = isCenter ? 16 : 10;
        ctx.shadowColor = color + "66";
      }

      // Node circle
      ctx.beginPath();
      ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = isCenter
        ? "#2DD4BF"
        : isHovered
        ? color
        : color + "CC";
      ctx.fill();

      if (!isCenter) {
        ctx.strokeStyle = "white";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      ctx.shadowBlur = 0;
      ctx.shadowColor = "transparent";

      // Label
      const fontSize = isCenter ? 13 : isHovered ? 12 : 11;
      ctx.font = `${isCenter ? 600 : 500} ${fontSize}px Inter, sans-serif`;
      ctx.fillStyle = isCenter
        ? "#0F172A"
        : isHovered
        ? "#111111"
        : "#6B7280";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      const labelY = isCenter
        ? node.y + radius + 14
        : node.y + radius + 12;

      ctx.fillText(node.label, node.x, labelY);
    }
  }

  function loop() {
    tick();
    draw();
    animFrameId = requestAnimationFrame(loop);
  }

  function getNodeAt(mx: number, my: number): GraphNode | undefined {
    const rect = canvasRef?.getBoundingClientRect();
    if (!rect) return;
    const x = mx - rect.left;
    const y = my - rect.top;
    for (const node of simNodes) {
      const weight = node.weight ?? 1;
      const r = node.id === props.centerNodeId ? 20 : 8 + weight * 4;
      const dx = x - node.x;
      const dy = y - node.y;
      if (Math.sqrt(dx * dx + dy * dy) <= r + 4) return node;
    }
  }

  let dragNode: GraphNode | null = null;
  let dragOffset = { x: 0, y: 0 };

  function handleMouseMove(e: MouseEvent) {
    if (dragNode) {
      const rect = canvasRef!.getBoundingClientRect();
      dragNode.x = e.clientX - rect.left - dragOffset.x;
      dragNode.y = e.clientY - rect.top - dragOffset.y;
      dragNode.vx = 0;
      dragNode.vy = 0;
    }
    const hit = getNodeAt(e.clientX, e.clientY);
    setHoveredNode(hit?.id ?? null);
    if (canvasRef) {
      canvasRef.style.cursor = hit ? "pointer" : "grab";
    }
  }

  function handleMouseDown(e: MouseEvent) {
    const hit = getNodeAt(e.clientX, e.clientY);
    if (hit) {
      dragNode = hit;
      const rect = canvasRef!.getBoundingClientRect();
      dragOffset = {
        x: e.clientX - rect.left - hit.x,
        y: e.clientY - rect.top - hit.y,
      };
    }
  }

  function handleMouseUp(e: MouseEvent) {
    const wasDragging = dragNode;
    dragNode = null;
    if (canvasRef) canvasRef.style.cursor = "grab";

    // Click (not drag) → navigate
    if (wasDragging) {
      const hit = getNodeAt(e.clientX, e.clientY);
      if (hit && hit !== wasDragging) return;
      if (hit && hit.id !== props.centerNodeId) {
        const slug = hit.id.toLowerCase().replace(/\s+/g, "-");
        navigate(`/topic/${slug}`);
      }
    }
  }

  onMount(() => {
    const resize = () => {
      if (!canvasRef) return;
      const parent = canvasRef.parentElement!;
      setDimensions({ w: parent.clientWidth, h: parent.clientHeight });
      initNodes();
    };

    const ro = new ResizeObserver(resize);
    if (canvasRef?.parentElement) ro.observe(canvasRef.parentElement);
    resize();
    loop();

    onCleanup(() => {
      cancelAnimationFrame(animFrameId);
      ro.disconnect();
    });
  });

  // Re-init when nodes change
  createEffect(() => {
    props.nodes;
    initNodes();
  });

  return (
    <div
      class={clsx(
        "relative w-full h-full min-h-[320px] rounded-xl overflow-hidden",
        "bg-gradient-to-br from-brand-bg to-white",
        "border border-brand-border",
        props.class
      )}
    >
      <canvas
        ref={canvasRef}
        class="graph-canvas w-full h-full"
        aria-label="Topic relationship graph — drag nodes to explore"
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => setHoveredNode(null)}
      />

      {/* Legend hint */}
      <div class="absolute bottom-3 right-3 text-xs text-brand-muted/70 bg-white/80 px-2 py-1 rounded-lg border border-brand-border/50 backdrop-blur-sm select-none pointer-events-none">
        Click a node to explore
      </div>
    </div>
  );
}
