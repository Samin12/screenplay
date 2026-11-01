// Stage elements: authoring YAML -> `Element` (src/types.ts) with scene-relative frames.
// Used by talking.elements, stage.elements, board.nodes[].element and app `show:` beats.

import type { Element, ImageMark, Item, Rect, Tone } from '../src/types.ts';

export type P = (string | number)[];

// What the element compiler needs from the scene compiler. All frames are scene-relative.
export interface FrameCtx {
  fps: number;
  durFrames: number;
  // Resolve an `at` anchor to a frame. Missing raw -> dflt. Errors are recorded and dflt returned.
  // `from`: phrases are searched from this frame onward first (items inside an element), then in
  // the whole scene.
  at(raw: unknown, path: P, dflt: number, from?: number): number;
  // `until` (end of last word), searched from `from` onward first.
  until(raw: unknown, path: P, from: number, dflt: number): number;
  // End frame from `until` / `hold` on obj, else dflt. Always > frame and <= durFrames.
  holdEnd(obj: Record<string, unknown>, path: P, frame: number, dflt: number): number;
  err(path: P, msg: string): void;
  warn(path: P, msg: string): void;
  text(path: P, s: unknown, headline?: boolean): string; // records on-screen text
  icon(path: P, name: unknown): string | undefined; // records lucide icon names
  media(path: P, src: unknown): string; // records media paths, returns normalised relative path
  probe?(src: string): [number, number] | null; // pixel size of a media file in the work dir, if known
}

export const ELEMENT_FIELDS: Record<string, string[]> = {
  title: ['text', 'sub', 'logo', 'size'],
  iconlist: ['items'],
  bullets: ['title', 'items'],
  chips: ['items'],
  flow: ['nodes', 'arrows', 'direction'],
  tree: ['root', 'children'],
  compare: ['columns'],
  counter: ['value', 'prefix', 'suffix', 'decimals', 'label'],
  stat: ['items'],
  keys: ['keys', 'label', 'press'],
  table: ['columns', 'rows', 'highlight'],
  tweet: ['name', 'handle', 'avatar', 'text', 'meta', 'mark', 'sticker', 'label'],
  sticker: ['text', 'rotate'],
  image: ['src', 'caption', 'source', 'url', 'crop', 'size', 'highlight', 'start'],
  prompt: ['text', 'label', 'cps'],
  grid: ['count', 'columns', 'lit', 'label'],
  quote: ['text', 'by', 'mark'],
  lower: ['title', 'sub'],
  cta: ['text', 'sub', 'icon'],
};
export const ELEMENT_TYPES = Object.keys(ELEMENT_FIELDS);
const COMMON = ['type', 'at', 'until', 'hold'];
const TONES: Tone[] = ['accent', 'good', 'bad', 'info', 'warn', 'muted'];

export const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const num = (v: unknown): number | undefined => (typeof v === 'number' && isFinite(v) ? v : typeof v === 'string' && v.trim() && isFinite(Number(v)) ? Number(v) : undefined);

export type ElementEnv = { frame: number; end: number; staggerS?: number };

