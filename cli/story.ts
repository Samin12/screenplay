// `type: story`: a small animated scene written as stage directions (docs/EDIT-YAML.md "Stories").
// Actors stand on a fixed 1400x990 stage; beats (enter, move, say, count, ...) move them, each on a
// spoken word. Compiles to { actors, beats } with every anchor resolved to a scene-relative frame.
// `connect` and `draw` are lowered here to arrow actors + enter/exit beats, and an actor's own `at` to
// an enter beat, so the renderer only knows the core verbs.

import type { Element, StoryActor, StoryActorKind, StoryBeat, StoryPoint, StorySide, StorySwap, Tone } from '../src/types.ts';
import type { FrameCtx, P } from './elements.ts';
import { STORY_H, STORY_KINDS, STORY_W } from '../src/stage/elements/story/spec.ts';

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => !!v && typeof v === 'object' && !Array.isArray(v);
const num = (v: unknown): number | undefined => (typeof v === 'number' && isFinite(v) ? v : typeof v === 'string' && v.trim() && isFinite(Number(v)) ? Number(v) : undefined);
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const TONES: Tone[] = ['accent', 'good', 'bad', 'info', 'warn', 'muted'];

// Fields each actor kind takes on top of the common ones.
export const ACTOR_FIELDS: Record<StoryActorKind, string[]> = {
  icon: ['icon', 'tile', 'size'],
  person: ['wear'],
  car: [],
  taxi: ['value', 'prefix', 'suffix', 'decimals'],
  building: ['text'],
  office: ['text'],
  document: ['pages', 'title'],
  stack: ['count', 'text'],
  monitor: ['text', 'icon'],
  phone: ['text', 'icon'],
  notebook: ['title'],
  drawer: ['icons', 'open'],
  plane: [],
  tower: [],
  headset: [],
  text: ['text', 'size', 'w'],
  box: ['text', 'title', 'lines', 'icon', 'w'],
  card: ['text', 'title', 'lines', 'icon', 'w'],
  counter: ['value', 'prefix', 'suffix', 'decimals', 'size'],
  meter: ['value', 'style', 'w'],
  image: ['src', 'w', 'h'],
  arrow: ['from', 'to', 'curve', 'dashed'],
  path: ['from', 'to', 'curve', 'dashed'],
  bubble: ['on', 'text', 'style', 'side'],
  badge: ['text', 'icon'],
  sticker: ['text', 'size'],
};
const ACTOR_COMMON = ['id', 'kind', 'x', 'y', 'at', 'enter', 'scale', 'rotate', 'flip', 'label', 'role', 'sub', 'color', 'note'];
const KIND_ALIAS: Record<string, StoryActorKind> = { prop: 'icon', sign: 'badge', label: 'text', line: 'path', speech: 'bubble', gauge: 'meter', laptop: 'monitor', screen: 'monitor', files: 'stack', paper: 'document', page: 'document' };
const FLOATING: StoryActorKind[] = ['arrow', 'path']; // no position of their own
const COUNTABLE: StoryActorKind[] = ['counter', 'taxi', 'stack'];

export const STORY_VERBS = ['enter', 'exit', 'move', 'say', 'count', 'fill', 'connect', 'draw', 'highlight', 'pulse', 'swap', 'shake', 'follow', 'dim'] as const;
type Verb = (typeof STORY_VERBS)[number];
const VERB_FIELDS: Record<Verb, string[]> = {
  enter: ['style', 'pos'],
  exit: [],
  move: ['to', 'by', 'offset'],
  say: ['text', 'style', 'side'],
  count: ['to', 'ease'],
  fill: ['to'],
  connect: ['to', 'label', 'color', 'curve', 'dashed'],
  draw: [],
  highlight: [],
  pulse: [],
  swap: ['text', 'label', 'role', 'sub', 'title', 'lines', 'icon', 'color', 'pages', 'count', 'value', 'open'],
  shake: [],
  follow: ['scale'],
  dim: [],
};
const BEAT_COMMON = ['at', 'until', 'hold', 'note'];
// Default length in seconds when the beat has no until/hold. 0 = instant, -1 = until the next one / the end.
const DEFAULT_S: Record<Verb, number> = { enter: 0, exit: 0, move: 0.9, say: 2.5, count: 1.2, fill: 1, connect: -1, draw: 0, highlight: 2, pulse: 0, swap: 0, shake: 0, follow: -1, dim: 2.5 };

