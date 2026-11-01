// Speech/silence analysis. Whisper's word times are only good to ~0.2-0.3 s, so every timing decision
// (where a word really starts, where a pause is, where to cut) is checked against the audio level.
import fs from 'node:fs';
import { endsClause, normWord } from './text.ts';
import type { Envelope, Word } from './types.ts';

/** Reads a 16-bit PCM WAV (as written by `ffmpeg -c:a pcm_s16le`) into mono float samples. */
export function readWav(file: string): { sampleRate: number; samples: Float32Array } {
  const buf = fs.readFileSync(file);
  if (buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WAVE') throw new Error(`${file}: not a WAV file`);
  let off = 12;
  let sampleRate = 16000;
  let channels = 1;
  let bits = 16;
  while (off + 8 <= buf.length) {
    const id = buf.toString('ascii', off, off + 4);
    let len = buf.readUInt32LE(off + 4);
    const body = off + 8;
    if (id === 'fmt ') {
      channels = buf.readUInt16LE(body + 2);
      sampleRate = buf.readUInt32LE(body + 4);
      bits = buf.readUInt16LE(body + 14);
    } else if (id === 'data') {
      if (bits !== 16) throw new Error(`${file}: expected 16-bit PCM, got ${bits}-bit`);
      if (len === 0 || body + len > buf.length) len = buf.length - body; // streamed WAVs have no size
      const frames = Math.floor(len / (2 * channels));
      const samples = new Float32Array(frames);
      for (let f = 0; f < frames; f++) {
        let s = 0;
        for (let c = 0; c < channels; c++) s += buf.readInt16LE(body + 2 * (f * channels + c));
        samples[f] = s / channels / 32768;
      }
      return { sampleRate, samples };
    }
    off = body + len + (len % 2);
  }
  throw new Error(`${file}: no data chunk`);
}

/** Writes mono float samples [from, to) as a 16-bit PCM WAV. */
export function writeWav(file: string, samples: Float32Array, sampleRate: number, from = 0, to = samples.length): void {
  const n = Math.max(0, Math.min(samples.length, to) - Math.max(0, from));
  const buf = Buffer.alloc(44 + 2 * n);
  buf.write('RIFF', 0, 'ascii');
  buf.writeUInt32LE(36 + 2 * n, 4);
  buf.write('WAVEfmt ', 8, 'ascii');
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(1, 22); // mono
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36, 'ascii');
  buf.writeUInt32LE(2 * n, 40);
  for (let k = 0; k < n; k++) buf.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(samples[from + k] * 32768))), 44 + 2 * k);
  fs.writeFileSync(file, buf);
}

export type Chunk = { start: number; end: number };

/**
 * Speech islands no word lands on (whisper skipped them): merged into regions worth a second look.
 * Islands shorter than `minLen` (clicks, breaths) are ignored.
 */
export function uncovered(islands: Island[], words: { start: number; end: number }[], minLen = 0.25, tol = 0.1): Chunk[] {
  const out: Chunk[] = [];
  let k = 0;
  for (const isl of islands) {
    if (isl.end - isl.start < minLen) continue;
    while (k < words.length && words[k].end < isl.start - tol) k++;
    let hit = false;
    for (let m = k; m < words.length && words[m].start <= isl.end + tol; m++) if (words[m].end >= isl.start - tol) hit = true;
    if (hit) continue;
    const last = out[out.length - 1];
    if (last && isl.start - last.end < 0.5) last.end = isl.end;
    else out.push({ start: isl.start, end: isl.end });
  }
  return out;
}

/**
 * Splits speech into transcription chunks at pauses: a new chunk starts at a pause of at least `pause`
 * seconds once the current one is `minLen` long, and before it would grow past `maxLen`. Whisper's word
 * times are far more accurate on short clips that start at the speech than across a long file (measured
 * on a 3 min talking head with ggml-small: island-start error p50 100 ms for one pass, 40 ms for 8 s
 * chunks). Much shorter chunks start dropping words at their edges.
 */
export function transcriptionChunks(islands: Island[], pause = 0.5, minLen = 2, maxLen = 8): Chunk[] {
  const out: Chunk[] = [];
  for (const isl of islands) {
    const c = out[out.length - 1];
    if (c && isl.end - c.start <= maxLen && (isl.start - c.end < pause || c.end - c.start < minLen)) c.end = isl.end;
    else out.push({ start: isl.start, end: isl.end });
  }
  return out;
}

