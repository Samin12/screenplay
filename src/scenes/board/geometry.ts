import type { BoardNode } from '../../types';
import { easeInOut } from '../../lib/anim';

// World-canvas geometry for the board fly-through: node placement, the connector curves between
// consecutive nodes, and a 2D camera that is a pure function of the frame.
// Reference (seg1 B4 / C): fly-to 0.8–1.0 s cubic ease-in-out with the scale dipping to ~0.6x
// mid-flight, then zooming in; 2–3 % slow idle zoom between moves.

export const NODE_W = 1300;
export const NODE_H = 750;
export const STEP_X = NODE_W + 950; // auto layout: centre-to-centre distance along the path
const MEANDER = [0, -620, 260, -470, 540, -260, 400, -560, 180];

export type Pt = { x: number; y: number };
export type Placed = { node: BoardNode; i: number; cx: number; cy: number; s: number; arrive: number };

const isAuto = (n: BoardNode) => !n.x && !n.y;

// Nodes keep the authored order; they are visited in that order at their `frame`.
export function placeNodes(nodes: BoardNode[]): Placed[] {
  const allAuto = nodes.every(isAuto);
  const out: Placed[] = [];
  nodes.forEach((node, i) => {
    let cx = node.x;
    let cy = node.y;
    if (allAuto) {
      cx = i * STEP_X;
      cy = MEANDER[i % MEANDER.length];
    } else if (isAuto(node) && i > 0) {
      const p = out[i - 1];
      cx = p.cx + STEP_X;
      cy = p.cy + (i % 2 ? -1 : 1) * 520;
    }
    const prevArrive = i > 0 ? out[i - 1].arrive : 0;
    out.push({ node, i, cx, cy, s: node.scale > 0 ? node.scale : 1, arrive: Math.max(prevArrive, Math.round(node.frame)) });
  });
  return out;
}

// ---------- cubic Bézier with an arc-length table ----------

export type Cubic = [Pt, Pt, Pt, Pt];

const bez = (c: Cubic, u: number): Pt => {
  const v = 1 - u;
  const a = v * v * v;
  const b = 3 * v * v * u;
  const d = 3 * v * u * u;
  const e = u * u * u;
  return { x: a * c[0].x + b * c[1].x + d * c[2].x + e * c[3].x, y: a * c[0].y + b * c[1].y + d * c[2].y + e * c[3].y };
};

const lerpPt = (a: Pt, b: Pt, u: number): Pt => ({ x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u });

// The first part [0, u] of the curve (de Casteljau split).
export function splitCubic(c: Cubic, u: number): Cubic {
  const p01 = lerpPt(c[0], c[1], u);
  const p12 = lerpPt(c[1], c[2], u);
  const p23 = lerpPt(c[2], c[3], u);
  const a = lerpPt(p01, p12, u);
  const b = lerpPt(p12, p23, u);
  return [c[0], p01, a, lerpPt(a, b, u)];
}

const SAMPLES = 64;
export type Path = { c: Cubic; len: number; table: number[] };

export function makePath(c: Cubic): Path {
  const table = [0];
  let prev = c[0];
  for (let k = 1; k <= SAMPLES; k++) {
    const p = bez(c, k / SAMPLES);
    table.push(table[k - 1] + Math.hypot(p.x - prev.x, p.y - prev.y));
    prev = p;
  }
  return { c, len: table[SAMPLES], table };
}

// Curve parameter at a fraction of the arc length.
export function paramAt(path: Path, frac: number): number {
  const target = Math.max(0, Math.min(1, frac)) * path.len;
  let lo = 0;
  let hi = SAMPLES;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (path.table[mid] < target) lo = mid;
    else hi = mid;
  }
  const seg = path.table[hi] - path.table[lo] || 1;
  return (lo + (target - path.table[lo]) / seg) / SAMPLES;
}

export const cubicD = (c: Cubic) => `M${c[0].x.toFixed(1)},${c[0].y.toFixed(1)} C${c[1].x.toFixed(1)},${c[1].y.toFixed(1)} ${c[2].x.toFixed(1)},${c[2].y.toFixed(1)} ${c[3].x.toFixed(1)},${c[3].y.toFixed(1)}`;

export const pointAt = (path: Path, frac: number) => bez(path.c, paramAt(path, frac));

