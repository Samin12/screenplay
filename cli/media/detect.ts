// Cut detection on the source transcript: fillers, stutters, false starts and retakes.
// Pure: words in, proposals out. Confident proposals are applied by `screenplay cut`; the rest go to review.md.
import { endsClause, endsSentence, isConnective, isCutOff, isFiller, isLegitDouble, joinWords, normWord, similarWord, truncate } from './text.ts';
import type { Proposal, Word } from './types.ts';

export type DetectOptions = {
  window: number; // seconds: how far back a retake may reach
  pause: number; // a pause at least this long (seconds) starts a new clause
  maxSpanWords: number; // longest abandoned attempt considered
};

export const DEFAULT_DETECT: DetectOptions = { window: 20, pause: 0.3, maxSpanWords: 45 };

/** Phrases after which "you know" is part of the sentence, not a filler. */
const YOU_KNOW_CONTENT = new Set(['what', 'how', 'that', 'the', 'why', 'when', 'where', 'who', 'it', 'this', 'him', 'her', 'them', 'me', 'about', 'if', 'whether', 'which', 'a', 'an', 'your', 'my', 'more', 'nothing', 'everything', 'something', 'anything', 'exactly']);

export function detectCuts(words: Word[], options: Partial<DetectOptions> = {}): Proposal[] {
  const opt = { ...DEFAULT_DETECT, ...options };
  const n = words.map((w) => normWord(w.text));
  const clauseStart = words.map((w, k) => k === 0 || endsClause(words[k - 1].text) || w.start - words[k - 1].end >= opt.pause);
  const text = (a: number, b: number) => joinWords(words.slice(a, b + 1).map((w) => w.text));
  const quote = (a: number, b: number) => `"${truncate(text(a, b), 70)}"`;
  const props: Proposal[] = [];

  // ---- fillers ----
  for (let k = 0; k < words.length; k++) {
    if (isFiller(n[k])) props.push({ from: k, to: k, kind: 'filler', why: 'filler', confident: true, note: `filler ${quote(k, k)}` });
    if (n[k] === 'you' && n[k + 1] === 'know' && k + 1 < words.length) {
      const next = n[k + 2] ?? '';
      if (YOU_KNOW_CONTENT.has(next)) continue;
      const before = k === 0 || endsClause(words[k - 1].text) || isConnective(n[k - 1]);
      const after = endsClause(words[k + 1].text) || k + 2 >= words.length;
      if (!before && !after) continue;
      const confident = before && after && (k === 0 || endsClause(words[k - 1].text) || isConnective(n[k - 1])) && endsClause(words[k + 1].text);
      props.push({ from: k, to: k + 1, kind: 'filler', why: 'filler', confident, note: `"you know" used as a filler in ${quote(Math.max(0, k - 3), Math.min(words.length - 1, k + 4))}` });
    }
    if (n[k] === 'i' && n[k + 1] === 'mean' && clauseStart[k] && endsClause(words[k + 1].text)) {
      props.push({ from: k, to: k + 1, kind: 'filler', why: 'filler', confident: false, note: `"I mean" opening a clause in ${quote(k, Math.min(words.length - 1, k + 6))}` });
    }
  }

  // ---- stutters: the same 1-4 words said twice in a row; cut-off partial words ----
  for (let k = 0; k < words.length; k++) {
    for (let L = 4; L >= 1; L--) {
      if (k + 2 * L > words.length) continue;
      let same = true;
      for (let m = 0; m < L && same; m++) same = n[k + m] !== '' && n[k + m] === n[k + L + m];
      if (!same) continue;
      // A sentence that ends and the next starting with the same word ("...do it. It works") is fine for L=1.
      if (L === 1 && endsSentence(words[k].text) && !isCutOff(words[k].text)) break;
      const confident = L > 1 || !isLegitDouble(n[k]) || isCutOff(words[k].text);
      props.push({ from: k, to: k + L - 1, kind: 'stutter', why: 'stutter', confident, note: `${quote(k, k + L - 1)} repeated immediately` });
      break;
    }
    // "lit- literally": a cut-off fragment followed by the full word.
    if (k + 1 < words.length && isCutOff(words[k].text) && n[k].length >= 1 && n[k] !== n[k + 1] && n[k + 1].startsWith(n[k])) {
      props.push({ from: k, to: k, kind: 'stutter', why: 'stutter', confident: true, note: `cut-off ${quote(k, k)} before "${words[k + 1].text}"` });
    }
  }

  // ---- retakes: an attempt that is restarted within the window; keep the last one ----
  const found = retakes(words, n, clauseStart, opt);
  const restartAt = new Set(found.map((r) => r.j));

  // ---- false starts: a 1-2 word fragment that trails off and is abandoned ("So, what- any software") ----
  for (let k = 0; k < words.length; k++) {
    if (!clauseStart[k] || restartAt.has(k)) continue; // a kept restart can trail off too ("I'll even- leave")
    let e = k;
    while (e + 1 < words.length && !clauseStart[e + 1] && e - k < 2) e++;
    const len = e - k + 1;
    if (len > 2 || !isCutOff(words[e].text) || e + 1 >= words.length || !clauseStart[e + 1]) continue;
    if (n[e + 1].startsWith(n[e])) continue; // handled as a stutter
    // Whisper also puts a dash on words it merely hears clipped ("this guy- spin out"): only a fragment
    // that opens a clause after punctuation ("So, what-") is safe to cut without review.
    const opensClause = k === 0 || endsClause(words[k - 1].text);
    props.push({ from: k, to: e, kind: 'false-start', why: 'false start', confident: len === 1 && opensClause, note: `${quote(k, e)} trails off and is abandoned` });
  }

  for (const r of found) {
    const trailsOff = isCutOff(words[r.j - 1].text);
    const unmatched = r.len - r.m;
    const confident = ((r.m >= 5 && r.cov >= 0.6) || (r.m >= 3 && r.cov >= 0.85) || (r.m >= 3 && trailsOff)) && unmatched <= 12;
    // Connectives that only lead into the abandoned attempt go with it: "kit, or [pause] even I can-"
    // (a hesitation after the connective), or "kit or even I can live- I can leave" (an attempt that
    // starts mid-clause with the restart's first word).
    let lead = r.i;
    while (lead > 0 && lead > r.i - 2 && isConnective(n[lead - 1])) lead--;
    const hesitated = r.i > 0 && clauseStart[lead] && words[r.i].start - words[r.i - 1].end >= opt.pause;
    const from = lead < r.i && (r.midClause || hesitated) ? lead : r.i;
    props.push({
      from,
      to: r.j - 1,
      kind: r.m >= 3 || trailsOff ? 'retake' : 'false-start',
      why: 'retake',
      confident,
      note: `${quote(r.i, r.j - 1)} is restarted at s${r.j} as ${quote(r.j, Math.min(words.length - 1, r.j + r.len + 1))} (${r.m} of ${r.len} words repeat)`,
    });
  }

  return resolve(props);
}

