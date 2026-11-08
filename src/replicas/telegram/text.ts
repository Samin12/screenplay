// Pure message logic: no React, so the tests can import it under plain Node.

export type Span = { kind: 'text' | 'bold' | 'link'; text: string };
export type Line = { blank: true } | { blank: false; n: number; spans: Span[] };

const INLINE = /(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\)|https?:\/\/[^\s)]+)/g;

export const parseSpans = (s: string): Span[] =>
  s
    .split(INLINE)
    .filter((p) => p !== '')
    .map((p): Span => {
      if (p.startsWith('**') && p.endsWith('**') && p.length > 4) return { kind: 'bold', text: p.slice(2, -2) };
      const md = /^\[([^\]]+)\]\([^)]+\)$/.exec(p);
      if (md) return { kind: 'link', text: md[1] };
      if (/^https?:\/\//.test(p)) return { kind: 'link', text: p };
      return { kind: 'text', text: p };
    });

// One Line per \n. `n` numbers the lines that have text, 1-based: the k of msg-<id>-line-<k>. A
// bullet is just a line starting "• " and wraps back to the left edge, as it does in Telegram.
export const parseLines = (text: string | undefined): Line[] => {
  let n = 0;
  return String(text ?? '')
    .split('\n')
    .map((l): Line => (l.trim() === '' ? { blank: true } : { blank: false, n: ++n, spans: parseSpans(l) }));
};

type Identified = { id: string };

// How many messages `upto` shows: a count, a message id (up to and including it), or null for all.
export const visibleCount = (messages: Identified[], upto: unknown): number => {
  if (typeof upto === 'number') return Math.max(0, Math.min(messages.length, Math.floor(upto)));
  if (typeof upto === 'string') {
    const i = messages.findIndex((m) => m.id === upto);
    return i < 0 ? messages.length : i + 1;
  }
  return messages.length;
};

export type StateChange = { frame: number; prev: unknown };

// id -> frame it arrived on, for the messages the last `upto` or `append` change revealed.
export const arrivals = (messages: Identified[], append: Identified[], changes: Record<string, StateChange> | undefined): Record<string, number> => {
  const out: Record<string, number> = {};
  const up = changes?.upto;
  if (up) {
    // No previous value means the replica's default: everything was already showing.
    const from = up.prev === undefined ? messages.length : visibleCount(messages, up.prev);
    for (const m of messages.slice(from)) out[m.id] = up.frame;
  }
  const ap = changes?.append;
  if (ap) {
    const from = Array.isArray(ap.prev) ? ap.prev.length : 0;
    for (const m of append.slice(from)) out[m.id] = ap.frame;
  }
  return out;
};