// Connector from node a to node b: leaves a's box on the side facing b and enters b's opposite side,
// with tangents perpendicular to those sides (an S-curve when the rows differ).
export function connector(a: Placed, b: Placed): Cubic {
  const dx = b.cx - a.cx;
  const dy = b.cy - a.cy;
  const horiz = Math.abs(dx) / NODE_W >= Math.abs(dy) / NODE_H;
  if (horiz) {
    const sx = Math.sign(dx) || 1;
    const p0 = { x: a.cx + (sx * NODE_W) / 2, y: a.cy };
    const p3 = { x: b.cx - (sx * NODE_W) / 2, y: b.cy };
    const k = Math.max(160, Math.abs(p3.x - p0.x) * 0.55);
    return [p0, { x: p0.x + sx * k, y: p0.y }, { x: p3.x - sx * k, y: p3.y }, p3];
  }
  const sy = Math.sign(dy) || 1;
  const p0 = { x: a.cx, y: a.cy + (sy * NODE_H) / 2 };
  const p3 = { x: b.cx, y: b.cy - (sy * NODE_H) / 2 };
  const k = Math.max(160, Math.abs(p3.y - p0.y) * 0.55);
  return [p0, { x: p0.x, y: p0.y + sy * k }, { x: p3.x, y: p3.y - sy * k }, p3];
}

// A short lead-in that arrives at the first node from the left, and a tail that leaves the last one.
export function leadIn(a: Placed): Cubic {
  const p3 = { x: a.cx - NODE_W / 2, y: a.cy };
  const p0 = { x: p3.x - 1150, y: p3.y + 230 };
  return [p0, { x: p0.x + 600, y: p0.y }, { x: p3.x - 520, y: p3.y }, p3];
}

export function tailOut(a: Placed): Cubic {
  const p0 = { x: a.cx + NODE_W / 2, y: a.cy };
  const p3 = { x: p0.x + 1150, y: p0.y - 260 };
  return [p0, { x: p0.x + 520, y: p0.y }, { x: p3.x - 600, y: p3.y }, p3];
}

// ---------- camera ----------

export type Camera = { x: number; y: number; s: number };
export type Flight = { to: number; start: number; dur: number }; // flight into node `to`

export function flights(placed: Placed[], fps: number): Flight[] {
  const out: Flight[] = [];
  const full = Math.round(0.9 * fps);
  for (let i = 1; i < placed.length; i++) {
    const gap = placed[i].arrive - placed[i - 1].arrive;
    if (gap <= 0) continue; // same frame: cut straight there
    const dur = Math.min(full, gap);
    out.push({ to: i, start: placed[i].arrive - dur, dur });
  }
  return out;
}

const IDLE_ZOOM = 0.03;
const idle = (dt: number, fps: number) => (dt <= 0 ? 0 : IDLE_ZOOM * (1 - Math.exp(-dt / (2.6 * fps))));

function holdAt(p: Placed, f: number, fps: number): Camera {
  return { x: p.cx, y: p.cy, s: p.s * (1 + idle(f - p.arrive, fps)) };
}

// Frame -> camera, plus the eased progress of the flight in progress (for the progress line).
export function cameraAt(f: number, placed: Placed[], fl: Flight[], fps: number, viewW: number): { cam: Camera; flight: Flight | null; e: number } {
  if (!placed.length) return { cam: { x: 0, y: 0, s: 1 }, flight: null, e: 0 };
  const first = placed[0];
  // Before the first arrival: a slow push in onto the first node.
  if (f < first.arrive) {
    const e = easeInOut(Math.max(0, Math.min(1, f / Math.max(1, first.arrive))));
    return { cam: { x: first.cx, y: first.cy, s: first.s * (0.84 + 0.16 * e) }, flight: null, e: 0 };
  }
  let cur: Flight | null = null;
  for (const x of fl) if (x.start <= f) cur = x;
  const last = cur ? cur.to : 0;
  // Holding on the latest node we reached (cur is a finished flight, or none yet).
  if (!cur || f >= placed[cur.to].arrive) {
    let at = 0;
    for (let i = 0; i < placed.length; i++) if (placed[i].arrive <= f) at = i;
    return { cam: holdAt(placed[Math.max(at, last)], f, fps), flight: null, e: 1 };
  }
  const to = placed[cur.to];
  const from = placed[cur.to - 1];
  const a = holdAt(from, cur.start, fps);
  const t = (f - cur.start) / cur.dur;
  const e = easeInOut(t);
  const dist = Math.hypot(to.cx - a.x, to.cy - a.y);
  // Mid-flight the view widens until both boxes are roughly in frame (≈0.6x for a normal hop).
  const base = Math.sqrt(a.s * to.s);
  const dip = Math.max(0.3, Math.min(0.85, (viewW * 1.1) / (dist + NODE_W) / base));
  const bump = (1 - Math.cos(2 * Math.PI * t)) / 2;
  const logS = Math.log(a.s) + (Math.log(to.s) - Math.log(a.s)) * e + Math.log(dip) * bump;
  return { cam: { x: a.x + (to.cx - a.x) * e, y: a.y + (to.cy - a.y) * e, s: Math.exp(logS) }, flight: cur, e };
}