function percentile(sorted: Float32Array, q: number): number {
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.floor(q * (sorted.length - 1))))];
}

/**
 * RMS level per 10 ms frame (20 ms window) and an adaptive silence threshold: a bit above the room's
 * noise floor, clamped so a noisy room or a very quiet mic still gets a sensible split.
 */
export function computeEnvelope(samples: Float32Array, sampleRate: number, hop = 0.01): Envelope {
  const h = Math.max(1, Math.round(sampleRate * hop));
  const frames = Math.floor(samples.length / h);
  const db = new Float32Array(frames);
  for (let f = 0; f < frames; f++) {
    const a = Math.max(0, f * h - Math.floor(h / 2));
    const b = Math.min(samples.length, f * h + h + Math.floor(h / 2));
    let s = 0;
    for (let k = a; k < b; k++) s += samples[k] * samples[k];
    db[f] = 10 * Math.log10(s / Math.max(1, b - a) + 1e-12);
  }
  const sorted = Float32Array.from(db).sort();
  const floor = frames ? percentile(sorted, 0.08) : -90;
  const speech = frames ? percentile(sorted, 0.9) : -20;
  const threshold = Math.min(Math.max(floor + Math.max(12, 0.35 * (speech - floor)), -62), speech - 12);
  return { hop, db, threshold };
}

export function frameAt(env: Envelope, t: number): number {
  return Math.min(env.db.length - 1, Math.max(0, Math.floor(t / env.hop)));
}

export type Island = { start: number; end: number };

/**
 * Speech islands: runs of voiced frames, joined across silences shorter than `bridge` seconds
 * (stop consonants and short breaths inside a phrase), dropping blips shorter than `minLen`.
 */
export function speechIslands(env: Envelope, bridge = 0.12, minLen = 0.04): Island[] {
  const out: Island[] = [];
  const n = env.db.length;
  let f = 0;
  while (f < n) {
    while (f < n && env.db[f] <= env.threshold) f++;
    if (f >= n) break;
    const s = f;
    while (f < n && env.db[f] > env.threshold) f++;
    const isl = { start: s * env.hop, end: f * env.hop };
    const prev = out[out.length - 1];
    if (prev && isl.start - prev.end < bridge) prev.end = isl.end;
    else out.push(isl);
  }
  return out.filter((i) => i.end - i.start >= minLen);
}

/** The quietest moment (10 ms frame, lightly smoothed) in [from, to]: the best place for a cut between words. */
export function quietest(env: Envelope, from: number, to: number): number {
  if (to <= from) return (from + to) / 2;
  const a = frameAt(env, from);
  const b = Math.max(a, Math.min(env.db.length - 1, Math.floor(to / env.hop)));
  let best = a;
  let bestV = Infinity;
  for (let f = a; f <= b; f++) {
    const v = (env.db[Math.max(0, f - 1)] + 2 * env.db[f] + env.db[Math.min(env.db.length - 1, f + 1)]) / 4;
    // Prefer the middle of a flat quiet stretch (ties resolve towards the centre of the window).
    const centre = Math.abs(f - (a + b) / 2) * 0.01;
    if (v + centre < bestV) {
      bestV = v + centre;
      best = f;
    }
  }
  return Math.min(to, Math.max(from, (best + 0.5) * env.hop));
}

/** Rough spoken length of a word, used to discount whisper stretching a word over a neighbouring pause. */
function typicalDuration(text: string): number {
  return Math.min(0.9, Math.max(0.15, 0.1 + 0.055 * normWord(text).length));
}

function distance(w: Word, isl: Island): number {
  return Math.max(0, isl.start - w.end, w.start - isl.end);
}

/**
 * Snaps whisper's word times onto the speech islands of the audio. Each word goes to the island it
 * overlaps most (or the nearest one within `reach` seconds), keeping order. Where two islands meet, the
 * split is moved (up to 2 words) to where the transcript has punctuation if that fits the times about as
 * well. Inside an island the first word starts at the island start and the last ends at its end; the
 * words between keep whisper's times (clamped into the island, in order, each at least half a typical
 * word long, squeezed back if that overflows the island). Words with no island in reach keep their
 * times. Returns new Word objects (same i/text).
 */