type Retake = { i: number; j: number; m: number; cov: number; len: number; firstB: number; midClause: boolean };

/** Number of connectives / fillers at the start of a word list. */
function leadingConnectives(ws: string[]): number {
  let k = 0;
  while (k < ws.length && (isConnective(ws[k]) || isFiller(ws[k]))) k++;
  return k;
}

/**
 * Retake candidates: a clause start i (or any word equal to the restart's first word) whose words, up to
 * the restart j, are mostly said again right from j. Every (i, j) pair is scored; candidates are then taken best-first, skipping any that would cut
 * into an accepted restart (its j strictly inside our range) or share its restart point. A chain of
 * attempts (A, B, C) survives as A→B plus B→C, because B→C starts exactly at B.
 */
export function retakes(words: Word[], n: string[], clauseStart: boolean[], opt: DetectOptions): Retake[] {
  const cands: Retake[] = [];
  for (let j = 1; j < words.length; j++) {
    if (!clauseStart[j]) continue;
    for (let i = j - 1; i >= Math.max(0, j - opt.maxSpanWords); i--) {
      // The window runs from where the first attempt stopped repeating to the restart (checked below);
      // this is just a hard bound on how long an abandoned attempt can be.
      if (words[j].start - words[i].start > 2 * opt.window) break;
      // Mid-clause attempts must open exactly like the restart ("... or even I can live- | I can leave").
      const midClause = !clauseStart[i];
      if (midClause && !(n[i] && n[i] === n[j] && i + 1 < j && j + 1 < words.length && similarWord(n[i + 1], n[j + 1]))) continue;
      const a: string[] = [];
      const aIdx: number[] = [];
      for (let k = i; k < j; k++)
        if (n[k] && !isFiller(n[k])) {
          a.push(n[k]);
          aIdx.push(k);
        }
      if (a.length < 2) continue;
      const b: string[] = [];
      for (let k = j; k < words.length && b.length < a.length + 4 && words[k].start - words[j].start <= opt.window; k++) if (n[k] && !isFiller(n[k])) b.push(n[k]);
      const { m, first, lastA } = lcs(a, b);
      if (m < 2 || !first) continue;
      // Both attempts must open the same way (leading "and"/"so"/... don't count).
      const offA = first[0] - Math.min(first[0], leadingConnectives(a));
      const offB = first[1] - Math.min(first[1], leadingConnectives(b));
      if (offA > 2 || offB > 2) continue;
      if (words[j].start - words[aIdx[lastA]].end > opt.window) continue;
      const cov = m / a.length;
      if (cov < 0.6) continue;
      if (m < 3 && !(a.length <= 3 && offA === 0 && offB === 0)) continue;
      cands.push({ i, j, m, cov, len: a.length, firstB: offB, midClause });
    }
  }
  // Restarts that begin exactly at j first, then the longest repeat, the best coverage, the shortest span.
  cands.sort((x, y) => Number(x.firstB > 0) - Number(y.firstB > 0) || y.m - x.m || y.cov - x.cov || x.j - x.i - (y.j - y.i));
  const taken: Retake[] = [];
  for (const c of cands) {
    const clash = taken.some((t) => t.j === c.j || (t.j > c.i && t.j < c.j) || (c.j > t.i && c.j < t.j));
    if (!clash) taken.push(c);
  }
  return taken.sort((x, y) => x.i - y.i);
}

