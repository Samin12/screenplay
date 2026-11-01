import type { Action, AppScene, Rect } from '../types';
import type { UiState } from './replica';
import { easeInOut, msToFrames, progress } from '../lib/anim';
import { motion } from '../theme/tokens';

// Pure, deterministic functions of (scene, frame). Nothing here touches the DOM.

export type Rects = Record<string, Rect>;
export type Point = { x: number; y: number };

const typeActions = (s: AppScene) => s.actions.filter((a): a is Extract<Action, { do: 'type' }> => a.do === 'type');

// Frames where the UI state changes discretely. Each one gets its own measurement.
export function stateBoundaries(scene: AppScene): number[] {
  const b = new Set<number>([0]);
  for (const a of scene.actions) {
    if ((a.do === 'set' || a.do === 'click') && 'set' in a && a.set) b.add(a.frame);
    // Re-measure once a scroll settles so later beats point at where things ended up.
    if (a.do === 'tween') b.add(a.end);
  }
  return [...b].sort((x, y) => x - y);
}

export const boundaryIndex = (bounds: number[], frame: number) => {
  let i = 0;
  while (i + 1 < bounds.length && bounds[i + 1] <= frame) i++;
  return i;
};

export function stateAt(scene: AppScene, base: Record<string, unknown>, frame: number, fullTyping = false): Record<string, unknown> {
  const st: Record<string, unknown> = { ...base, ...scene.state };
  const ordered = [...scene.actions].sort((a, b) => a.frame - b.frame);
  for (const a of ordered) {
    if (a.frame > frame) break;
    if ((a.do === 'set' || a.do === 'click') && a.set) Object.assign(st, a.set);
    if (a.do === 'type') {
      const n = fullTyping ? a.text.length : Math.floor(a.text.length * Math.min(1, (frame - a.frame + 1) / Math.max(1, a.end - a.frame)));
      st[a.key] = a.text.slice(0, n);
    }
    if (a.do === 'tween') {
      const from = a.from ?? (typeof st[a.key] === 'number' ? (st[a.key] as number) : 0);
      const t = easeInOut(Math.min(1, (frame - a.frame) / Math.max(1, a.end - a.frame)));
      st[a.key] = from + (a.to - from) * t;
    }
  }
  return st;
}

// State used to measure boundary i: typing that starts before the next boundary is shown complete,
// so a lifted composer is sized for its final text.
export function measureState(scene: AppScene, base: Record<string, unknown>, bounds: number[], i: number) {
  const next = bounds[i + 1] ?? Number.POSITIVE_INFINITY;
  const st = stateAt(scene, base, bounds[i]);
  for (const a of typeActions(scene)) if (a.frame < next && a.frame >= bounds[i]) st[a.key] = a.text;
  return st;
}

export function rectFor(all: Rects[], bounds: number[], frame: number, target: string): Rect | undefined {
  const i = boundaryIndex(bounds, frame);
  if (all[i]?.[target]) return all[i][target];
  // Fall back to the nearest boundary that has it (e.g. a menu item that only exists after a click).
  for (let d = 1; d < all.length; d++) {
    if (all[i - d]?.[target]) return all[i - d][target];
    if (all[i + d]?.[target]) return all[i + d][target];
  }
  return undefined;
}

export const center = (r: Rect): Point => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });

// ---------------- Camera ----------------

export type Cam = { scale: number; cx: number; cy: number };

