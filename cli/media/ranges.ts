// Kept source ranges → output segments → output-time words. Pure (the envelope is passed in).
import { quietest, speechIslands } from './audio.ts';
import type { Island } from './audio.ts';
import type { CutRange, Envelope, OutWord, Segment, Word } from './types.ts';

export type RangeOptions = {
  duration: number; // source duration (seconds)
  maxGap: number; // inter-word gaps longer than this are compressed
  head: number; // silence kept before speech after a compressed gap / cut
  tail: number; // silence kept after speech before a compressed gap / cut
  pad: number; // minimum padding around every kept word
  orphanKeep: number; // unattributed speech islands at least this long inside a gap are kept (untranscribed words)
  joins?: Map<string, number>; // verified cut points (source seconds) for boundaries, keyed by boundaryKey()
};

/** Key of the boundary between adjacent source words x and x + 1. */
export const boundaryKey = (x: number) => `${x}|${x + 1}`;

export const DEFAULT_RANGES: Omit<RangeOptions, 'duration'> = { maxGap: 0.18, head: 0.08, tail: 0.07, pad: 0.04, orphanKeep: 0.6 };

export type Range = { start: number; end: number };

/** Boolean mask of removed words from inclusive ranges (out-of-range ids are ignored). */
export function cutMask(count: number, cuts: CutRange[], keep: CutRange[] = []): boolean[] {
  const mask = new Array<boolean>(count).fill(false);
  for (const c of cuts) for (let k = Math.max(0, c.from); k <= Math.min(count - 1, c.to); k++) mask[k] = true;
  for (const c of keep) for (let k = Math.max(0, c.from); k <= Math.min(count - 1, c.to); k++) mask[k] = false;
  return mask;
}

/**
 * Source ranges to keep. Every run of kept words becomes a range from just before its first word to just
 * after its last (cut points between a kept and a removed word sit at the quietest moment between them);
 * inside a run, every gap between words longer than maxGap is compressed to head + tail seconds.
 * `words` should already be snapped to the audio (audio.snapWords).
 */
export function keptRanges(words: Word[], removed: boolean[], env: Envelope | null, options: Partial<RangeOptions> & { duration: number }): Range[] {
  const o = { ...DEFAULT_RANGES, ...options };
  const islands = env ? speechIslands(env) : [];
  const out: Range[] = [];
  const N = words.length;
  let k = 0;
  while (k < N) {
    if (removed[k]) {
      k++;
      continue;
    }
    const a = k;
    while (k + 1 < N && !removed[k + 1]) k++;
    const b = k;
    k++;

    // Run start.
    let start = Math.max(0, words[a].start - o.head);
    if (a > 0 && o.joins?.has(boundaryKey(a - 1))) start = o.joins.get(boundaryKey(a - 1)) as number;
    else if (a > 0) {
      const prev = words[a - 1]; // removed
      if (words[a].start - prev.end < o.head + o.pad) start = joinPoint(prev, words[a], env, o.pad);
      start = Math.max(start, Math.min(prev.end, words[a].start - o.pad));
    }
    // Run end.
    let end = Math.min(o.duration, words[b].end + o.tail);
    if (b < N - 1 && o.joins?.has(boundaryKey(b))) end = o.joins.get(boundaryKey(b)) as number;
    else if (b < N - 1) {
      const next = words[b + 1]; // removed
      if (next.start - words[b].end < o.tail + o.pad) end = joinPoint(words[b], next, env, o.pad);
      end = Math.min(end, Math.max(next.start, words[b].end + o.pad));
    }
    if (end <= start) end = Math.min(o.duration, start + Math.max(0.05, words[b].end - words[a].start));

    // Compress long gaps inside the run.
    let cur = start;
    for (let m = a; m < b; m++) {
      const g0 = words[m].end;
      const g1 = words[m + 1].start;
      if (g1 - g0 <= o.maxGap) continue;
      // Long unattributed speech inside the gap (an untranscribed word) is kept with its own padding.
      const keepIslands = islands.filter((isl) => isl.start > g0 + o.tail && isl.end < g1 - o.head && isl.end - isl.start >= o.orphanKeep);
      let from = g0;
      for (const isl of [...keepIslands, { start: g1, end: g1 } as Island]) {
        if (isl.start - from > o.maxGap) {
          out.push({ start: cur, end: from + o.tail });
          cur = isl.start - o.head;
        }
        from = isl.end;
      }
    }
    out.push({ start: cur, end });
  }
  return out.filter((r) => r.end - r.start > 0.001);
}