/** Longest common subsequence of two word lists (similar words match); also the first matched pair. */
export function lcs(a: string[], b: string[]): { m: number; first: [number, number] | null; lastA: number } {
  const A = a.length;
  const B = b.length;
  const dp: number[][] = Array.from({ length: A + 1 }, () => new Array<number>(B + 1).fill(0));
  for (let x = A - 1; x >= 0; x--)
    for (let y = B - 1; y >= 0; y--) dp[x][y] = similarWord(a[x], b[y]) ? dp[x + 1][y + 1] + 1 : Math.max(dp[x + 1][y], dp[x][y + 1]);
  // Walk forward along an optimal alignment: earliest matched pair and the last matched index in a.
  let x = 0;
  let y = 0;
  let first: [number, number] | null = null;
  let lastA = 0;
  while (x < A && y < B) {
    if (similarWord(a[x], b[y]) && dp[x][y] === dp[x + 1][y + 1] + 1) {
      first ??= [x, y];
      lastA = x;
      x++;
      y++;
    } else if (dp[x + 1][y] >= dp[x][y + 1]) x++;
    else y++;
  }
  return { m: dp[0][0], first, lastA };
}

/**
 * Overlapping confident proposals are merged (a chain of restarts becomes one cut); ambiguous ones inside
 * a confident cut are dropped, and duplicates removed. Sorted by start.
 */
export function resolve(props: Proposal[]): Proposal[] {
  const conf = props.filter((p) => p.confident).sort((a, b) => a.from - b.from || b.to - a.to);
  const merged: Proposal[] = [];
  for (const p of conf) {
    const last = merged[merged.length - 1];
    if (last && p.from <= last.to + 1) {
      if (p.to > last.to) {
        last.to = p.to;
        if (!last.why.split(' + ').includes(p.why)) last.why += ` + ${p.why}`;
        last.note = `${last.note ?? ''}; ${p.note ?? ''}`;
        if (p.kind === 'retake') last.kind = 'retake';
      }
    } else merged.push({ ...p });
  }
  const covered = (p: Proposal) => merged.some((c) => c.from <= p.from && c.to >= p.to);
  const amb: Proposal[] = [];
  for (const p of props.filter((q) => !q.confident).sort((a, b) => a.from - b.from || b.to - a.to)) {
    if (covered(p) || amb.some((q) => q.from === p.from && q.to === p.to)) continue;
    amb.push({ ...p });
  }
  return [...merged, ...amb].sort((a, b) => a.from - b.from || Number(b.confident) - Number(a.confident));
}
