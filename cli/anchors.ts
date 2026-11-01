// Anchors: every `at:` / `until:` in edit.yaml is resolved here against words.out.json.
//
//   w123                 start of output word 123 (end of it for `until`)
//   "the big one"        first occurrence of the phrase in the search window (case/punctuation/apostrophe-insensitive)
//   "the big one#2"      second occurrence
//   o:61.5  o:1:01.5     output time in seconds (or m:ss)
//   f:1845               output frame (needs fps)
//   ... +0.4s / -1s      trailing offset on any of the above (also ms)
//
// `at` resolves to the START of the first word of the phrase, `until` to the END of the last word.
// Phrases are searched in a list of windows (e.g. the scene, then from the scene's `at` onward), then
// globally; a global-only hit resolves but carries a warning.

export type Word = { id: string; text: string; start: number; end: number; src?: number };

export type AnchorSpec =
  | { kind: 'word'; raw: string; index: number; offset: number }
  | { kind: 'time'; raw: string; seconds: number; offset: number }
  | { kind: 'frame'; raw: string; frame: number; offset: number }
  | { kind: 'phrase'; raw: string; phrase: string; tokens: string[]; occurrence: number; offset: number };

export class AnchorError extends Error {}

// ---------- normalisation ----------

export function normalizeTokens(s: string): string[] {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['’‘`´ʼ]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

// ---------- parsing ----------

const OFFSET_RE = /^(.*?)\s+([+-])\s?(\d+(?:\.\d+)?|\.\d+)\s?(ms|s)$/;

export function parseOffset(raw: string): { rest: string; offset: number } {
  const m = OFFSET_RE.exec(raw.trim());
  if (!m) return { rest: raw.trim(), offset: 0 };
  const v = parseFloat(m[3]) * (m[4] === 'ms' ? 0.001 : 1);
  return { rest: m[1].trim(), offset: m[2] === '-' ? -v : v };
}

const stripQuotes = (s: string) => {
  const t = s.trim();
  if (t.length >= 2 && ((t[0] === '"' && t.endsWith('"')) || (t[0] === "'" && t.endsWith("'")) || (t[0] === '“' && t.endsWith('”')))) return t.slice(1, -1).trim();
  return t;
};

export function parseAnchor(raw: unknown): AnchorSpec {
  if (typeof raw === 'number') throw new AnchorError(`bare number ${raw} is not an anchor; use o:${raw} for a time or quote a phrase`);
  if (typeof raw !== 'string' || !raw.trim()) throw new AnchorError(`expected an anchor (w123, "a phrase", o:12.5), got ${JSON.stringify(raw)}`);
  const { rest, offset } = parseOffset(raw);
  let body = rest;
  let m = /^w(\d+)$/i.exec(body);
  if (m) return { kind: 'word', raw, index: parseInt(m[1], 10), offset };
  m = /^o:\s*(?:(\d+):)?(\d+(?:\.\d+)?|\.\d+)$/i.exec(body);
  if (m) return { kind: 'time', raw, seconds: (m[1] ? parseInt(m[1], 10) * 60 : 0) + parseFloat(m[2]), offset };
  m = /^f:\s*(\d+)$/i.exec(body);
  if (m) return { kind: 'frame', raw, frame: parseInt(m[1], 10), offset };
  if (/^o:/i.test(body)) throw new AnchorError(`bad time anchor "${body}"; use o:61.5 or o:1:01.5`);
  let occurrence = 1;
  const occ = (s: string) => {
    const mm = /^(.*?)\s*#(\d+)$/.exec(s);
    if (mm) {
      occurrence = parseInt(mm[2], 10);
      return mm[1];
    }
    return s;
  };
  body = occ(stripQuotes(occ(body)));
  if (occurrence < 1) throw new AnchorError(`occurrence #${occurrence} must be 1 or more`);
  const tokens = normalizeTokens(body);
  if (tokens.length === 0) throw new AnchorError(`phrase "${body}" has no words`);
  return { kind: 'phrase', raw, phrase: body, tokens, occurrence, offset };
}

// `hold: 2.5s` / `hold: 2.5` / `hold: 500ms` -> seconds
export function parseDuration(raw: unknown): number {
  if (typeof raw === 'number' && isFinite(raw) && raw >= 0) return raw;
  if (typeof raw === 'string') {
    const m = /^\s*(\d+(?:\.\d+)?|\.\d+)\s*(ms|s)?\s*$/.exec(raw);
    if (m) return parseFloat(m[1]) * (m[2] === 'ms' ? 0.001 : 1);
  }
  throw new AnchorError(`expected a duration like 2.5s, got ${JSON.stringify(raw)}`);
}

// ---------- index ----------

type Tok = { t: string; w: number };

export class WordIndex {
  readonly words: Word[];
  readonly duration: number;
  private toks: Tok[] = [];
  private byId = new Map<string, number>();
  private compact = '';
  private charTok: number[] = []; // compact char -> token index
  private tokStart: number[] = []; // token -> compact start
  private tokEnd: number[] = []; // token -> compact end (exclusive)
  private tokStartSet = new Set<number>();
  private tokEndSet = new Set<number>();

  constructor(words: Word[]) {
    this.words = words;
    this.duration = words.length ? words[words.length - 1].end : 0;
    words.forEach((w, i) => {
      this.byId.set(w.id, i);
      for (const t of normalizeTokens(w.text)) this.toks.push({ t, w: i });
    });
    let pos = 0;
    this.toks.forEach((k, i) => {
      this.tokStart.push(pos);
      this.tokStartSet.add(pos);
      this.compact += k.t;
      for (let j = 0; j < k.t.length; j++) this.charTok.push(i);
      pos += k.t.length;
      this.tokEnd.push(pos);
      this.tokEndSet.add(pos);
    });
  }

  word(id: string): { index: number; word: Word } | undefined {
    const i = this.byId.get(id);
    if (i === undefined) return undefined;
    return { index: i, word: this.words[i] };
  }

  // All matches of the token sequence whose first word starts within [from, to).
  findAll(tokens: string[], from = -Infinity, to = Infinity): { first: number; last: number }[] {
    const out: { first: number; last: number }[] = [];
    const n = tokens.length;
    for (let i = 0; i + n <= this.toks.length; i++) {
      const w0 = this.words[this.toks[i].w];
      if (w0.start < from - 1e-6 || w0.start >= to - 1e-6) continue;
      let ok = true;
      for (let j = 0; j < n; j++) {
        if (this.toks[i + j].t !== tokens[j]) {
          ok = false;
          break;
        }
      }
      if (ok) out.push({ first: this.toks[i].w, last: this.toks[i + n - 1].w });
    }
    if (out.length) return dedupe(out);
    // Fallback: ignore word boundaries ("sub-agents" vs "subagents"), but matches must start and
    // end on token boundaries.
    const needle = tokens.join('');
    let p = this.compact.indexOf(needle);
    while (p !== -1) {
      if (this.tokStartSet.has(p) && this.tokEndSet.has(p + needle.length)) {
        const first = this.toks[this.charTok[p]].w;
        const last = this.toks[this.charTok[p + needle.length - 1]].w;
        const w0 = this.words[first];
        if (w0.start >= from - 1e-6 && w0.start < to - 1e-6) out.push({ first, last });
      }
      p = this.compact.indexOf(needle, p + 1);
    }
    return dedupe(out);
  }

  // Closest fuzzy match (for "did you mean" in errors).
  closest(tokens: string[], from = -Infinity, to = Infinity): { first: number; last: number; score: number } | null {
    const target = tokens.join(' ');
    let best: { first: number; last: number; score: number } | null = null;
    const n = tokens.length;
    for (let i = 0; i < this.words.length; i++) {
      const w0 = this.words[i];
      if (w0.start < from - 1e-6 || w0.start >= to - 1e-6) continue;
      const toks: string[] = [];
      for (let L = 1; L <= n + 2 && i + L - 1 < this.words.length; L++) {
        toks.push(...normalizeTokens(this.words[i + L - 1].text));
        if (L < Math.max(1, n - 1)) continue;
        const cand = toks.join(' ');
        const d = levenshtein(target, cand) / Math.max(target.length, cand.length, 1);
        if (!best || d < best.score - 1e-9) best = { first: i, last: i + L - 1, score: d };
      }
    }
    return best && best.score <= 0.5 ? best : null;
  }

  text(first: number, last: number): string {
    return this.words
      .slice(first, last + 1)
      .map((w) => w.text.trim())
      .join(' ')
      .replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
  }
}

const dedupe = (a: { first: number; last: number }[]) => {
  const seen = new Set<string>();
  return a.filter((m) => {
    const k = `${m.first}:${m.last}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
};

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const prev = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = tmp;
    }
  }
  return prev[b.length];
}

// ---------- resolution ----------

export type Window = { from: number; to: number; label?: string };

export type ResolveOptions = {
  mode: 'at' | 'until';
  fps?: number;
  // Windows searched in order for phrases. The first one is "the scene" for messages.
  windows?: Window[];
  // Allow a global fallback (with a warning). Default true.
  global?: boolean;
};

export type Resolved = {
  t: number; // seconds (offset applied)
  first?: number; // word indices of the match
  last?: number;
  warning?: string;
  outside?: boolean; // found only outside the windows
};

const fmt = (s: number) => s.toFixed(1);
const fmtWin = (w: Window) => `${w.label ? `${w.label} ` : ''}(${fmt(w.from)}–${fmt(w.to)} s)`;

export function resolveAnchor(raw: unknown, idx: WordIndex, opts: ResolveOptions): Resolved {
  const spec = parseAnchor(raw);
  return resolveSpec(spec, idx, opts);
}

export function resolveSpec(spec: AnchorSpec, idx: WordIndex, opts: ResolveOptions): Resolved {
  const until = opts.mode === 'until';
  if (spec.kind === 'time') return { t: spec.seconds + spec.offset };
  if (spec.kind === 'frame') {
    if (!opts.fps) throw new AnchorError('f: anchors need an fps');
    return { t: spec.frame / opts.fps + spec.offset };
  }
  if (spec.kind === 'word') {
    const hit = idx.word(`w${spec.index}`);
    if (!hit) throw new AnchorError(`word w${spec.index} does not exist (words go w0–${idx.words.at(-1)?.id ?? 'none'})`);
    return { t: (until ? hit.word.end : hit.word.start) + spec.offset, first: hit.index, last: hit.index };
  }
  const wins = opts.windows ?? [];
  const occLabel = spec.occurrence > 1 ? `#${spec.occurrence}` : '';
  for (const w of wins) {
    const hits = idx.findAll(spec.tokens, w.from, w.to);
    const h = hits[spec.occurrence - 1];
    if (h) return { t: (until ? idx.words[h.last].end : idx.words[h.first].start) + spec.offset, first: h.first, last: h.last };
  }
  const scene = wins[wins.length - 1]; // the widest window (the scene) is named in messages
  if (opts.global !== false || !scene) {
    const hits = idx.findAll(spec.tokens);
    const h = hits[spec.occurrence - 1];
    if (h) {
      const t = (until ? idx.words[h.last].end : idx.words[h.first].start) + spec.offset;
      if (!scene) return { t, first: h.first, last: h.last };
      return {
        t,
        first: h.first,
        last: h.last,
        outside: true,
        warning: `phrase "${spec.phrase}${occLabel}" not found in ${fmtWin(scene)}; using ${idx.words[h.first].id} at ${fmt(idx.words[h.first].start)} s`,
      };
    }
  }
  // Not found: build a helpful message.
  let msg = `phrase "${spec.phrase}${occLabel}" not found`;
  if (scene) msg += ` in ${fmtWin(scene)}`;
  if (spec.occurrence > 1) {
    const n = scene ? idx.findAll(spec.tokens, scene.from, scene.to).length : idx.findAll(spec.tokens).length;
    const g = idx.findAll(spec.tokens).length;
    msg += ` (it occurs ${n}× there, ${g}× in the whole video)`;
  }
  const near = scene ? idx.closest(spec.tokens, scene.from, scene.to) : null;
  const far = idx.closest(spec.tokens);
  const show = (c: { first: number; last: number }, out: boolean) =>
    `"${idx.text(c.first, c.last)}" at ${idx.words[c.first].id}${out ? ` (${fmt(idx.words[c.first].start)} s, outside)` : ''}`;
  if (near) msg += `; closest: ${show(near, false)}`;
  if (far && (!near || far.score < near.score - 0.05) && (!scene || idx.words[far.first].start < scene.from || idx.words[far.first].start >= scene.to)) msg += `${near ? '; elsewhere' : '; closest'}: ${show(far, true)}`;
  if (!near && !far) msg += '; nothing similar in the transcript (check spelling, or use a w-id from `screenplay brief`)';
  throw new AnchorError(msg);
}