export function cameraAt(
  scene: AppScene,
  plate: [number, number],
  lookup: (frame: number, t: string) => Rect | undefined,
  frame: number,
  fps: number,
  frameSize: [number, number] = [1920, 1080],
): Cam {
  const [pw, ph] = plate;
  const fit = Math.min(frameSize[0] / pw, frameSize[1] / ph);
  const focusRect = (t?: string, r?: Rect, f = 0) => r ?? (t ? lookup(f, t) : undefined);
  // Centre on the target; if it is wider/taller than the view, anchor its top-left instead, so
  // left-aligned text (terminals, chats, documents) never loses its first characters.
  const aim = (r: Rect, scale: number) => {
    const vw = frameSize[0] / (fit * scale);
    const vh = frameSize[1] / (fit * scale);
    return { cx: r.w > vw * 0.96 ? r.x - 24 + vw / 2 : center(r).x, cy: r.h > vh * 0.96 ? r.y - 24 + vh / 2 : center(r).y };
  };
  const r0 = focusRect(scene.camera.target, scene.camera.rect, 0);
  const s0 = scene.camera.scale || 1;
  const base: Cam = { scale: s0, ...(r0 ? aim(r0, s0) : { cx: pw / 2, cy: ph / 2 }) };
  let cam = base;
  const dur = msToFrames(motion.camera, fps);
  for (const a of scene.actions) {
    if (a.do !== 'zoom') continue;
    const r = focusRect(a.target, a.rect, a.frame);
    const tgt: Cam = { scale: a.scale, ...(r ? aim(r, a.scale) : { cx: base.cx, cy: base.cy }) };
    const pin = progress(frame, a.frame, dur, easeInOut);
    const pout = a.end < scene.duration ? progress(frame, a.end, dur, easeInOut) : 0;
    if (pin <= 0) continue;
    const from = cam;
    const p = pin * (1 - pout);
    cam = { scale: from.scale + (tgt.scale - from.scale) * p, cx: from.cx + (tgt.cx - from.cx) * p, cy: from.cy + (tgt.cy - from.cy) * p };
  }
  return cam;
}

// Plate -> screen transform for a camera. `fit` maps the whole plate into the frame at scale 1.
export function screenTransform(cam: Cam, plate: [number, number], frameSize: [number, number]) {
  const [pw, ph] = plate;
  const [fw, fh] = frameSize;
  const fit = Math.min(fw / pw, fh / ph);
  const S = fit * cam.scale;
  // Keep the view inside the plate when zoomed in.
  const halfW = fw / 2 / S;
  const halfH = fh / 2 / S;
  const cx = pw * S <= fw ? pw / 2 : Math.min(pw - halfW, Math.max(halfW, cam.cx));
  const cy = ph * S <= fh ? ph / 2 : Math.min(ph - halfH, Math.max(halfH, cam.cy));
  const tx = fw / 2 - cx * S;
  const ty = fh / 2 - cy * S;
  return { S, tx, ty, toScreen: (p: Point): Point => ({ x: p.x * S + tx, y: p.y * S + ty }), rectToScreen: (r: Rect): Rect => ({ x: r.x * S + tx, y: r.y * S + ty, w: r.w * S, h: r.h * S }) };
}

// ---------------- Cursor ----------------

type Waypoint = { target: string; frame: number; click: boolean; tooltip?: string; ring?: boolean };

export type CursorState = {
  visible: boolean;
  p: Point; // plate coords
  hover?: string;
  pressed?: string;
  tooltip?: { text: string; target: string; since: number };
  clickRing?: { target: string; age: number };
};

