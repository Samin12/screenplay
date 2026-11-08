import type { StoryActor, StoryBeat } from '../../../types';
import { pop } from '../../../lib/anim';
import { STORY_H, STORY_MS, STORY_W } from './spec';

// The story's state at any frame, folded from its beats. Pure: Remotion renders frames out of order.

export const inOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
export const outCubic = (x: number) => 1 - Math.pow(1 - x, 3);
const inCubic = (x: number) => x * x * x;
const lin = (x: number) => x;
export const c01 = (x: number) => Math.max(0, Math.min(1, x));
export const msF = (ms: number, fps: number) => Math.max(1, Math.round((ms / 1000) * fps));
// Rises over `d` frames after a, falls over `d` frames before b.
export const windowEnv = (f: number, a: number, b: number, d: number) => Math.min(c01((f - a) / d), c01((b - f) / d));

type Seg = { f0: number; f1: number; from: number[]; to: number[]; ease: (x: number) => number };

// The latest segment that has started wins; it starts from wherever the previous ones had got to.
function evalSegs(start: number[], segs: Seg[], f: number): number[] {
  let cur: Seg | undefined;
  for (const s of segs) {
    if (s.f0 > f) break;
    cur = s;
  }
  if (!cur) return start;
  if (f >= cur.f1) return cur.to;
  const c = cur;
  const k = c.ease((f - c.f0) / Math.max(1, c.f1 - c.f0));
  return c.from.map((v, i) => v + (c.to[i] - v) * k);
}

export type Vis = { o: number; blur: number; scale: number; drawn: number };
const SHOWN: Vis = { o: 1, blur: 0, scale: 1, drawn: 1 };
const HIDDEN: Vis = { o: 0, blur: 0, scale: 1, drawn: 0 };

export type Cam = { cx: number; cy: number; s: number };
const FULL: Cam = { cx: STORY_W / 2, cy: STORY_H / 2, s: 1 };
type Follow = { frame: number; actor?: string; rect?: [number, number, number, number]; scale?: number };

export class StorySim {
  readonly byId: Map<string, StoryActor>;
  readonly beats: StoryBeat[];
  readonly fps: number;
  private of = new Map<string, StoryBeat[]>();
  private posSegs = new Map<string, Seg[]>();
  private valSegs = new Map<string, Seg[]>();
  private busy = new Set<string>();
  private follows: Follow[] = [];

  constructor(actors: StoryActor[], beats: StoryBeat[], fps: number) {
    this.fps = fps;
    this.beats = [...beats].sort((a, b) => a.frame - b.frame);
    this.byId = new Map(actors.map((a) => [a.id, a]));
    for (const b of this.beats) {
      if ('actor' in b && b.actor) {
        if (!this.of.has(b.actor)) this.of.set(b.actor, []);
        this.of.get(b.actor)!.push(b);
      }
      if (b.do === 'follow') {
        this.follows.push({ frame: b.frame, actor: b.actor, rect: b.rect, scale: b.scale });
        if (b.dur !== undefined) this.follows.push({ frame: b.frame + b.dur });
      }
    }
    this.follows.sort((a, b) => a.frame - b.frame);
  }

  private beatsOf(id: string) {
    return this.of.get(id) ?? [];
  }

  // ----- position -----
  private segs(id: string): Seg[] {
    const hit = this.posSegs.get(id);
    if (hit) return hit;
    const a = this.byId.get(id);
    if (!a || this.busy.has(id)) return [];
    this.busy.add(id);
    const segs: Seg[] = [];
    const start = [a.x, a.y];
    for (const b of this.beatsOf(id)) {
      if (b.do === 'enter' && b.pos) segs.push({ f0: b.frame, f1: b.frame, from: b.pos, to: b.pos, ease: lin });
      if (b.do !== 'move') continue;
      const from = evalSegs(start, segs, b.frame);
      let to = from;
      if (b.by) to = [from[0] + b.by[0], from[1] + b.by[1]];
      else if (Array.isArray(b.to)) to = [b.to[0], b.to[1]];
      else if (typeof b.to === 'string') to = this.pos(b.to, b.frame + b.dur);
      if (b.offset && typeof b.to === 'string') to = [to[0] + b.offset[0], to[1] + b.offset[1]];
      segs.push({ f0: b.frame, f1: b.frame + b.dur, from, to, ease: inOut });
    }
    this.busy.delete(id);
    this.posSegs.set(id, segs);
    return segs;
  }

