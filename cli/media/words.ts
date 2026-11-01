// Turning raw transcripts (whisper.cpp full JSON, user/cutroom word lists) into clean words.json entries.
import { isAnnotation, isPunct, normWord } from './text.ts';
import type { Word } from './types.ts';

type WhisperToken = { text: string; offsets: { from: number; to: number }; p?: number; t_dtw?: number };
type WhisperJson = { transcription: { text: string; offsets: { from: number; to: number }; tokens?: WhisperToken[] }[] };

type Draft = { text: string; start: number; end: number; timed: boolean };

/** Special whisper tokens: [_BEG_], [_TT_123], <|endoftext|>, ... */
function isSpecialToken(text: string): boolean {
  return /^\[_[A-Z]+_?\d*\]$/.test(text) || /^<\|.*\|>$/.test(text);
}

/**
 * whisper.cpp `-ojf` output → words. Sub-word tokens are merged (a token without a leading space continues
 * the current word), punctuation is attached to the preceding word without stretching its timing, and
 * special tokens / [BLANK_AUDIO]-style annotations are dropped. `offset` (seconds) is added to every time.
 */
export type ParseOptions = {
  minSegmentProb?: number; // skip segments whose mean token probability is lower (hallucination guard)
  prompt?: string; // the --prompt given to whisper: segments that parrot 4+ of its words in a row are dropped
};

/** True when `text` contains `run` consecutive words of `prompt` (whisper parroting its prompt on near-silence). */
export function parrotsPrompt(text: string, prompt: string, run = 4): boolean {
  const t = text.split(/\s+/).map(normWord).filter(Boolean);
  const p = prompt.split(/\s+/).map(normWord).filter(Boolean);
  for (let i = 0; i + run <= t.length; i++)
    for (let j = 0; j + run <= p.length; j++) {
      let k = 0;
      while (k < run && t[i + k] === p[j + k]) k++;
      if (k === run) return true;
    }
  return false;
}

export function parseWhisperJson(json: WhisperJson, offset = 0, opts: ParseOptions = {}): Word[] {
  const drafts: Draft[] = [];
  for (const seg of json.transcription ?? []) {
    let first = true;
    const tokens = seg.tokens ?? [{ text: seg.text, offsets: seg.offsets }];
    if (isAnnotation(seg.text ?? '') || (opts.prompt && parrotsPrompt(seg.text ?? '', opts.prompt))) continue;
    if (opts.minSegmentProb) {
      const ps = tokens.filter((t) => !isSpecialToken((t.text ?? '').trim()) && typeof t.p === 'number').map((t) => t.p as number);
      if (!ps.length || ps.reduce((a, b) => a + b, 0) / ps.length < opts.minSegmentProb) continue;
    }
    for (const tok of tokens) {
      const raw = tok.text ?? '';
      if (!raw || isSpecialToken(raw.trim())) continue;
      // Replacement characters come from multi-byte characters split across tokens; quotes are noise in
      // a spoken transcript. Drop both.
      const text = raw.replace(/[�"“”]/g, '');
      if (!text.trim()) continue;
      const last = drafts[drafts.length - 1];
      // A token right after clause punctuation starts a new word even without a space (`like,"Okay`).
      const startsWord = first || /^\s/.test(text) || (last !== undefined && /[,;:!?]$/.test(last.text) && /^\p{L}/u.test(text));
      first = false;
      const t0 = tok.offsets.from / 1000 + offset;
      const t1 = tok.offsets.to / 1000 + offset;
      const opens = /^\s*[\[(]/.test(text); // "[BLANK_AUDIO]", "(laughs)" start their own (dropped) word
      if (isPunct(text) && !opens) {
        if (last) last.text += text.trim();
        else drafts.push({ text: text.trim(), start: t0, end: t1, timed: false });
        continue;
      }
      if (startsWord || opens || !last || /[\])]$/.test(last.text)) drafts.push({ text: text.trim(), start: t0, end: t1, timed: true });
      else {
        last.text += text;
        last.end = Math.max(last.end, t1);
        last.timed = true;
      }
    }
  }
  return finalise(drafts);
}

type LooseWord = { text?: string; word?: string; start?: number; end?: number; start_ms?: number; end_ms?: number; startMs?: number; endMs?: number };

/** Any reasonable word list ([{text,start,end}], {words:[...]}, cutroom's start_ms/end_ms) → clean words. */
export function normaliseWords(input: unknown, offset = 0): Word[] {
  const list: LooseWord[] = Array.isArray(input)
    ? (input as LooseWord[])
    : input && typeof input === 'object' && Array.isArray((input as { words?: unknown }).words)
      ? ((input as { words: LooseWord[] }).words)
      : [];
  if (!list.length) throw new Error('word list is empty or not in a known format ([{text,start,end}])');
  const drafts: Draft[] = [];
  for (const w of list) {
    const text = String(w.text ?? w.word ?? '').trim();
    let start = w.start ?? (w.start_ms ?? w.startMs ?? NaN) / 1000;
    let end = w.end ?? (w.end_ms ?? w.endMs ?? NaN) / 1000;
    if (!Number.isFinite(start)) continue;
    if (!Number.isFinite(end)) end = start;
    start += offset;
    end += offset;
    // A whole multi-word string in one entry ("thank you"): split it evenly.
    const parts = text.split(/\s+/).filter(Boolean);
    if (!parts.length) continue;
    const step = (end - start) / parts.length;
    parts.forEach((p, k) => {
      if (isPunct(p) && drafts.length) drafts[drafts.length - 1].text += p;
      else drafts.push({ text: p, start: start + k * step, end: start + (k + 1) * step, timed: true });
    });
  }
  drafts.sort((a, b) => a.start - b.start);
  return finalise(drafts);
}

function finalise(drafts: Draft[]): Word[] {
  // Drop annotations ([BLANK_AUDIO], (music)) and orphan punctuation.
  const kept = drafts.filter((d) => d.text && !isAnnotation(d.text) && !isPunct(d.text));
  const out: Word[] = [];
  for (const d of kept) {
    let start = d.start;
    let end = Math.max(d.end, d.start);
    const prev = out[out.length - 1];
    if (prev) {
      if (start < prev.start) start = prev.start;
      if (start < prev.end) {
        // Overlap: split the difference so neither word swallows the other.
        const mid = Math.max(prev.start, (prev.end + start) / 2);
        prev.end = round(mid);
        start = mid;
      }
      if (end < start) end = start;
    }
    out.push({ i: out.length, text: d.text.replace(/\s+/g, ' '), start: round(start), end: round(end) });
  }
  return out;
}

function round(x: number): number {
  return Math.round(x * 1000) / 1000;
}