export function compileElement(raw: unknown, path: P, ctx: FrameCtx, env: ElementEnv): Element | null {
  if (!isObj(raw)) {
    ctx.err(path, `expected an element object like {type: title, text: ...}, got ${JSON.stringify(raw)}`);
    return null;
  }
  const type = raw.type;
  if (typeof type !== 'string' || !ELEMENT_FIELDS[type]) {
    ctx.err([...path, 'type'], `unknown element type ${JSON.stringify(type)}; use one of: ${ELEMENT_TYPES.join(', ')}`);
    return null;
  }
  for (const k of Object.keys(raw)) if (!COMMON.includes(k) && !ELEMENT_FIELDS[type].includes(k)) ctx.warn([...path, k], `unknown field "${k}" for ${type} (ignored); fields: ${ELEMENT_FIELDS[type].join(', ')}`);

  const frame = raw.at !== undefined ? ctx.at(raw.at, [...path, 'at'], env.frame) : env.frame;
  const end = ctx.holdEnd(raw, path, frame, Math.max(env.end, frame + 1));
  const stagger = Math.round((env.staggerS ?? 0.15) * ctx.fps);
  const base = { frame, end };

  const str = (k: string, headline = false, required = false): string | undefined => {
    const v = raw[k];
    if (v === undefined || v === null) {
      if (required) ctx.err([...path, k], `${type} needs \`${k}\``);
      return required ? '' : undefined;
    }
    return ctx.text([...path, k], v, headline);
  };

  // Anchored sub-feature: {text|phrase, at} -> {..., frame}
  const sub = (k: string, textKey: 'text' | 'phrase', d: number) => {
    const v = raw[k];
    if (v === undefined) return undefined;
    if (typeof v === 'string') return { [textKey]: textKey === 'text' ? ctx.text([...path, k], v) : v, frame: d } as Record<string, unknown> & { frame: number };
    if (!isObj(v)) {
      ctx.err([...path, k], `expected {${textKey}, at}`);
      return undefined;
    }
    const t = v[textKey];
    if (typeof t !== 'string') ctx.err([...path, k, textKey], `${k} needs \`${textKey}\``);
    const f = clamp(v.at !== undefined ? ctx.at(v.at, [...path, k, 'at'], d, frame) : d, frame, end - 1);
    return { [textKey]: textKey === 'text' ? ctx.text([...path, k, textKey], t ?? '') : String(t ?? ''), frame: f } as Record<string, unknown> & { frame: number };
  };

  const items = (k: string, opts: { required?: boolean; from?: number; textKey?: string } = {}): Item[] => {
    const arr = raw[k];
    if (arr === undefined) {
      if (opts.required !== false) ctx.err([...path, k], `${type} needs \`${k}:\` (a list)`);
      return [];
    }
    if (!Array.isArray(arr)) {
      ctx.err([...path, k], `\`${k}\` must be a list`);
      return [];
    }
    return arr.map((it, i) => compileItem(it, [...path, k, i], ctx, (opts.from ?? frame) + i * stagger, frame, end));
  };

  switch (type) {
    case 'title': {
      const size = raw.size;
      if (size !== undefined && !['xl', 'l', 'm'].includes(String(size))) ctx.warn([...path, 'size'], `size must be xl, l or m`);
      const logo = raw.logo === undefined || raw.logo === null ? undefined : raw.logo === 'claude' ? 'claude' : ctx.media([...path, 'logo'], raw.logo);
      return { type, ...base, text: str('text', true, true)!, sub: str('sub'), logo, size: ['xl', 'l', 'm'].includes(String(size)) ? (size as 'xl') : undefined };
    }
    case 'iconlist':
      return { type, ...base, items: items('items') };
    case 'bullets':
      return { type, ...base, title: str('title', true), items: items('items') };
    case 'chips':
      return { type, ...base, items: items('items') };
    case 'stat':
      return { type, ...base, items: items('items') };
    case 'flow': {
      const nodes = items('nodes');
      const arrowsRaw = raw.arrows;
      let arrows: { label?: string; tone?: Tone; frame: number }[] | undefined;
      if (Array.isArray(arrowsRaw)) {
        arrows = arrowsRaw.map((a, i) => {
          const p = [...path, 'arrows', i];
          const d = nodes[i + 1]?.frame ?? nodes[i]?.frame ?? frame;
          if (typeof a === 'string') return { label: ctx.text(p, a), frame: d };
          if (!isObj(a)) {
            ctx.err(p, 'arrow must be {label, tone, at}');
            return { frame: d };
          }
          return { label: a.label === undefined ? undefined : ctx.text([...p, 'label'], a.label), tone: tone(a.tone, [...p, 'tone'], ctx), frame: clamp(a.at !== undefined ? ctx.at(a.at, [...p, 'at'], d, frame) : d, frame, end - 1) };
        });
        if (arrows.length > Math.max(0, nodes.length - 1) && raw.direction !== 'loop') ctx.warn([...path, 'arrows'], `${arrows.length} arrows for ${nodes.length} nodes (row flows need nodes-1 arrows)`);
      } else if (arrowsRaw !== undefined) ctx.err([...path, 'arrows'], '`arrows` must be a list');
      const direction = raw.direction === undefined ? undefined : raw.direction === 'loop' || raw.direction === 'row' ? raw.direction : (ctx.warn([...path, 'direction'], 'direction must be row or loop'), undefined);
      return { type, ...base, nodes, arrows, direction } as Element;
    }
    case 'tree': {
      const root = raw.root === undefined ? (ctx.err([...path, 'root'], 'tree needs `root: {text, icon}`'), { text: '', frame }) : compileItem(raw.root, [...path, 'root'], ctx, frame, frame, end);
      return { type, ...base, root, children: items('children', { from: frame + stagger }) };
    }
    case 'compare': {
      const cols = raw.columns;
      if (!Array.isArray(cols)) {
        ctx.err([...path, 'columns'], 'compare needs `columns: [{title, rows: [...]}]`');
        return { type, ...base, columns: [] };
      }
      const columns = cols.map((col, i) => {
        const p = [...path, 'columns', i];
        if (!isObj(col)) {
          ctx.err(p, 'column must be {title, icon, at, highlight, rows}');
          return { title: '', frame, rows: [] };
        }
        const cf = clamp(col.at !== undefined ? ctx.at(col.at, [...p, 'at'], frame + i * stagger, frame) : frame + i * stagger, frame, end - 1);
        const rows = Array.isArray(col.rows) ? col.rows.map((r, j) => compileItem(r, [...p, 'rows', j], ctx, cf + j * stagger, cf, end)) : (col.rows !== undefined && ctx.err([...p, 'rows'], '`rows` must be a list'), []);
        const highlightFrame = col.highlightAt !== undefined ? clamp(ctx.at(col.highlightAt, [...p, 'highlightAt'], cf, frame), frame, end - 1) : undefined;
        return { title: ctx.text([...p, 'title'], col.title ?? '', true), icon: ctx.icon([...p, 'icon'], col.icon), frame: cf, rows, highlight: col.highlight === undefined ? (col.highlightAt !== undefined ? true : undefined) : !!col.highlight, highlightFrame };
      });
      return { type, ...base, columns };
    }
    case 'counter': {
      const value = num(raw.value);
      if (value === undefined) ctx.err([...path, 'value'], 'counter needs a numeric `value`');
      return { type, ...base, value: value ?? 0, prefix: str('prefix'), suffix: str('suffix'), label: str('label'), decimals: num(raw.decimals) };
    }
    case 'keys': {
      const keys = Array.isArray(raw.keys) ? raw.keys.map((k, i) => ctx.text([...path, 'keys', i], k)) : (ctx.err([...path, 'keys'], 'keys needs `keys: [Ctrl, Alt, Space]`'), []);
      const press = raw.press !== undefined ? clamp(ctx.at(raw.press, [...path, 'press'], frame, frame), frame, end - 1) : frame;
      return { type, ...base, keys, label: str('label'), press };
    }
    case 'table': {
      const columns = Array.isArray(raw.columns) ? raw.columns.map((c, i) => ctx.text([...path, 'columns', i], c)) : (ctx.err([...path, 'columns'], 'table needs `columns: [..]`'), []);
      const rows = Array.isArray(raw.rows)
        ? raw.rows.map((r, i) => {
            const p = [...path, 'rows', i];
            if (Array.isArray(r)) return { label: ctx.text([...p, 0], r[0] ?? ''), cells: r.slice(1).map((c, j) => ctx.text([...p, j + 1], c)) };
            if (!isObj(r)) {
              ctx.err(p, 'row must be {label, cells: [..]}');
              return { label: '', cells: [] };
            }
            return { label: ctx.text([...p, 'label'], r.label ?? ''), cells: Array.isArray(r.cells) ? r.cells.map((c, j) => ctx.text([...p, 'cells', j], c)) : [] };
          })
        : (ctx.err([...path, 'rows'], 'table needs `rows: [{label, cells}]`'), []);
      let highlight: { column: number; frame: number } | undefined;
      if (isObj(raw.highlight)) {
        const h = raw.highlight;
        let col = num(h.column);
        if (col === undefined && typeof h.column === 'string') {
          col = columns.indexOf(h.column);
          if (col < 0) {
            ctx.err([...path, 'highlight', 'column'], `no column named "${h.column}" (columns: ${columns.join(', ')})`);
            col = 0;
          }
        }
        if (col === undefined) ctx.err([...path, 'highlight', 'column'], 'highlight needs `column` (index or column name)');
        highlight = { column: col ?? 0, frame: clamp(h.at !== undefined ? ctx.at(h.at, [...path, 'highlight', 'at'], frame, frame) : frame, frame, end - 1) };
      } else if (raw.highlight !== undefined) ctx.err([...path, 'highlight'], 'highlight must be {column, at}');
      return { type, ...base, columns, rows, highlight };
    }
    case 'tweet': {
      const text = str('text', false, true)!;
      const mark = sub('mark', 'phrase', frame) as { phrase: string; frame: number } | undefined;
      if (mark && !text.toLowerCase().includes(mark.phrase.toLowerCase())) ctx.warn([...path, 'mark', 'phrase'], `"${mark.phrase}" does not appear in the tweet text`);
      const avatar = raw.avatar === undefined ? undefined : /^https?:/.test(String(raw.avatar)) ? String(raw.avatar) : ctx.media([...path, 'avatar'], raw.avatar);
      return {
        type,
        ...base,
        name: str('name', false, true)!,
        handle: str('handle', false, true)!,
        avatar,
        text,
        meta: str('meta'),
        mark,
        sticker: sub('sticker', 'text', frame) as { text: string; frame: number } | undefined,
        label: sub('label', 'text', frame) as { text: string; frame: number } | undefined,
      };
    }
    case 'sticker':
      return { type, ...base, text: str('text', false, true)!, rotate: num(raw.rotate) };
    case 'image': {
      const src = raw.src === undefined ? (ctx.err([...path, 'src'], 'image needs `src`'), '') : ctx.media([...path, 'src'], raw.src);
      const size = raw.size !== undefined ? rect2(raw.size, [...path, 'size'], ctx) : (ctx.probe?.(src) ?? undefined);
      const mark = (h: unknown, p: P): ImageMark | undefined => {
        const r = Array.isArray(h) ? h : isObj(h) ? [h.x, h.y, h.w, h.h] : null;
        if (!r || r.length !== 4 || r.some((v) => num(v) === undefined)) {
          ctx.err(p, 'highlight must be {x, y, w, h, at, style} in media pixels');
          return undefined;
        }
        const at = isObj(h) && h.at !== undefined ? ctx.at(h.at, [...p, 'at'], frame, frame) : frame;
        const m: ImageMark = { x: num(r[0])!, y: num(r[1])!, w: num(r[2])!, h: num(r[3])!, frame: clamp(at, frame, end - 1) };
        if (isObj(h) && h.style !== undefined) {
          if (h.style === 'marker' || h.style === 'box' || h.style === 'ring') m.style = h.style;
          else ctx.err([...p, 'style'], 'style must be marker, box or ring');
        }
        return m;
      };
      // One highlight per spoken target: a list lands each mark on its own word.
      const list = Array.isArray(raw.highlight) && raw.highlight.some((v) => isObj(v) || Array.isArray(v));
      const highlights = list ? (raw.highlight as unknown[]).map((h, i) => mark(h, [...path, 'highlight', i])).filter((m): m is ImageMark => !!m) : undefined;
      const highlight = raw.highlight !== undefined && !list ? mark(raw.highlight, [...path, 'highlight']) : undefined;
      let crop: Rect | undefined;
      if (raw.crop !== undefined) {
        const c = raw.crop;
        if (Array.isArray(c) && c.length === 4 && c.every((v) => typeof v === 'number' && v >= 0)) crop = { x: c[0], y: c[1], w: c[2], h: c[3] };
        else ctx.err([...path, 'crop'], 'crop must be [x, y, w, h] in media pixels');
        if (crop && !size) ctx.err([...path, 'crop'], 'crop needs `size: [w, h]` (media pixels)');
      }
      const startS = num(raw.start);
      return { type, ...base, src, caption: str('caption'), source: str('source'), url: str('url'), crop, size, highlight, highlights, start: startS === undefined ? undefined : Math.round(startS * ctx.fps) };
    }
    case 'prompt':
      return { type, ...base, text: str('text', false, true)!, label: str('label'), cps: num(raw.cps) };
    case 'grid': {
      const count = num(raw.count);
      if (count === undefined || count < 1) ctx.err([...path, 'count'], 'grid needs `count` (number of tiles)');
      const n = Math.max(1, Math.round(count ?? 1));
      const columns = num(raw.columns) ?? (n <= 5 ? n : Math.ceil(Math.sqrt(n * 1.6)));
      const lit = Array.isArray(raw.lit)
        ? raw.lit.map((l, i) => {
            const p = [...path, 'lit', i];
            if (num(l) !== undefined) return { index: num(l)!, frame: frame + i * stagger };
            if (!isObj(l) || num(l.index) === undefined) {
              ctx.err(p, 'lit entries are {index, at}');
              return { index: 0, frame };
            }
            const idx = num(l.index)!;
            if (idx < 0 || idx > n) ctx.warn([...p, 'index'], `index ${idx} is outside the grid (count ${n})`);
            return { index: idx, frame: clamp(l.at !== undefined ? ctx.at(l.at, [...p, 'at'], frame, frame) : frame + i * stagger, frame, end - 1) };
          })
        : [];
      return { type, ...base, count: n, columns, lit, label: str('label') };
    }
    case 'quote': {
      const text = str('text', false, true)!;
      const mark = sub('mark', 'phrase', frame) as { phrase: string; frame: number } | undefined;
      if (mark && !text.toLowerCase().includes(mark.phrase.toLowerCase())) ctx.warn([...path, 'mark', 'phrase'], `"${mark.phrase}" does not appear in the quote text`);
      return { type, ...base, text, by: str('by'), mark };
    }
    case 'lower':
      return { type, ...base, title: str('title', true, true)!, sub: str('sub') };
    case 'cta':
      return { type, ...base, text: str('text', true, true)!, sub: str('sub'), icon: ctx.icon([...path, 'icon'], raw.icon) };
  }
  return null;
}