  pos(id: string, f: number): [number, number] {
    const a = this.byId.get(id);
    if (!a) return [STORY_W / 2, STORY_H / 2];
    if (a.kind === 'bubble' && a.on) return this.pos(a.on, f);
    const p = evalSegs([a.x, a.y], this.segs(id), f);
    return [p[0], p[1]];
  }

  // ----- numbers: counters, taxi meters, stacks (count), meters (fill) -----
  private startValue(a: StoryActor) {
    return (a.kind === 'stack' ? a.count : a.value) ?? 0;
  }

  private vsegs(id: string): Seg[] {
    const hit = this.valSegs.get(id);
    if (hit) return hit;
    const a = this.byId.get(id)!;
    const start = [this.startValue(a)];
    const segs: Seg[] = [];
    for (const b of this.beatsOf(id)) {
      if (b.do === 'count' || b.do === 'fill') {
        const from = evalSegs(start, segs, b.frame);
        segs.push({ f0: b.frame, f1: b.frame + b.dur, from, to: [b.to], ease: b.do === 'count' && b.ease === 'linear' ? lin : inOut });
      } else if (b.do === 'swap') {
        const v = a.kind === 'stack' ? b.set.count : b.set.value;
        if (v !== undefined) segs.push({ f0: b.frame, f1: b.frame, from: [v], to: [v], ease: lin });
      }
    }
    this.valSegs.set(id, segs);
    return segs;
  }

  value(id: string, f: number): number {
    const a = this.byId.get(id);
    if (!a) return 0;
    return evalSegs([this.startValue(a)], this.vsegs(id), f)[0];
  }

  // ----- fields changed by swap -----
  fields(id: string, f: number): { a: StoryActor; swapAt?: number } {
    let a = this.byId.get(id)!;
    let swapAt: number | undefined;
    for (const b of this.beatsOf(id)) {
      if (b.frame > f) break;
      if (b.do === 'swap') {
        a = { ...a, ...b.set };
        swapAt = b.frame;
      }
    }
    return { a, swapAt };
  }

  // ----- on stage? -----
  vis(id: string, f: number): Vis {
    const a = this.byId.get(id);
    if (!a) return HIDDEN;
    let last: StoryBeat | undefined;
    let before = !a.hidden;
    for (const b of this.beatsOf(id)) {
      if (b.frame > f) break;
      if (b.do !== 'enter' && b.do !== 'exit') continue;
      if (last) before = last.do === 'enter';
      last = b;
    }
    if (!last) return a.hidden ? HIDDEN : SHOWN;
    const fps = this.fps;
    const d = f - last.frame;
    if (last.do === 'exit') {
      if (!before) return HIDDEN;
      const p = c01(d / msF(STORY_MS.exit, fps));
      return { o: 1 - inCubic(p), blur: 14 * p, scale: 1, drawn: 1 };
    }
    if (before) return SHOWN;
    if (a.kind === 'arrow' || a.kind === 'path') return { o: 1, blur: 0, scale: 1, drawn: outCubic(c01(d / msF(STORY_MS.draw, fps))) };
    if (a.kind === 'sticker') {
      // the house sticker: 0.3 -> ~1.07 -> 1 in 250 ms (the one thing that bounces)
      const k = pop(f, fps, last.frame, 250, 1.07);
      return { o: c01(d / msF(100, fps)), blur: 0, scale: 0.3 + 0.7 * k, drawn: 1 };
    }
    const style = (last.do === 'enter' ? last.style : undefined) ?? (a.kind === 'badge' ? 'pop' : 'blur');
    if (style === 'pop') {
      const p = outCubic(c01(d / msF(STORY_MS.pop, fps)));
      return { o: c01(d / msF(STORY_MS.pop * 0.5, fps)), blur: 10 * (1 - p), scale: 0.72 + 0.28 * p, drawn: 1 };
    }
    const p = outCubic(c01(d / msF(STORY_MS.enter, fps)));
    return { o: p, blur: 14 * (1 - p), scale: 0.96 + 0.04 * p, drawn: 1 };
  }

