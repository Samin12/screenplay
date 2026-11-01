// Pure text helpers shared by transcription cleanup, cut detection and the brief.

/** Lowercase comparison form of a word: no punctuation, straight apostrophes, no trailing dashes. */
export function normWord(text: string): string {
  return text
    .toLowerCase()
    .replace(/[‘’ʼ`]/g, "'")
    .replace(/[“”"«»]/g, '')
    .replace(/^[^\p{L}\p{N}$£€]+/u, '')
    .replace(/[^\p{L}\p{N}%]+$/u, '');
}

/** True when the token is nothing but punctuation / dashes / ellipsis. */
export function isPunct(text: string): boolean {
  return /^[\s.,!?;:…\-–—"'“”‘’()\[\]]+$/.test(text) && text.trim().length > 0;
}

/** Non-speech annotations whisper emits: [BLANK_AUDIO], (music), *laughs*, ♪ ... */
export function isAnnotation(text: string): boolean {
  const t = text.trim();
  return /^\[.*\]$/.test(t) || /^\(.*\)$/.test(t) || /^\*.*\*$/.test(t) || /^[♪♫\s]+$/.test(t) || /^>>/.test(t);
}

export function endsSentence(text: string): boolean {
  return /[.!?…]["'”’)]*$/.test(text.trim()) && !/(\.\.|-|—|–)$/.test(text.trim());
}

/** Clause-level break: comma, semicolon, colon, or any sentence end. */
export function endsClause(text: string): boolean {
  return /[,;:.!?…]["'”’)]*$/.test(text.trim()) || isCutOff(text);
}

/** Whisper marks interrupted words / abandoned phrases with a trailing dash: "literally-", "my--". */
export function isCutOff(text: string): boolean {
  return /\p{L}(-|--|—|–|\.\.\.)$/u.test(text.trim());
}

// Single-word fillers that are (practically) never content.
const FILLERS = new Set(['um', 'uh', 'umm', 'uhm', 'uhh', 'erm', 'er', 'ehm', 'hmm', 'hm', 'mm', 'mmm', 'mhm', 'ah', 'ahh', 'eh']);

export function isFiller(norm: string): boolean {
  return FILLERS.has(norm);
}

/** Words that can open a clause without carrying content. Used to extend a retake cut to the clause start. */
const CONNECTIVES = new Set(['and', 'so', 'but', 'or', 'even', 'like', 'okay', 'ok', 'well', 'now', 'then', 'also', 'um', 'uh', 'right', 'yeah', 'alright']);

export function isConnective(norm: string): boolean {
  return CONNECTIVES.has(norm);
}

/** Doubled words that are often legitimate ("that that", "had had", "really really"). */
const LEGIT_DOUBLES = new Set(['that', 'had', 'is', 'do', 'very', 'really', 'so', 'no', 'yeah', 'bye', 'ha', 'haha', 'go', 'hey', 'many', 'more', 'much', 'super']);

export function isLegitDouble(norm: string): boolean {
  return LEGIT_DOUBLES.has(norm);
}

/** Levenshtein distance (small strings). */
export function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (!m) return n;
  if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, k) => k);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[n];
}

/** Same word, allowing small mishearings on words of 4+ letters ("leaves"/"leave", "live"/"leave"). */
export function similarWord(a: string, b: string): boolean {
  if (a === b) return a.length > 0;
  if (a.length < 4 || b.length < 4) return false;
  const d = editDistance(a, b);
  return d <= 1 || (d === 2 && a[0] === b[0] && a[a.length - 1] === b[b.length - 1]);
}

/** Joins word texts into readable text. */
export function joinWords(texts: string[]): string {
  return texts.join(' ').replace(/\s+([,.!?;:])/g, '$1').trim();
}

export function capitalise(s: string): string {
  return s.replace(/^(["'“‘(]*)(\p{Ll})/u, (_, p: string, c: string) => p + c.toUpperCase());
}

export function truncate(s: string, n: number): string {
  return s.length <= n ? s : s.slice(0, n - 1).trimEnd() + '…';
}
