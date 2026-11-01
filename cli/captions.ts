// Sidecar files written next to a render: YouTube chapters and SRT captions.

import type { Word } from './anchors.ts';
import type { Timeline } from '../src/types.ts';
import { fmtSrt, fmtYouTube } from './util.ts';

// Greedy wrap into lines of <= max chars; for two lines, balance them.
export function wrap(text: string, max: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    if (!cur) cur = w;
    else if (cur.length + 1 + w.length <= max) cur += ` ${w}`;
    else {
      lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  if (lines.length === 2) {
    // balance: choose the split that minimises the longer line
    let best: string[] = lines;
    let bestLen = Math.max(...lines.map((l) => l.length));
    for (let i = 1; i < words.length; i++) {
      const a = words.slice(0, i).join(' ');
      const b = words.slice(i).join(' ');
      const m = Math.max(a.length, b.length);
      if (a.length <= max && b.length <= max && m < bestLen) {
        best = [a, b];
        bestLen = m;
      }
    }
    return best;
  }
  return lines;
}

export type SrtOptions = { from?: number; to?: number; maxChars?: number; maxLines?: number; maxDur?: number; gap?: number };

export function buildSrt(words: Word[], opts: SrtOptions = {}): string {
  const from = opts.from ?? 0;
  const to = opts.to ?? Infinity;
  const maxChars = opts.maxChars ?? 42;
  const maxLines = opts.maxLines ?? 2;
  const maxDur = opts.maxDur ?? 6;
  const gapS = opts.gap ?? 0.7;
  const ws = words.filter((w) => w.start >= from - 1e-6 && w.start < to).map((w) => ({ ...w, text: w.text.trim() })).filter((w) => w.text);
  const cues: Word[][] = [];
  let cue: Word[] = [];
  const fits = (list: Word[]) => wrap(list.map((w) => w.text).join(' '), maxChars).length <= maxLines;
  for (const w of ws) {
    const prev = cue[cue.length - 1];
    const breakBefore =
      cue.length > 0 && (!fits([...cue, w]) || w.start - prev.end > gapS || w.end - cue[0].start > maxDur || (/[.?!]["')\]]?$/.test(prev.text) && cue.map((x) => x.text).join(' ').length >= 18));
    if (breakBefore) {
      cues.push(cue);
      cue = [];
    }
    cue.push(w);
  }
  if (cue.length) cues.push(cue);
  const out: string[] = [];
  cues.forEach((c, i) => {
    const start = Math.max(0, c[0].start - from);
    const next = cues[i + 1];
    let end = Math.max(c[c.length - 1].end, c[0].start + 0.8) - from;
    if (next) end = Math.min(end, next[0].start - from - 0.04);
    end = Math.min(end, to - from);
    out.push(`${i + 1}\n${fmtSrt(start)} --> ${fmtSrt(Math.max(start + 0.2, end))}\n${wrap(c.map((w) => w.text).join(' '), maxChars).join('\n')}\n`);
  });
  return out.join('\n');
}

// YouTube chapters ("00:00 Intro" first, then one line per chapter card). Frames relative to `fromF`.
export function youtubeChapters(t: Timeline, opts: { fromF?: number; toF?: number; intro?: string } = {}): { text: string; warnings: string[] } {
  const fromF = opts.fromF ?? 0;
  const toF = opts.toF ?? t.durationInFrames;
  const warnings: string[] = [];
  const list = t.chapters.filter((ch) => ch.frame >= fromF && ch.frame < toF).map((ch) => ({ s: (ch.frame - fromF) / t.fps, title: ch.title.replace(/\*/g, '') }));
  if (list.length === 0) return { text: '', warnings: [t.chapters.length ? 'no chapters in the rendered range: no chapters file written' : 'no chapters in edit.yaml: no chapters file written'] };
  if (list[0].s >= 1) list.unshift({ s: 0, title: opts.intro ?? 'Intro' });
  else list[0].s = 0;
  if (list.length < 3) warnings.push(`YouTube needs at least 3 chapters (have ${list.length})`);
  const total = (toF - fromF) / t.fps;
  list.forEach((ch, i) => {
    const end = list[i + 1]?.s ?? total;
    if (end - ch.s < 10) warnings.push(`chapter "${ch.title}" is ${(end - ch.s).toFixed(1)} s long; YouTube wants at least 10 s`);
  });
  return { text: `${list.map((ch) => `${fmtYouTube(ch.s)} ${ch.title}`).join('\n')}\n`, warnings };
}