/** Where to cut between a kept and a removed word that sit close together. */
export function joinPoint(x: Word, y: Word, env: Envelope | null, pad: number): number {
  const lo = Math.min(x.end, y.start);
  const hi = Math.max(x.end, y.start);
  if (!env) return (lo + hi) / 2;
  return quietest(env, lo - pad, hi + pad);
}

/**
 * Snaps ranges to the frame grid (so video and audio cut at identical times and stay in sync), merges
 * ranges closer than `mergeGap`, and lays them end to end in output time.
 */
export function buildSegments(ranges: Range[], fps: number, mergeGap = 0.06, duration = Infinity): Segment[] {
  const q = (t: number) => Math.round(t * fps) / fps;
  const maxT = Number.isFinite(duration) ? Math.floor(duration * fps + 1e-6) / fps : Infinity;
  const snapped: Range[] = [];
  for (const r of [...ranges].sort((x, y) => x.start - y.start)) {
    const s = Math.max(0, q(r.start));
    const e = Math.min(maxT, q(r.end));
    if (e - s < 0.5 / fps) continue;
    const last = snapped[snapped.length - 1];
    if (last && s - last.end < mergeGap - 1e-6) last.end = Math.max(last.end, e);
    else snapped.push({ start: s, end: e });
  }
  const segs: Segment[] = [];
  let frames = 0;
  for (const r of snapped) {
    const n = Math.round((r.end - r.start) * fps);
    segs.push({ srcStart: round(r.start), srcEnd: round(r.start + n / fps), outStart: round(frames / fps) });
    frames += n;
  }
  return segs;
}

export function outputDuration(segs: Segment[], fps?: number): number {
  const last = segs[segs.length - 1];
  if (!last) return 0;
  const d = last.outStart + (last.srcEnd - last.srcStart);
  return round(fps ? Math.round(d * fps) / fps : d);
}

/** Source time → output time. `side` decides where a time inside a removed stretch lands. */
export function toOutput(segs: Segment[], t: number, side: 'start' | 'end'): number {
  for (let k = 0; k < segs.length; k++) {
    const s = segs[k];
    if (t >= s.srcStart && t <= s.srcEnd) return s.outStart + (t - s.srcStart);
    if (t < s.srcStart) {
      if (side === 'start' || k === 0) return s.outStart;
      const p = segs[k - 1];
      return p.outStart + (p.srcEnd - p.srcStart);
    }
  }
  return outputDuration(segs);
}

/** Kept words in output time, numbered w0, w1, ... */
export function mapWords(words: Word[], removed: boolean[], segs: Segment[]): OutWord[] {
  const out: OutWord[] = [];
  for (const w of words) {
    if (removed[w.i]) continue;
    let start = toOutput(segs, w.start, 'start');
    let end = toOutput(segs, w.end, 'end');
    const prev = out[out.length - 1];
    if (prev && start < prev.end) start = prev.end;
    if (end < start) end = start;
    out.push({ id: `w${out.length}`, text: w.text, start: round(start), end: round(end), src: w.i });
  }
  return out;
}

/** Output seconds of every join between segments. */
export function joins(segs: Segment[]): number[] {
  return segs.slice(1).map((s) => s.outStart);
}

function round(x: number): number {
  return Math.round(x * 1000) / 1000;
}
