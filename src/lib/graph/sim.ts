// Shared physics and hit-test for force-directed graph canvases.

export interface SimNode {
  id: string;
  label: string;
  slug?: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  isPrimary: boolean;
  color: string;
  pinned?: boolean;
}

export interface SimEdge { a: string; b: string; }

export interface TickOptions {
  repulsion: number;
  primaryBoost: number;    // multiplier applied to repulsion for primary nodes
  springStrength: number;
  idealLength: number;     // 0 = simple spring (no ideal distance)
  gravity: number;
  damping: number;
  padding: number;
}

export const PANEL_OPTS: TickOptions = {
  repulsion: 2200, primaryBoost: 1,
  springStrength: 0.02, idealLength: 0,
  gravity: 0.008, damping: 0.82, padding: 32,
};

export const LANDING_OPTS: TickOptions = {
  repulsion: 1800, primaryBoost: 2.2,
  springStrength: 0.022, idealLength: 130,
  gravity: 0.004, damping: 0.78, padding: 64,
};

export function tickNodes(
  nodes: SimNode[],
  edges: SimEdge[],
  nodeMap: Map<string, SimNode>,
  w: number,
  h: number,
  dragNode: SimNode | null,
  opts: TickOptions,
): void {
  const cx = w / 2, cy = h / 2;

  for (const node of nodes) {
    if (node.pinned) { node.x = cx; node.y = cy; continue; }
    if (node === dragNode) continue;

    for (const other of nodes) {
      if (other === node) continue;
      const dx = node.x - other.x, dy = node.y - other.y;
      const distSq = dx * dx + dy * dy + 1;
      const dist = Math.sqrt(distSq);
      const rep = node.isPrimary ? opts.repulsion * opts.primaryBoost : opts.repulsion;
      node.vx += (dx / dist) * (rep / distSq);
      node.vy += (dy / dist) * (rep / distSq);
    }

    for (const edge of edges) {
      const isA = edge.a === node.id, isB = edge.b === node.id;
      if (!isA && !isB) continue;
      const other = nodeMap.get(isA ? edge.b : edge.a);
      if (!other) continue;
      const dx = other.x - node.x, dy = other.y - node.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      if (opts.idealLength > 0) {
        const stretch = (dist - opts.idealLength) / dist;
        node.vx += dx * stretch * opts.springStrength;
        node.vy += dy * stretch * opts.springStrength;
      } else {
        node.vx += dx * opts.springStrength;
        node.vy += dy * opts.springStrength;
      }
    }

    node.vx += (cx - node.x) * opts.gravity;
    node.vy += (cy - node.y) * opts.gravity;
    node.vx *= opts.damping;
    node.vy *= opts.damping;
    node.x += node.vx;
    node.y += node.vy;
    node.x = Math.max(opts.padding, Math.min(w - opts.padding, node.x));
    node.y = Math.max(opts.padding, Math.min(h - opts.padding, node.y));
  }
}

export function nodeAt(
  nodes: SimNode[],
  clientX: number,
  clientY: number,
  canvas: HTMLCanvasElement,
): SimNode | undefined {
  const rect = canvas.getBoundingClientRect();
  const x = clientX - rect.left, y = clientY - rect.top;
  return nodes.find(n => {
    const dx = x - n.x, dy = y - n.y;
    return Math.sqrt(dx * dx + dy * dy) <= n.r + 6;
  });
}
