// Listen-free check of cut points inside continuous speech. Whisper's word boundaries inside a phrase are
// only good to ~0.1-0.3 s, which is enough to clip a short cut like "you know" in the wrong place. For each
// cut whose edge has no pause, try the estimate and the nearby dips in the level as cut points, splice the
// audio for each pair, transcribe all splices in one whisper run, and keep the pair whose splice still says
// the kept words and no longer says the removed ones.
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { frameAt, writeWav } from './audio.ts';
import { boundaryKey, joinPoint } from './ranges.ts';
import { normWord } from './text.ts';
import type { Envelope, Word } from './types.ts';
import { log, readJson, run, tool, writeJson } from './util.ts';
import { parseWhisperJson } from './words.ts';

const CONTEXT = 1.8; // seconds of audio kept on each side of a candidate splice
const WINDOW = 0.45; // how far from the estimate a cut point may move

/** A run of removed words between two kept ones. */
export type CutSpan = { r0: number; r1: number; L: number | null; N: number | null };

export function cutSpans(removed: boolean[]): CutSpan[] {
  const out: CutSpan[] = [];
  for (let k = 0; k < removed.length; k++) {
    if (!removed[k]) continue;
    let e = k;
    while (e + 1 < removed.length && removed[e + 1]) e++;
    out.push({ r0: k, r1: e, L: k > 0 ? k - 1 : null, N: e + 1 < removed.length ? e + 1 : null });
    k = e;
  }
  return out;
}

/** A cut point is "tight" when the two words touch and the best cut point is not silent. */
export function isTight(x: Word, y: Word, env: Envelope, pad = 0.04): { tight: boolean; at: number } {
  const at = joinPoint(x, y, env, pad);
  return { tight: y.start - x.end < 0.12 && env.db[frameAt(env, at)] > env.threshold - 3, at };
}

/** Local minima of the level that are at least `depth` dB below the peaks on both sides (within 0.15 s). */
export function dips(env: Envelope, from: number, to: number, depth = 6): { t: number; depth: number }[] {
  const a = Math.max(1, frameAt(env, from));
  const b = Math.min(env.db.length - 2, frameAt(env, to));
  const reach = Math.round(0.15 / env.hop);
  const out: { t: number; depth: number }[] = [];
  for (let f = a; f <= b; f++) {
    const v = env.db[f];
    if (v > env.db[f - 1] || v > env.db[f + 1]) continue;
    let left = -Infinity;
    let right = -Infinity;
    for (let g = Math.max(0, f - reach); g < f; g++) left = Math.max(left, env.db[g]);
    for (let g = f + 1; g <= Math.min(env.db.length - 1, f + reach); g++) right = Math.max(right, env.db[g]);
    const d = Math.min(left, right) - v;
    if (d >= depth && !out.some((o) => Math.abs(o.t - (f + 0.5) * env.hop) < 0.05)) out.push({ t: (f + 0.5) * env.hop, depth: d });
  }
  return out;
}

/** Scores a transcript of a splice: kept words heard, removed words not heard, small pull towards the estimate. */
export function scoreSplice(heard: string[], expected: string[], removedWords: string[], shift: number): number {
  const m = lcsLen(expected, heard);
  const pool = new Map<string, number>();
  for (const w of heard) pool.set(w, (pool.get(w) ?? 0) + 1);
  for (const w of expected) if (pool.get(w)) pool.set(w, (pool.get(w) as number) - 1);
  let hits = 0;
  for (const w of removedWords)
    if (pool.get(w)) {
      hits++;
      pool.set(w, (pool.get(w) as number) - 1);
    }
  return m - 1.5 * hits - 2 * shift;
}

function lcsLen(a: string[], b: string[]): number {
  let prev = new Array<number>(b.length + 1).fill(0);
  for (let x = 1; x <= a.length; x++) {
    const cur = [0];
    for (let y = 1; y <= b.length; y++) cur[y] = a[x - 1] === b[y - 1] ? prev[y - 1] + 1 : Math.max(prev[y], cur[y - 1]);
    prev = cur;
  }
  return prev[b.length];
}

type Candidate = { span: CutSpan; t1: number | null; t2: number | null; shift: number; file: string };

/**
 * Verified cut points for tight joins, keyed by boundaryKey(). Cached in .screenplay/media/joins.json
 * (per cut and words.json content), so only new or changed cuts are re-checked.
 */
