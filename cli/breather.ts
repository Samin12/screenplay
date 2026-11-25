// The chapter breather (`chapters.breather`): at each chapter card the voice stops at a real pause,
// the card builds over room tone for a second, then the voice carries on.
//
// It inserts time, so everything goes through ONE map, built here and applied by compileEdit before
// anything is resolved: the words, the A-roll's length and cuts, and the face track all move to
// output time first, and every anchor, scene frame, caption and chapter time is then derived from
// those as usual. The A-roll file itself is never rewritten: the renderer plays it in pieces.
//
//   cut time    the time base of aroll.mp4 and words.out.json
//   output time cut time with `seconds` inserted at every pause

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import type { Word } from './anchors.ts';

export type BreatherMap = {
  pauses: number[]; // cut-time seconds where the voice stops, ascending
  seconds: number; // length of each breather
  out: (t: number) => number; // cut time -> output time (a time exactly on a pause lands after it)
  back: (T: number) => number; // output time -> cut time (inside a breather: the pause)
};

export function breatherMap(pauses: number[], seconds: number): BreatherMap {
  const out = (t: number) => t + seconds * pauses.filter((q) => q <= t + 1e-9).length;
  const back = (T: number) => {
    let t = T;
    pauses.forEach((q, j) => {
      const at = q + j * seconds; // where breather j starts in output time
      if (T >= at + seconds) t = T - (j + 1) * seconds;
      else if (T >= at) t = q;
    });
    return t;
  };
  return { pauses, seconds, out, back };
}

// A word never straddles a breather: it stays whole on the side its middle is on.
export function shiftWords<T extends Word>(words: T[], m: BreatherMap): T[] {
  return words.map((w) => {
    const mid = (w.start + w.end) / 2;
    const n = m.pauses.filter((q) => q <= mid).length;
    const lo = n > 0 ? m.pauses[n - 1] : -Infinity;
    const hi = n < m.pauses.length ? m.pauses[n] : Infinity;
    const r = (v: number) => Math.round(v * 1000) / 1000;
    return { ...w, start: r(Math.max(w.start, lo) + n * m.seconds), end: r(Math.min(w.end, hi) + n * m.seconds) };
  });
}

// The face track in output time: during a breather the head holds where it was at the pause.
export function shiftTrack(track: { fps: number; x: number[] }, m: BreatherMap): { fps: number; x: number[] } {
  if (!track.x.length) return track;
  const n = track.x.length + Math.round(m.pauses.length * m.seconds * track.fps);
  const x = Array.from({ length: n }, (_, i) => track.x[Math.max(0, Math.min(track.x.length - 1, Math.round(m.back(i / track.fps) * track.fps)))]);
  return { fps: track.fps, x };
}

// ---------- audio analysis (ffmpeg) ----------

const SR = 48000;

function decode(file: string, a: number, b: number, ch: 1 | 2): Float32Array {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-ss', a.toFixed(4), '-t', (b - a).toFixed(4), '-i', file, '-vn', '-f', 'f32le', '-ac', String(ch), '-ar', String(SR), '-'], { maxBuffer: 1 << 30 });
  if (r.status !== 0 || !r.stdout) return new Float32Array(0);
  const buf = r.stdout as Buffer;
  return new Float32Array(buf.buffer, buf.byteOffset, Math.floor(buf.byteLength / 4)).slice();
}

const rms = (x: Float32Array, a: number, b: number) => {
  let s = 0;
  for (let i = a; i < b; i++) s += x[i] * x[i];
  return Math.sqrt(s / Math.max(1, b - a) + 1e-12);
};

// The latest real pause (150 ms or more) in [C - back, C + 0.05]; else the longest quiet run; else C.
// Pure over samples so it can be tested without a file. `a0` is the time of sample 0.
export function quietPointIn(mono: Float32Array, a0: number, C: number, sr = SR): number {
  const hop = 0.01;
  const h = Math.round(hop * sr);
  const w = Math.round(0.03 * sr);
  const n = Math.max(0, Math.floor((mono.length - w) / h));
  if (n < 5) return C;
  const r = Array.from({ length: n }, (_, i) => rms(mono, i * h, i * h + w));
  const thr = Math.max(10 ** (-50 / 20), 2.5 * Math.min(...r));
  const runs: [number, number][] = [];
  for (let i = 0; i < n; ) {
    if (r[i] < thr) {
      let j = i;
      while (j < n && r[j] < thr) j++;
      runs.push([i, j]);
      i = j;
    } else i++;
  }
  if (!runs.length) return C;
  const long = runs.filter(([i, j]) => (j - i) * hop >= 0.15);
  const [i, j] = long.length ? long[long.length - 1] : runs.reduce((best, x) => (x[1] - x[0] > best[1] - best[0] ? x : best));
  const t = a0 + ((i + j) / 2) * hop + 0.015;
  return Math.min(Math.max(t, a0), C);
}