export function compileItem(raw: unknown, path: P, ctx: FrameCtx, dflt: number, lo: number, end: number): Item {
  const f0 = clamp(dflt, lo, Math.max(lo, end - 1));
  if (typeof raw === 'string' || typeof raw === 'number') return { text: ctx.text(path, raw), frame: f0 };
  if (!isObj(raw)) {
    ctx.err(path, 'item must be text or {text, icon, at}');
    return { text: '', frame: f0 };
  }
  const known = ['text', 'icon', 'at', 'sub', 'tone'];
  for (const k of Object.keys(raw)) if (!known.includes(k)) ctx.warn([...path, k], `unknown item field "${k}" (ignored); fields: ${known.join(', ')}`);
  if (raw.text === undefined) ctx.err([...path, 'text'], 'item needs `text`');
  let frame = f0;
  if (raw.at !== undefined) {
    const f = ctx.at(raw.at, [...path, 'at'], f0, lo);
    if (f < lo) ctx.warn([...path, 'at'], `item lands ${((lo - f) / ctx.fps).toFixed(1)} s before its element appears; clamped to the element's start`);
    frame = clamp(f, lo, Math.max(lo, end - 1));
  }
  const it: Item = { text: ctx.text([...path, 'text'], raw.text ?? ''), frame };
  const icon = ctx.icon([...path, 'icon'], raw.icon);
  if (icon) it.icon = icon;
  if (raw.sub !== undefined) it.sub = ctx.text([...path, 'sub'], raw.sub);
  const t = tone(raw.tone, [...path, 'tone'], ctx);
  if (t) it.tone = t;
  return it;
}

function tone(v: unknown, path: P, ctx: FrameCtx): Tone | undefined {
  if (v === undefined || v === null) return undefined;
  if (TONES.includes(v as Tone)) return v as Tone;
  ctx.warn(path, `unknown tone ${JSON.stringify(v)}; use one of: ${TONES.join(', ')}`);
  return undefined;
}

function rect2(v: unknown, path: P, ctx: FrameCtx): [number, number] | undefined {
  if (v === undefined) return undefined;
  if (Array.isArray(v) && v.length === 2 && v.every((x) => num(x) !== undefined)) return [num(v[0])!, num(v[1])!];
  ctx.err(path, 'size must be [width, height] in pixels');
  return undefined;
}