export function compileStory(raw: Obj, path: P, ctx: FrameCtx, frame: number, end: number): Element {
  const actors: StoryActor[] = [];
  const ids = new Map<string, StoryActor>();
  const beats: StoryBeat[] = [];
  const text = (p: P, v: unknown, headline = false) => ctx.text(p, v, headline);
  const lastF = Math.max(frame, end - 1);

  // ----- actors -----
  const rawActors = raw.actors;
  if (!Array.isArray(rawActors) || rawActors.length === 0) ctx.err([...path, 'actors'], 'story needs `actors:` (a list of {id, kind, x, y, ...})');
  const list = Array.isArray(rawActors) ? rawActors : [];
  const pending: { a: StoryActor; p: P; at: unknown; enter: unknown }[] = [];
  list.forEach((r, i) => {
    const p: P = [...path, 'actors', i];
    if (!isObj(r)) return ctx.err(p, 'actor must be {id, kind, x, y, label, ...}');
    let kind = r.kind as StoryActorKind;
    if (typeof r.kind === 'string' && KIND_ALIAS[r.kind]) kind = KIND_ALIAS[r.kind];
    if (typeof kind !== 'string' || !STORY_KINDS.includes(kind)) {
      ctx.err([...p, 'kind'], `unknown actor kind ${JSON.stringify(r.kind)}; use one of: ${STORY_KINDS.join(', ')}`);
      return;
    }
    const id = typeof r.id === 'string' || typeof r.id === 'number' ? String(r.id) : '';
    if (!id) return ctx.err([...p, 'id'], 'actor needs an `id` (beats refer to it)');
    if (!/^[A-Za-z0-9_-]+$/.test(id)) ctx.warn([...p, 'id'], `id "${id}" should be letters, digits, - or _`);
    if (id === 'all') return ctx.err([...p, 'id'], '`all` is reserved (follow: all)');
    if (ids.has(id)) return ctx.err([...p, 'id'], `duplicate actor id "${id}"`);
    for (const k of Object.keys(r)) if (!ACTOR_COMMON.includes(k) && !ACTOR_FIELDS[kind].includes(k)) ctx.warn([...p, k], `unknown field "${k}" for a ${kind} actor (ignored); fields: ${[...ACTOR_COMMON.filter((c) => c !== 'note' && c !== 'sub'), ...ACTOR_FIELDS[kind]].join(', ')}`);

    const a: StoryActor = { id, kind, x: num(r.x) ?? NaN, y: num(r.y) ?? NaN };
    if (r.x !== undefined && num(r.x) === undefined) ctx.err([...p, 'x'], 'x must be a number (story px, 0..1400)');
    if (r.y !== undefined && num(r.y) === undefined) ctx.err([...p, 'y'], 'y must be a number (story px, 0..990)');
    const s = num(r.scale);
    if (r.scale !== undefined) s !== undefined && s > 0 ? (a.scale = s) : ctx.err([...p, 'scale'], 'scale must be a positive number');
    if (num(r.rotate) !== undefined) a.rotate = num(r.rotate);
    if (r.flip !== undefined) a.flip = !!r.flip;
    if (r.label !== undefined) a.label = text([...p, 'label'], r.label);
    const role = r.role ?? r.sub;
    if (role !== undefined) a.role = text([...p, r.role !== undefined ? 'role' : 'sub'], role);
    if (r.color !== undefined) a.color = color(r.color, [...p, 'color'], ctx);
    if (r.text !== undefined) a.text = text([...p, 'text'], r.text);
    if (r.title !== undefined) a.title = text([...p, 'title'], r.title, true);
    if (r.lines !== undefined) a.lines = Array.isArray(r.lines) ? r.lines.map((l, j) => text([...p, 'lines', j], l)) : (ctx.err([...p, 'lines'], 'lines must be a list'), undefined);
    if (r.icon !== undefined) a.icon = ctx.icon([...p, 'icon'], r.icon);
    if (r.icons !== undefined) a.icons = Array.isArray(r.icons) ? r.icons.map((n, j) => ctx.icon([...p, 'icons', j], n) ?? '') : (ctx.err([...p, 'icons'], 'icons must be a list of lucide names'), undefined);
    if (r.tile !== undefined) a.tile = !!r.tile;
    for (const k of ['value', 'decimals', 'pages', 'count', 'size', 'w', 'h', 'curve'] as const) {
      if (r[k] === undefined) continue;
      const v = num(r[k]);
      if (v === undefined) ctx.err([...p, k], `${k} must be a number`);
      else a[k] = v;
    }
    if (r.prefix !== undefined) a.prefix = text([...p, 'prefix'], r.prefix);
    if (r.suffix !== undefined) a.suffix = text([...p, 'suffix'], r.suffix);
    if (r.open !== undefined) a.open = !!r.open;
    if (r.dashed !== undefined) a.dashed = !!r.dashed;
    if (r.wear !== undefined) ['tie', 'headset', 'glasses'].includes(String(r.wear)) ? (a.wear = r.wear as 'tie') : ctx.warn([...p, 'wear'], 'wear must be tie, headset or glasses');
    if (r.style !== undefined) {
      const ok = kind === 'meter' ? ['bar', 'dial'] : kind === 'bubble' ? ['speech', 'thought'] : [];
      ok.includes(String(r.style)) ? (a.style = r.style as 'bar') : ctx.warn([...p, 'style'], ok.length ? `style must be ${ok.join(' or ')}` : 'style is ignored');
    }
    if (r.side !== undefined) a.side = side(r.side, [...p, 'side'], ctx);
    if (r.src !== undefined) a.src = ctx.media([...p, 'src'], r.src);
    if (kind === 'image' && r.src === undefined) ctx.err([...p, 'src'], 'image actor needs `src` (a file in the work dir)');
    if ((kind === 'text' || kind === 'sticker' || kind === 'badge') && r.text === undefined) ctx.err([...p, 'text'], `${kind} actor needs \`text\``);
    if (kind === 'meter' && a.value !== undefined && (a.value < 0 || a.value > 100)) ctx.warn([...p, 'value'], 'meter value is a percentage, 0..100');
    if (kind === 'icon' && r.icon === undefined) ctx.err([...p, 'icon'], 'icon actor needs `icon` (a lucide name or claude)');
    if (r.enter !== undefined && !['blur', 'pop'].includes(String(r.enter))) ctx.warn([...p, 'enter'], 'enter must be blur or pop');
    ids.set(id, a);
    actors.push(a);
    pending.push({ a, p, at: r.at, enter: r.enter });
    if (r.from !== undefined) a.from = r.from as StoryPoint;
    if (r.to !== undefined) a.to = r.to as StoryPoint;
    if (r.on !== undefined) a.on = String(r.on);
  });

  // References between actors, once every id is known.
  const known = () => [...ids.keys()].join(', ');
  const ref = (v: unknown, p: P, what: string): string | undefined => {
    if (typeof v !== 'string' && typeof v !== 'number') {
      ctx.err(p, `${what} must be an actor id`);
      return undefined;
    }
    const id = String(v);
    if (!ids.has(id)) {
      ctx.err(p, `no actor "${id}"${near(id, [...ids.keys()])}; actors: ${known()}`);
      return undefined;
    }
    return id;
  };
  const point = (v: unknown, p: P, what: string): StoryPoint | undefined => {
    if (Array.isArray(v)) {
      if (v.length === 2 && v.every((x) => num(x) !== undefined)) return [num(v[0])!, num(v[1])!];
      ctx.err(p, `${what} must be an actor id or [x, y]`);
      return undefined;
    }
    return ref(v, p, what);
  };
  for (const { a, p } of pending) {
    if (a.kind === 'arrow' || a.kind === 'path') {
      a.from = a.from === undefined ? (ctx.err([...p, 'from'], `${a.kind} needs \`from\` (an actor id or [x, y])`), undefined) : point(a.from, [...p, 'from'], 'from');
      a.to = a.to === undefined ? (ctx.err([...p, 'to'], `${a.kind} needs \`to\` (an actor id or [x, y])`), undefined) : point(a.to, [...p, 'to'], 'to');
      if (a.from === undefined || a.to === undefined) a.hidden = true;
    } else if (a.kind === 'bubble') {
      if (a.on !== undefined) a.on = ref(a.on, [...p, 'on'], 'on');
      else if (Number.isNaN(a.x)) ctx.warn(p, 'bubble needs `on: <actor id>` (or x, y)');
      if (a.text === undefined) ctx.err([...p, 'text'], 'bubble needs `text`');
    }
  }

  // Auto layout: actors without x share the width evenly; without y they stand at 520.
  const placed = actors.filter((a) => !FLOATING.includes(a.kind) && !(a.kind === 'bubble' && a.on));
  const noX = placed.filter((a) => Number.isNaN(a.x));
  noX.forEach((a, k) => (a.x = Math.round((STORY_W * (k + 1)) / (noX.length + 1))));
  for (const a of actors) {
    if (Number.isNaN(a.x)) a.x = STORY_W / 2;
    if (Number.isNaN(a.y)) a.y = 520;
  }
  for (const { a, p } of pending) {
    if (FLOATING.includes(a.kind) || (a.kind === 'bubble' && a.on)) continue;
    if (a.x < 0 || a.x > STORY_W || a.y < 0 || a.y > STORY_H) ctx.warn(p, `actor "${a.id}" at [${a.x}, ${a.y}] is outside the ${STORY_W}x${STORY_H} stage`);
  }

  // ----- beats -----
  const beatAt = (v: unknown, p: P): number => {
    if (v === undefined || v === null) return frame;
    const f = ctx.at(v, p, frame, frame);
    if (f < frame) ctx.warn(p, `beat lands ${((frame - f) / ctx.fps).toFixed(1)} s before the story appears; clamped to its start`);
    return clamp(f, frame, lastF);
  };
  const explicit = new Set<StoryBeat>();
  // Actor `at:` = an enter beat on that word.
  for (const { a, p, at, enter } of pending) {
    if (at === undefined) continue;
    beats.push({ do: 'enter', frame: beatAt(at, [...p, 'at']), actor: a.id, ...(enter === 'pop' ? { style: 'pop' as const } : {}) });
  }

  const rawBeats = raw.beats;
  if (rawBeats !== undefined && !Array.isArray(rawBeats)) ctx.err([...path, 'beats'], '`beats` must be a list');
  let connects = 0;
  (Array.isArray(rawBeats) ? rawBeats : []).forEach((b, k) => {
    const p: P = [...path, 'beats', k];
    if (!isObj(b)) return ctx.err(p, 'beat must be a mapping like {at: "phrase", enter: cab}');
    let verbs = STORY_VERBS.filter((v) => b[v] !== undefined);
    if (verbs.includes('swap')) verbs = verbs.filter((v) => v !== 'count'); // swap's `count:` is a field
    if (verbs.length === 0) return ctx.err(p, `beat has no verb; use one of: ${STORY_VERBS.join(', ')}`);
    if (verbs.length > 1) return ctx.err(p, `one verb per beat, found ${verbs.join(' + ')}; split it into ${verbs.length} beats with the same \`at\``);
    const verb = verbs[0];
    for (const key of Object.keys(b)) if (key !== verb && !BEAT_COMMON.includes(key) && !VERB_FIELDS[verb].includes(key)) ctx.warn([...p, key], `unknown field "${key}" for a ${verb} beat (ignored); fields: ${['at', 'until', 'hold', ...VERB_FIELDS[verb]].join(', ')}`);
    const f = beatAt(b.at, [...p, 'at']);
    const dflt = DEFAULT_S[verb];
    const has = b.until !== undefined || b.hold !== undefined;
    if (dflt === 0 && has) ctx.warn([...p, b.until !== undefined ? 'until' : 'hold'], `\`${verb}\` is instant; until/hold ignored`);
    const dur = (dfltS: number) => {
      const d = dfltS < 0 ? end : Math.min(end, f + Math.max(1, Math.round(dfltS * ctx.fps)));
      return Math.max(1, Math.min(end, ctx.holdEnd(b, p, f, d)) - f);
    };
    const actor = (what = verb) => ref(b[what], [...p, what], what);
    const push = (beat: StoryBeat) => {
      beats.push(beat);
      if (has) explicit.add(beat);
    };
    switch (verb) {
      case 'enter':
      case 'draw': {
        const id = actor();
        if (!id) return;
        if (verb === 'draw' && !['arrow', 'path'].includes(ids.get(id)!.kind)) ctx.warn([...p, 'draw'], `draw is for arrow and path actors; "${id}" is a ${ids.get(id)!.kind} (it just enters)`);
        const beat: StoryBeat = { do: 'enter', frame: f, actor: id };
        if (b.style !== undefined) b.style === 'pop' || b.style === 'blur' ? (beat.style = b.style) : ctx.warn([...p, 'style'], 'style must be blur or pop');
        if (b.pos !== undefined) {
          const pt = point(b.pos, [...p, 'pos'], 'pos');
          if (Array.isArray(pt)) beat.pos = pt;
        }
        return push(beat);
      }
      case 'exit': {
        const id = actor();
        if (id) push({ do: 'exit', frame: f, actor: id });
        return;
      }
      case 'move': {
        const id = actor();
        if (!id) return;
        const beat: StoryBeat = { do: 'move', frame: f, dur: dur(dflt), actor: id };
        if (b.to !== undefined) beat.to = point(b.to, [...p, 'to'], 'to');
        else if (b.by !== undefined) {
          const by = point(b.by, [...p, 'by'], 'by');
          if (Array.isArray(by)) beat.by = by;
          else ctx.err([...p, 'by'], 'by must be [dx, dy]');
        } else ctx.err(p, 'move needs `to: [x, y]` (or an actor id) or `by: [dx, dy]`');
        if (b.offset !== undefined) {
          const o = b.offset;
          if (Array.isArray(o) && o.length === 2 && o.every((x) => num(x) !== undefined)) beat.offset = [num(o[0])!, num(o[1])!];
          else ctx.err([...p, 'offset'], 'offset must be [dx, dy]');
        }
        if (beat.to === id) ctx.warn([...p, 'to'], `"${id}" moves to itself`);
        return push(beat);
      }
      case 'say': {
        const id = actor();
        if (!id) return;
        if (typeof b.text !== 'string' && typeof b.text !== 'number') ctx.err([...p, 'text'], 'say needs `text:` (what goes in the bubble)');
        if (FLOATING.includes(ids.get(id)!.kind)) ctx.warn([...p, 'say'], `"${id}" is an ${ids.get(id)!.kind}; bubbles go on actors`);
        const beat: StoryBeat = { do: 'say', frame: f, dur: dur(dflt), actor: id, text: text([...p, 'text'], b.text ?? '') };
        if (b.style !== undefined) b.style === 'speech' || b.style === 'thought' ? (beat.style = b.style) : ctx.warn([...p, 'style'], 'style must be speech or thought');
        if (b.side !== undefined) beat.side = side(b.side, [...p, 'side'], ctx);
        return push(beat);
      }
      case 'count': {
        const id = actor();
        if (!id) return;
        const to = num(b.to);
        if (to === undefined) return ctx.err([...p, 'to'], 'count needs a number `to:` (where the number lands)');
        if (!COUNTABLE.includes(ids.get(id)!.kind)) ctx.warn([...p, 'count'], `count works on ${COUNTABLE.join(', ')} actors; "${id}" is a ${ids.get(id)!.kind}`);
        const beat: StoryBeat = { do: 'count', frame: f, dur: dur(dflt), actor: id, to };
        if (b.ease !== undefined) b.ease === 'linear' || b.ease === 'smooth' ? (beat.ease = b.ease) : ctx.warn([...p, 'ease'], 'ease must be linear or smooth');
        return push(beat);
      }
      case 'fill': {
        const id = actor();
        if (!id) return;
        let to = num(b.to);
        if (to === undefined) return ctx.err([...p, 'to'], 'fill needs `to:` (a percentage, 0..100)');
        if (to < 0 || to > 100) {
          ctx.warn([...p, 'to'], 'fill is a percentage, 0..100; clamped');
          to = clamp(to, 0, 100);
        }
        if (ids.get(id)!.kind !== 'meter') ctx.warn([...p, 'fill'], `fill works on meter actors; "${id}" is a ${ids.get(id)!.kind}`);
        return push({ do: 'fill', frame: f, dur: dur(dflt), actor: id, to });
      }
      case 'connect': {
        const from = point(b.connect, [...p, 'connect'], 'connect');
        const to = b.to === undefined ? (ctx.err([...p, 'to'], 'connect needs `to:` (an actor id or [x, y])'), undefined) : point(b.to, [...p, 'to'], 'to');
        if (from === undefined || to === undefined) return;
        let id = `connect-${++connects}`;
        while (ids.has(id)) id = `connect-${++connects}`;
        const arrow: StoryActor = { id, kind: 'arrow', x: 0, y: 0, hidden: true, from, to };
        if (b.label !== undefined) arrow.label = text([...p, 'label'], b.label);
        if (b.color !== undefined) arrow.color = color(b.color, [...p, 'color'], ctx);
        if (num(b.curve) !== undefined) arrow.curve = num(b.curve);
        if (b.dashed !== undefined) arrow.dashed = !!b.dashed;
        ids.set(id, arrow);
        actors.push(arrow);
        push({ do: 'enter', frame: f, actor: id });
        if (has) {
          const e = f + dur(dflt);
          if (e < end) beats.push({ do: 'exit', frame: e, actor: id });
        }
        return;
      }
      case 'highlight': {
        const id = actor();
        if (id) push({ do: 'highlight', frame: f, dur: dur(dflt), actor: id });
        return;
      }
      case 'pulse':
      case 'shake': {
        const id = actor();
        if (id) push({ do: verb, frame: f, actor: id });
        return;
      }
      case 'swap': {
        const id = actor();
        if (!id) return;
        const set: StorySwap = {};
        for (const key of ['text', 'label', 'title'] as const) if (b[key] !== undefined) set[key] = text([...p, key], b[key], key === 'title');
        if (b.role !== undefined || b.sub !== undefined) set.role = text([...p, b.role !== undefined ? 'role' : 'sub'], b.role ?? b.sub);
        if (b.lines !== undefined) Array.isArray(b.lines) ? (set.lines = b.lines.map((l, j) => text([...p, 'lines', j], l))) : ctx.err([...p, 'lines'], 'lines must be a list');
        if (b.icon !== undefined) set.icon = ctx.icon([...p, 'icon'], b.icon);
        if (b.color !== undefined) set.color = color(b.color, [...p, 'color'], ctx);
        if (b.open !== undefined) set.open = !!b.open;
        for (const key of ['pages', 'count', 'value'] as const) {
          if (b[key] === undefined) continue;
          const v = num(b[key]);
          v === undefined ? ctx.err([...p, key], `${key} must be a number`) : (set[key] = v);
        }
        if (Object.keys(set).length === 0) return ctx.err(p, `swap needs what changes: ${VERB_FIELDS.swap.filter((x) => x !== 'sub').join(', ')}`);
        return push({ do: 'swap', frame: f, actor: id, set });
      }
      case 'follow': {
        const v = b.follow;
        const beat: StoryBeat = { do: 'follow', frame: f };
        if (v === 'all' || v === false || v === null) {
          /* back to the whole stage */
        } else if (Array.isArray(v)) {
          if (v.length === 4 && v.every((x) => num(x) !== undefined) && num(v[2])! > 0 && num(v[3])! > 0) beat.rect = [num(v[0])!, num(v[1])!, num(v[2])!, num(v[3])!];
          else return ctx.err([...p, 'follow'], 'follow takes an actor id, all, or a region [x, y, w, h]');
        } else {
          const id = actor();
          if (!id) return;
          beat.actor = id;
        }
        if (b.scale !== undefined) {
          const sc = num(b.scale);
          sc !== undefined && sc >= 1 && sc <= 4 ? (beat.scale = sc) : ctx.warn([...p, 'scale'], 'scale must be 1..4');
        }
        if (has) beat.dur = dur(dflt);
        return push(beat);
      }
      case 'dim': {
        const v = b.dim;
        const keep = (Array.isArray(v) ? v : [v]).map((x, j) => ref(x, Array.isArray(v) ? [...p, 'dim', j] : [...p, 'dim'], 'dim')).filter((x): x is string => !!x);
        if (keep.length) push({ do: 'dim', frame: f, dur: dur(dflt), keep });
        return;
      }
    }
  });

  beats.sort((x, y) => x.frame - y.frame);

  // A bubble without until/hold gives way to the next one on the same actor.
  beats.forEach((bt, i) => {
    if (bt.do !== 'say' || explicit.has(bt)) return;
    const next = beats.slice(i + 1).find((o) => o.do === 'say' && o.actor === bt.actor);
    if (next) bt.dur = Math.max(1, Math.min(bt.dur, next.frame - bt.frame));
  });

  // Visibility: hidden at the start iff its first enter/exit beat is an enter (or it has its own `at`).
  for (const a of actors) {
    const first = beats.find((bt) => (bt.do === 'enter' || bt.do === 'exit') && bt.actor === a.id);
    if (first?.do === 'enter') a.hidden = true;
  }
  // Beats on an actor that is not on stage yet (or already gone) are almost always a mistake.
  const onStage = (id: string, f: number) => {
    let vis = !ids.get(id)?.hidden;
    for (const bt of beats) {
      if (bt.frame > f) break;
      if ((bt.do === 'enter' || bt.do === 'exit') && bt.actor === id) vis = bt.do === 'enter';
    }
    return vis;
  };
  if (Array.isArray(rawBeats)) {
    for (const bt of beats) {
      if (!('actor' in bt) || !bt.actor || ['enter', 'exit', 'move', 'swap', 'follow'].includes(bt.do)) continue;
      if (!onStage(bt.actor, bt.frame)) {
        const k = rawBeats.findIndex((r) => isObj(r) && r[bt.do] === bt.actor);
        ctx.warn(k >= 0 ? [...path, 'beats', k] : [...path, 'beats'], `${bt.do} on "${bt.actor}" lands while it is off stage (add an enter beat before it)`);
      }
    }
  }

  for (const a of actors) if (a.hidden === false) delete a.hidden;
  const out: Element = { type: 'story', frame, end, actors, beats };
  if (raw.title !== undefined) out.title = text([...path, 'title'], raw.title, true);
  return out;
}