export function quietPoint(file: string, C: number, back = 0.8): number {
  const a0 = Math.max(0, C - back);
  if (C <= 0.02) return 0;
  return quietPointIn(decode(file, a0, C + 0.08, 1), a0, C);
}

// Room tone from the recording itself: its quietest half second with no transient in it (no breath,
// click or chuckle) and a steady level, mirrored to fill `seconds` and faded at both ends. Never
// digital silence. Returns interleaved stereo samples, or null when the recording has no such window.
export function roomToneIn(stereo: Float32Array, seconds: number, sr = SR): Float32Array | null {
  const frames = Math.floor(stereo.length / 2);
  const mono = new Float32Array(frames);
  for (let i = 0; i < frames; i++) mono[i] = (stereo[2 * i] + stereo[2 * i + 1]) / 2;
  const w = sr >> 1;
  const h = Math.round(sr / 20);
  let best: { r: number; i: number } | null = null;
  for (let i = 0; i + w < frames; i += h) {
    const r = rms(mono, i, i + w);
    if (r < 10 ** (-72 / 20) || r > 10 ** (-48 / 20)) continue; // digital silence, or not quiet
    let pk = 0;
    for (let k = i; k < i + w; k++) pk = Math.max(pk, Math.abs(mono[k]));
    if (pk / r > 4.5) continue; // a transient inside the window
    let lo = Infinity;
    let hi = 0;
    for (let k = i; k + h <= i + w; k += h) {
      const s = rms(mono, k, k + h);
      lo = Math.min(lo, s);
      hi = Math.max(hi, s);
    }
    if (hi / (lo + 1e-9) > 2.2) continue; // not steady
    if (!best || r < best.r) best = { r, i };
  }
  if (!best) return null;
  const total = Math.round(seconds * sr);
  const out = new Float32Array(total * 2);
  for (let k = 0; k < total; k++) {
    const lap = Math.floor(k / w);
    const pos = lap % 2 === 0 ? k % w : w - 1 - (k % w); // forward, then mirrored, so the loop has no seam
    out[2 * k] = stereo[2 * (best.i + pos)];
    out[2 * k + 1] = stereo[2 * (best.i + pos) + 1];
  }
  const f = Math.round(0.04 * sr);
  for (let k = 0; k < f; k++) {
    const g = k / f;
    out[2 * k] *= g;
    out[2 * k + 1] *= g;
    out[2 * (total - 1 - k)] *= g;
    out[2 * (total - 1 - k) + 1] *= g;
  }
  return out;
}

export function writeWav16(file: string, stereo: Float32Array, sr = SR) {
  const n = stereo.length;
  const buf = Buffer.alloc(44 + n * 2);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + n * 2, 4);
  buf.write('WAVEfmt ', 8);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(2, 22);
  buf.writeUInt32LE(sr, 24);
  buf.writeUInt32LE(sr * 4, 28);
  buf.writeUInt16LE(4, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, stereo[i])) * 32767), 44 + i * 2);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, buf);
}

// Analysis for one work dir, cached next to the build (keyed on the A-roll's size and mtime).
export function workBreather(work: string) {
  const aroll = path.join(work, 'aroll.mp4');
  const dir = path.join(work, '.screenplay', 'breather');
  const st = fs.existsSync(aroll) ? fs.statSync(aroll) : null;
  const key = st ? `${st.size}:${st.mtimeMs}` : '';
  const cacheFile = path.join(dir, 'cache.json');
  let cache: { key: string; quiet: Record<string, number>; tone: Record<string, boolean> } = { key, quiet: {}, tone: {} };
  try {
    const c = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
    if (c.key === key) cache = c;
  } catch {
    // no cache yet
  }
  const save = () => {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(cacheFile, JSON.stringify(cache));
  };
  return {
    quiet: (C: number): number => {
      if (!st) return C;
      const k = C.toFixed(3);
      if (cache.quiet[k] === undefined) {
        cache.quiet[k] = quietPoint(aroll, C);
        save();
      }
      return cache.quiet[k];
    },
    // Returns the tone file's path relative to the render's public dir, or null when no clean window exists.
    tone: (seconds: number): string | null => {
      if (!st) return null;
      const name = `tone-${seconds.toFixed(2)}.wav`;
      const file = path.join(dir, name);
      if (cache.tone[name] === undefined || (cache.tone[name] && !fs.existsSync(file))) {
        const tone = roomToneIn(decode(aroll, 0, 300, 2), seconds);
        if (tone) writeWav16(file, tone);
        cache.tone[name] = !!tone;
        save();
      }
      return cache.tone[name] ? `_breather/${name}` : null;
    },
  };
}