export function snapWords(words: Word[], islands: Island[], reach = 1.5, punctBonus = 0.25): Word[] {
  if (!islands.length || !words.length) return words.map((w) => ({ ...w }));
  const assign: number[] = new Array(words.length).fill(-1);
  let lo = 0;
  for (let k = 0; k < words.length; k++) {
    const w = words[k];
    const mid = (w.start + w.end) / 2;
    let best = -1;
    let bestScore = -Infinity;
    for (let j = lo; j < islands.length; j++) {
      const isl = islands[j];
      if (isl.start > w.end + reach) break;
      const overlap = Math.min(w.end, isl.end) - Math.max(w.start, isl.start);
      const dist = mid < isl.start ? isl.start - w.end : mid > isl.end ? w.start - isl.end : 0;
      if (overlap <= 0 && dist > reach) continue;
      const score = overlap > 0 ? overlap : -Math.max(0, dist);
      if (score > bestScore) {
        bestScore = score;
        best = j;
      }
    }
    if (best >= 0) {
      assign[k] = best;
      lo = best; // monotonic: later words never go to an earlier island
    }
  }
  // Groups of consecutive words on the same island.
  type Group = { isl: number; from: number; to: number };
  const groups: Group[] = [];
  for (let k = 0; k < words.length; k++) {
    if (assign[k] < 0) continue;
    const g = groups[groups.length - 1];
    if (g && g.isl === assign[k] && g.to === k - 1) g.to = k;
    else groups.push({ isl: assign[k], from: k, to: k });
  }
  // Move each split between neighbouring islands to the best-fitting word boundary.
  for (let g = 0; g + 1 < groups.length; g++) {
    const A = groups[g];
    const B = groups[g + 1];
    if (B.from !== A.to + 1) continue;
    const IA = islands[A.isl];
    const IB = islands[B.isl];
    const cost = (b: number) => {
      let c = endsClause(words[b].text) ? 0 : punctBonus;
      for (let m = Math.max(A.from, A.to - 2); m <= b; m++) c += distance(words[m], IA);
      for (let m = b + 1; m <= Math.min(B.to, B.from + 2); m++) c += distance(words[m], IB);
      return c;
    };
    let best = A.to;
    let bestCost = cost(A.to) - 1e-6;
    for (let b = Math.max(A.from, A.to - 2); b < Math.min(B.to, A.to + 3); b++) {
      const c = cost(b);
      if (c < bestCost) {
        bestCost = c;
        best = b;
      }
    }
    A.to = best;
    B.from = best + 1;
  }
  const out = words.map((w) => ({ ...w }));
  for (const g of groups) {
    const isl = islands[g.isl];
    // Clamp into the island, keep order, give every word a minimum length...
    const ss: number[] = [];
    const es: number[] = [];
    let prevEnd = isl.start;
    for (let m = g.from; m <= g.to; m++) {
      const s = Math.max(prevEnd, Math.min(isl.end, Math.max(isl.start, words[m].start)));
      const e = Math.max(s + Math.max(0.06, 0.5 * typicalDuration(words[m].text)), Math.min(isl.end, words[m].end));
      ss.push(s);
      es.push(e);
      prevEnd = e;
    }
    // ...then squeeze back into the island if the minimum lengths pushed past its end.
    const over = es[es.length - 1];
    const k = over > isl.end ? (isl.end - isl.start) / (over - isl.start) : 1;
    const f = (x: number) => isl.start + (x - isl.start) * k;
    for (let m = g.from; m <= g.to; m++) {
      out[m].start = round(f(ss[m - g.from]));
      out[m].end = round(f(es[m - g.from]));
    }
    out[g.from].start = round(isl.start);
    out[g.to].end = round(isl.end);
    for (let m = g.from; m <= g.to; m++) assign[m] = g.isl;
  }
  // Keep times monotonic where snapped and unsnapped words meet.
  for (let m = 1; m < out.length; m++) {
    if (out[m].start < out[m - 1].end) {
      if (assign[m] < 0) out[m].start = out[m - 1].end;
      else if (assign[m - 1] < 0) out[m - 1].end = out[m].start;
      if (out[m].end < out[m].start) out[m].end = out[m].start;
    }
  }
  return out;
}

function round(x: number): number {
  return Math.round(x * 1000) / 1000;
}