export function cursorAt(scene: AppScene, lookup: (frame: number, t: string) => Rect | undefined, frame: number, fps: number, plate: [number, number]): CursorState {
  const wps: Waypoint[] = [];
  for (const a of scene.actions) {
    if (a.do === 'move') wps.push({ target: a.target, frame: a.frame, click: false, tooltip: a.tooltip });
    if (a.do === 'click') wps.push({ target: a.target, frame: a.frame, click: true, tooltip: a.tooltip, ring: a.ring });
    if (a.do === 'type' && a.target) wps.push({ target: a.target, frame: a.frame, click: true });
  }
  wps.sort((a, b) => a.frame - b.frame);
  if (wps.length === 0) return { visible: false, p: { x: 0, y: 0 } };

  const dwell = msToFrames(motion.cursorDwell, fps);
  const groupGap = Math.round(5 * fps);
  const appearLead = Math.round(0.6 * fps);
  const linger = Math.round(1.2 * fps);

  // Resolve each waypoint's position and its move window.
  type Leg = Waypoint & { pos: Point; start: number; arrive: number; from: Point };
  const legs: Leg[] = [];
  let prev: Leg | null = null;
  for (const w of wps) {
    const r = lookup(w.frame, w.target);
    if (!r) continue;
    const c = center(r);
    const pos = { x: c.x + Math.min(r.w * 0.08, 10), y: c.y + Math.min(r.h * 0.12, 6) };
    const newGroup = !prev || w.frame - prev.frame > groupGap;
    const from = newGroup ? { x: Math.min(plate[0] - 40, pos.x + 280), y: Math.min(plate[1] - 40, pos.y + 170) } : prev!.pos;
    const dist = Math.hypot(pos.x - from.x, pos.y - from.y);
    const moveF = Math.round(((motion.cursorBase + (dist / motion.cursorSpeed) * 1000) / 1000) * fps);
    const arrive = w.click ? w.frame - dwell : w.frame;
    const earliest = newGroup ? arrive - moveF : prev!.frame + 3;
    const start = Math.max(earliest, arrive - moveF);
    legs.push({ ...w, pos, from, start, arrive: Math.max(arrive, start + 6), ...(newGroup ? { group: true } : {}) } as Leg);
    prev = legs[legs.length - 1];
  }
  if (legs.length === 0) return { visible: false, p: { x: 0, y: 0 } };

  // Which group is live?
  let gStart = 0;
  for (let i = 0; i < legs.length; i++) {
    const isGroupStart = i === 0 || legs[i].frame - legs[i - 1].frame > groupGap;
    if (isGroupStart) gStart = i;
    const next = legs[i + 1];
    const groupEnds = !next || next.frame - legs[i].frame > groupGap;
    if (!groupEnds) continue;
    const appear = legs[gStart].start - appearLead;
    const vanish = legs[i].frame + linger;
    if (frame < appear || frame > vanish) continue;
    // Inside group gStart..i
    for (let k = gStart; k <= i; k++) {
      const L = legs[k];
      const nextL = k < i ? legs[k + 1] : null;
      if (frame < L.start) {
        return idle({ visible: true, p: L.from }, frame, fps);
      }
      if (frame <= L.arrive) {
        const t = easeInOut(Math.min(1, (frame - L.start) / Math.max(1, L.arrive - L.start)));
        return { visible: true, p: { x: L.from.x + (L.pos.x - L.from.x) * t, y: L.from.y + (L.pos.y - L.from.y) * t } };
      }
      if (!nextL || frame < nextL.start) {
        const st: CursorState = { visible: true, p: L.pos, hover: L.target };
        if (L.tooltip && frame >= L.arrive + msToFrames(motion.tooltipDelay, fps) && frame < L.frame + (L.click ? 0 : Math.round(1.5 * fps))) {
          st.tooltip = { text: L.tooltip, target: L.target, since: L.arrive + msToFrames(motion.tooltipDelay, fps) };
        }
        if (L.click && frame >= L.frame && frame < L.frame + 5) st.pressed = L.target;
        if (L.click && L.ring && frame >= L.frame && frame < L.frame + Math.round(0.6 * fps)) st.clickRing = { target: L.target, age: frame - L.frame };
        return frame - L.frame > fps ? idle(st, frame, fps) : st;
      }
    }
  }
  return { visible: false, p: { x: 0, y: 0 } };
}

// Slow drift so a parked cursor never looks frozen.
function idle(st: CursorState, frame: number, fps: number): CursorState {
  const t = frame / fps;
  return { ...st, p: { x: st.p.x + Math.sin(t * 0.9) * 5, y: st.p.y + Math.cos(t * 0.7) * 3 } };
}

export function uiAt(scene: AppScene, cursor: CursorState, frame: number, fps: number): UiState {
  const ui: UiState = { frame, fps, hover: cursor.hover, pressed: cursor.pressed };
  for (const a of typeActions(scene)) if (frame >= a.frame && frame <= a.end + fps) ui.caret = a.key;
  return ui;
}