function color(v: unknown, p: P, ctx: FrameCtx): string | undefined {
  if (typeof v === 'string' && (TONES.includes(v as Tone) || /^#[0-9a-f]{3,8}$/i.test(v))) return v;
  ctx.warn(p, `color must be one of ${TONES.join(', ')} or a #hex`);
  return undefined;
}

function side(v: unknown, p: P, ctx: FrameCtx): StorySide | undefined {
  if (['top', 'bottom', 'left', 'right'].includes(String(v))) return v as StorySide;
  ctx.warn(p, 'side must be top, bottom, left or right');
  return undefined;
}

function near(name: string, list: string[]): string {
  const lev = (a: string, b: string) => {
    const dp = Array.from({ length: b.length + 1 }, (_, j) => j);
    for (let i = 1; i <= a.length; i++) {
      let diag = dp[0];
      dp[0] = i;
      for (let j = 1; j <= b.length; j++) {
        const t = dp[j];
        dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
        diag = t;
      }
    }
    return dp[b.length];
  };
  const best = list.map((k) => ({ k, d: lev(name.toLowerCase(), k.toLowerCase()) })).sort((a, b) => a.d - b.d)[0];
  return best && best.d <= Math.max(2, name.length / 3) ? ` (did you mean "${best.k}"?)` : '';
}