export async function verifyJoins(dir: string, words: Word[], removed: boolean[], env: Envelope, samples: Float32Array, sampleRate: number, whisper: { model: string; prompt: string }): Promise<Map<string, number>> {
  const cacheFile = path.join(dir, 'joins.json');
  const hash = createHash('sha1').update(JSON.stringify(words)).digest('hex').slice(0, 12);
  const cache: Record<string, Record<string, number>> = fs.existsSync(cacheFile) ? readJson(cacheFile) : {};
  const result = new Map<string, number>();
  const fresh: Record<string, Record<string, number>> = {};
  const todo: { span: CutSpan; id: string; c1: number[] | null; c2: number[] | null; e1: number; e2: number }[] = [];

  for (const span of cutSpans(removed)) {
    const s1 = span.L !== null ? isTight(words[span.L], words[span.r0], env) : null;
    const s2 = span.N !== null ? isTight(words[span.r1], words[span.N], env) : null;
    if (!s1?.tight && !s2?.tight) continue;
    const id = `${span.L}|${span.r0}-${span.r1}|${span.N}@${hash}`;
    if (cache[id]) {
      fresh[id] = cache[id];
      for (const [k, v] of Object.entries(cache[id])) result.set(k, v);
      continue;
    }
    // Candidates: the estimate, the deepest dips in the level nearby, and plain shifts where dips are scarce.
    const near = (est: number, lo: number, hi: number) => {
      const all = [est, ...dips(env, Math.max(lo, est - WINDOW), Math.min(hi, est + WINDOW)).sort((x, y) => y.depth - x.depth).slice(0, 3).map((d) => d.t)];
      for (const d of [-0.1, 0.1, -0.2, 0.2]) if (est + d >= lo && est + d <= hi && !all.some((x) => Math.abs(x - est - d) < 0.06)) all.push(est + d);
      return all.slice(0, 6);
    };
    const e1 = s1?.at ?? 0;
    const e2 = s2?.at ?? 0;
    todo.push({
      span,
      id,
      e1,
      e2,
      c1: s1?.tight && span.L !== null ? near(e1, words[span.L].start + 0.05, words[span.r1].end) : null,
      c2: s2?.tight && span.N !== null ? near(e2, words[span.r0].start, words[span.N].end - 0.05) : null,
    });
  }
  if (!todo.length) return result;

  // One splice per candidate pair. A side without a tight join uses the normal cut point.
  const clipDir = path.join(dir, 'joins');
  fs.mkdirSync(clipDir, { recursive: true });
  const cands: Candidate[] = [];
  for (const t of todo) {
    const c1 = t.c1 ?? [t.span.L !== null ? t.e1 : words[t.span.r0].start];
    const c2 = t.c2 ?? [t.span.N !== null ? t.e2 : words[t.span.r1].end];
    for (const a of c1)
      for (const b of c2) {
        if (b - a < 0.05) continue;
        const file = path.join(clipDir, `join-${cands.length}.wav`);
        const from = Math.max(0, Math.round((a - CONTEXT) * sampleRate));
        const to = Math.min(samples.length, Math.round((b + CONTEXT) * sampleRate));
        const ia = Math.round(a * sampleRate);
        const ib = Math.round(b * sampleRate);
        const clip = new Float32Array(ia - from + (to - ib));
        clip.set(samples.subarray(from, ia), 0);
        clip.set(samples.subarray(ib, to), ia - from);
        const xf = Math.min(160, ia - from, to - ib); // 10 ms crossfade at the splice
        for (let k = 0; k < xf; k++) clip[ia - from - xf + k] = samples[ia - xf + k] * (1 - k / xf) + samples[ib - xf + k] * (k / xf);
        writeWav(file, clip, sampleRate);
        cands.push({ span: t.span, t1: t.c1 ? a : null, t2: t.c2 ? b : null, shift: (t.c1 ? Math.abs(a - t.e1) : 0) + (t.c2 ? Math.abs(b - t.e2) : 0), file });
      }
  }
  log(`  checking ${todo.length} tight join(s) by ear: ${cands.length} splices through whisper...`);
  const threads = String(Math.min(8, Math.max(2, os.availableParallelism?.() ?? 4)));
  await run(tool('whisper-cli'), ['-m', whisper.model, '-l', 'en', '-t', threads, '-ojf', '-np', '--prompt', whisper.prompt, ...cands.map((c) => c.file)]);

  for (const t of todo) {
    const span = t.span;
    const mine = cands.filter((c) => c.span === span);
    const a0 = (mine[0]?.t1 ?? t.e1) - CONTEXT;
    const b0 = (mine[0]?.t2 ?? t.e2) + CONTEXT;
    let best: Candidate | null = null;
    let bestScore = -Infinity;
    for (const c of mine) {
      const t1 = c.t1 ?? t.e1;
      const t2 = c.t2 ?? t.e2;
      // Kept words wholly inside the context windows (and always the two neighbours) should be heard.
      const expected = words
        .filter((w) => !removed[w.i] && ((w.start >= Math.max(a0, t1 - CONTEXT) + 0.1 && w.end <= t1 + 0.05) || (w.start >= t2 - 0.05 && w.end <= Math.min(b0, t2 + CONTEXT) - 0.1) || w.i === span.L || w.i === span.N))
        .map((w) => normWord(w.text));
      const gone = words.slice(span.r0, span.r1 + 1).map((w) => normWord(w.text));
      const json = c.file + '.json';
      const heard = fs.existsSync(json) ? parseWhisperJson(readJson(json), 0, { prompt: whisper.prompt }).map((w) => normWord(w.text)) : [];
      const s = scoreSplice(heard, expected, gone, c.shift);
      if (process.env.SCREENPLAY_DEBUG) log(`      ${(c.t1 ?? NaN).toFixed(2)}→${(c.t2 ?? NaN).toFixed(2)} score ${s.toFixed(2)}: "${heard.join(' ')}" (expect "${expected.join(' ')}", gone "${gone.join(' ')}")`);
      if (s > bestScore) {
        bestScore = s;
        best = c;
      }
    }
    if (!best) continue;
    const entry: Record<string, number> = {};
    if (best.t1 !== null && span.L !== null) entry[boundaryKey(span.L)] = Math.round(best.t1 * 1000) / 1000;
    if (best.t2 !== null) entry[boundaryKey(span.r1)] = Math.round(best.t2 * 1000) / 1000;
    fresh[t.id] = entry;
    for (const [k, v] of Object.entries(entry)) result.set(k, v);
    const moved = Object.entries(entry).map(([k, v]) => `${k.replace('|', '/')} → ${v.toFixed(2)} s`).join(', ');
    log(`    s${span.r0}-s${span.r1}: ${moved}`);
  }
  writeJson(cacheFile, fresh);
  return result;
}