  // ----- emphasis -----
  highlight(id: string, f: number): number {
    const d = msF(STORY_MS.fade, this.fps);
    let e = 0;
    for (const b of this.beatsOf(id)) if (b.do === 'highlight') e = Math.max(e, windowEnv(f, b.frame, b.frame + b.dur, d));
    return e;
  }

  // 0..1 progress of the latest pulse, or -1.
  pulse(id: string, f: number): number {
    const d = msF(STORY_MS.pulse, this.fps);
    let k = -1;
    for (const b of this.beatsOf(id)) if (b.do === 'pulse' && f >= b.frame && f < b.frame + d) k = (f - b.frame) / d;
    return k;
  }

  shake(id: string, f: number): number {
    const d = msF(STORY_MS.shake, this.fps);
    let dx = 0;
    for (const b of this.beatsOf(id)) {
      if (b.do !== 'shake' || f < b.frame || f >= b.frame + d) continue;
      const k = (f - b.frame) / d;
      dx = 16 * Math.sin(k * Math.PI * 2 * 3) * (1 - k);
    }
    return dx;
  }

  // How far `ids` are dimmed (0..1) by `dim` beats that keep other actors lit. Lit if any id is kept.
  dim(ids: string[], f: number): number {
    const d = msF(STORY_MS.fade, this.fps);
    let e = 0;
    for (const b of this.beats) {
      if (b.do !== 'dim' || ids.some((id) => b.keep.includes(id))) continue;
      e = Math.max(e, windowEnv(f, b.frame, b.frame + b.dur, d));
    }
    return e;
  }

  // Speech bubbles from `say` beats that are up (or fading) at f: p = in progress, q = out progress.
  says(f: number) {
    const out: { beat: Extract<StoryBeat, { do: 'say' }>; p: number; q: number }[] = [];
    const inF = msF(STORY_MS.bubbleIn, this.fps);
    const outF = msF(STORY_MS.bubbleOut, this.fps);
    for (const b of this.beats) {
      if (b.do !== 'say' || f < b.frame || f > b.frame + b.dur + outF) continue;
      out.push({ beat: b, p: outCubic(c01((f - b.frame) / inF)), q: c01((f - b.frame - b.dur) / outF) });
    }
    return out;
  }

  // ----- camera -----
  private camTarget(k: Follow, f: number): Cam {
    if (k.rect) {
      const [x, y, w, h] = k.rect;
      return { cx: x + w / 2, cy: y + h / 2, s: k.scale ?? Math.max(1, Math.min(3, Math.min(STORY_W / w, STORY_H / h) * 0.92)) };
    }
    if (k.actor) {
      const [x, y] = this.pos(k.actor, f);
      return { cx: x, cy: y, s: k.scale ?? 1.6 };
    }
    return FULL;
  }

  private camIdx(i: number, f: number): Cam {
    if (i < 0) return FULL;
    const k = this.follows[i];
    const from = this.camIdx(i - 1, k.frame);
    const to = this.camTarget(k, f);
    const p = inOut(c01((f - k.frame) / msF(STORY_MS.camera, this.fps)));
    return { cx: from.cx + (to.cx - from.cx) * p, cy: from.cy + (to.cy - from.cy) * p, s: from.s + (to.s - from.s) * p };
  }

  camera(f: number): Cam {
    let i = -1;
    while (i + 1 < this.follows.length && this.follows[i + 1].frame <= f) i++;
    const c = this.camIdx(i, f);
    const s = Math.max(1, c.s);
    const hw = STORY_W / (2 * s);
    const hh = STORY_H / (2 * s);
    return { s, cx: Math.max(hw, Math.min(STORY_W - hw, c.cx)), cy: Math.max(hh, Math.min(STORY_H - hh, c.cy)) };
  }
}
