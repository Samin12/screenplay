// edit.yaml + words.out.json + aroll.json (+ source.json) -> work/.screenplay/timeline.json
//
// Everything in docs/EDIT-YAML.md that turns words into frames lives here. Frames inside scenes are
// relative to the scene start (src/types.ts). Errors carry the YAML path and line so the editing
// agent can fix them without guessing.

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import YAML, { LineCounter, isNode } from 'yaml';
import { AnchorError, WordIndex, parseDuration, resolveAnchor, type Window, type Word } from './anchors.ts';
import { compileElement, isObj, type FrameCtx, type P } from './elements.ts';
import { CliError, buildDir, c, fmtClock, parseArgs, readJson, workDir, writeFileAtomic } from './util.ts';
import type {
  Action,
  AppScene,
  BoardNode,
  BoardScene,
  ChapterInfo,
  ChapterScene,
  Element,
  Look,
  Plate,
  PlugScene,
  Rect,
  Scene,
  StageScene,
  StepBadge,
  TalkingScene,
  ThemeName,
  Timeline,
  Transition,
  WebcamKey,
  WebcamMode,
} from '../src/types.ts';

export const CHAPTER_CARD_S = 3.4;
export const PANEL_CHAPTER_CARD_S = 2; // house rule: every chapter element is 2 s max
export const MIN_VISUAL_S = 1.2;
const LOOKS: Look[] = ['panel', 'reference'];
const THEMES: ThemeName[] = ['velour', 'ember-dark', 'clay-light'];
const TRANSITIONS: Transition[] = ['blur', 'cut', 'flash', 'fade'];
const WEBCAM_MODES: WebcamMode[] = ['tile', 'full', 'pip', 'pip-right', 'pip-square', 'hero', 'plug', 'hidden'];
const KINDS = ['talking', 'app', 'stage', 'plug', 'board'] as const;
type Kind = (typeof KINDS)[number];

const SCENE_FIELDS: Record<Kind, string[]> = {
  talking: ['dim', 'elements'],
  app: ['app', 'data', 'state', 'camera', 'beats', 'screen', 'size', 'targets', 'start', 'tone'],
  stage: ['layout', 'title', 'elements'],
  plug: ['media'],
  board: ['line', 'nodes'],
};
const SCENE_COMMON = ['kind', 'at', 'webcam', 'transition', 'note', 'notes'];

export const VERBS = ['click', 'move', 'type', 'set', 'tween', 'callout', 'lift', 'explode', 'focus', 'zoom', 'mark', 'title', 'show'] as const;
export type Verb = (typeof VERBS)[number];
// Default holds in seconds (0 = instant, -1 = until typed).
export const DEFAULT_HOLD: Record<Verb, number> = { click: 0, move: 0, set: 0, tween: 1.2, type: -1, callout: 3, lift: 2.5, explode: 3, focus: 2.5, zoom: 3, mark: 2, title: 2.5, show: 2.5 };
const BEAT_FIELDS: Record<Verb, string[]> = {
  click: ['set', 'tooltip', 'ring'],
  move: ['tooltip'],
  type: ['key', 'text', 'cps', 'lift'],
  set: [],
  tween: ['to', 'from'],
  callout: ['text', 'sub', 'side', 'dim'],
  lift: ['scale', 'to'],
  explode: ['labels'],
  focus: [],
  zoom: ['scale'],
  mark: ['style'],
  title: ['sub'],
  show: [],
};
const BEAT_COMMON = ['at', 'until', 'hold', 'note'];
const IMAGE_EXT = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.avif'];
const VIDEO_EXT = ['.mp4', '.mov', '.webm', '.m4v', '.mkv'];

// ---------- public types ----------

export type Diag = { level: 'error' | 'warn'; path: string; line?: number; message: string };
export type ArollJson = { duration: number; fps?: number; segments?: unknown[]; cuts?: number[] };
export type SourceJson = { camera?: string; fps?: number; width?: number; height?: number; duration?: number };

export type MetaEvent = { frame: number; end?: number; kind: 'scene' | 'chapter' | 'beat' | 'element' | 'item'; label: string; path: string; line?: number; scene: string; verb?: string; targets?: string[] };
export type MetaScene = { id: string; index: number | null; kind: Scene['kind']; from: number; duration: number; label: string; app?: string; screen?: string; part: number };
export type TargetRef = { path: string; line?: number; scene: number; name: string; app?: string; screenTargets?: string[] };
export type CompileMeta = {
  title?: string;
  fps: number;
  durationInFrames: number;
  scenes: MetaScene[];
  events: MetaEvent[];
  texts: { path: string; line?: number; text: string; headline: boolean }[];
  icons: { path: string; line?: number; name: string }[];
  media: { path: string; line?: number; src: string }[];
  targets: TargetRef[];
  stateKeys: { path: string; line?: number; scene: number; app: string; key: string }[];
};

export type CompileInput = {
  yaml: string;
  words: Word[] | null;
  aroll: ArollJson | null;
  source?: SourceJson | null;
  arollVideo?: boolean; // aroll.mp4 exists in the work dir
  face?: { fps: number; x: number[] } | null; // face.json: the head's path through aroll.mp4
  probeSize?: (src: string) => [number, number] | null;
};

export type CompileResult = { timeline: Timeline | null; diags: Diag[]; meta: CompileMeta; errors: number; warnings: number };

export const fmtPath = (p: P) => p.reduce<string>((s, k) => (typeof k === 'number' ? `${s}[${k}]` : s ? `${s}.${k}` : k), '');

// ---------- compiler ----------

type SceneCtx = {
  i: number;
  path: P;
  kind: Kind;
  raw: Record<string, unknown>;
  anchorT: number; // where the scene's `at` resolved (seconds)
  baseF: number; // absolute frame of scene-relative frame 0
  endF: number;
  durF: number;
  window: Window; // phrase search window
  pushedBy?: number; // chapter index that pushed this scene's start
};

class Compiler {
  diags: Diag[] = [];
  meta: CompileMeta;
  fps = 30;
  look: Look = 'panel';
  total = 0;
  totalF = 0;
  idx: WordIndex;
  private doc!: YAML.Document.Parsed;
  private lc = new LineCounter();

  private input: CompileInput;

  constructor(input: CompileInput) {
    this.input = input;
    this.idx = new WordIndex(input.words ?? []);
    this.meta = { fps: 30, durationInFrames: 0, scenes: [], events: [], texts: [], icons: [], media: [], targets: [], stateKeys: [] };
  }

  // ----- diagnostics -----
  line(p: P): number | undefined {
    if (!this.doc || p.length === 0) return undefined;
    for (let n = p.length; n >= 0; n--) {
      const node = this.doc.getIn(p.slice(0, n), true);
      if (isNode(node) && node.range) return this.lc.linePos(node.range[0]).line;
    }
    return undefined;
  }
  err = (p: P, message: string) => void this.diags.push({ level: 'error', path: fmtPath(p), line: this.line(p), message });
  warn = (p: P, message: string) => void this.diags.push({ level: 'warn', path: fmtPath(p), line: this.line(p), message });

  f = (t: number) => Math.round(t * this.fps);

  // Resolve an anchor to seconds. Records errors/warnings; returns null on failure.
  resolve(raw: unknown, p: P, mode: 'at' | 'until', windows: Window[]): number | null {
    try {
      const r = resolveAnchor(raw, this.idx, { mode, windows, fps: this.fps });
      if (r.warning) this.warn(p, r.warning);
      return r.t;
    } catch (e) {
      if (e instanceof AnchorError) {
        this.err(p, e.message);
        return null;
      }
      throw e;
    }
  }

  ctx(sc: SceneCtx): FrameCtx {
    const rel = (t: number, p: P): number => {
      const fr = this.f(t) - sc.baseF;
      if (fr < -1) {
        const why = sc.pushedBy !== undefined ? ` (the scene was pushed to ${(sc.baseF / this.fps).toFixed(1)} s by chapter card ${sc.pushedBy})` : '';
        this.warn(p, `lands at ${t.toFixed(1)} s, ${((sc.baseF - this.f(t)) / this.fps).toFixed(1)} s before the scene starts${why}; clamped to the scene start`);
      } else if (fr >= sc.durF + 1) {
        this.warn(p, `lands at ${t.toFixed(1)} s, after the scene ends at ${(sc.endF / this.fps).toFixed(1)} s; clamped to the scene end`);
      }
      return Math.max(0, Math.min(sc.durF - 1, fr));
    };
    const at = (raw: unknown, p: P, dflt: number, from?: number) => {
      if (raw === undefined || raw === null) return dflt;
      const wins: Window[] = from !== undefined && from > 0 ? [{ from: (sc.baseF + from) / this.fps - 0.05, to: sc.window.to, label: 'scene' }, sc.window] : [sc.window];
      const t = this.resolve(raw, p, 'at', wins);
      return t === null ? dflt : rel(t, p);
    };
    const until = (raw: unknown, p: P, from: number, dflt: number) => {
      const fromT = (sc.baseF + from) / this.fps;
      const t = this.resolve(raw, p, 'until', [{ from: fromT - 0.05, to: sc.window.to, label: 'scene' }, sc.window]);
      if (t === null) return dflt;
      const fr = this.f(t) - sc.baseF;
      if (fr <= from) {
        this.warn(p, `resolves to ${t.toFixed(1)} s, not after the start (${fromT.toFixed(1)} s); using the default hold`);
        return dflt;
      }
      if (fr > sc.durF + 1) this.warn(p, `resolves to ${t.toFixed(1)} s, after the scene ends at ${(sc.endF / this.fps).toFixed(1)} s; clamped to the scene end`);
      return Math.min(sc.durF, fr);
    };
    const holdEnd = (obj: Record<string, unknown>, p: P, frame: number, dflt: number) => {
      let e = dflt;
      if (obj.until !== undefined && obj.until !== null) {
        if (obj.hold !== undefined) this.warn([...p, 'hold'], 'both `until` and `hold` given; using `until`');
        e = until(obj.until, [...p, 'until'], frame, dflt);
      } else if (obj.hold !== undefined && obj.hold !== null) {
        try {
          e = frame + Math.max(1, Math.round(parseDuration(obj.hold) * this.fps));
          if (e > sc.durF + 1) this.warn([...p, 'hold'], `runs ${((e - sc.durF) / this.fps).toFixed(1)} s past the scene end; clamped`);
        } catch (er) {
          this.err([...p, 'hold'], (er as Error).message);
        }
      }
      return Math.max(Math.min(frame + 1, sc.durF), Math.min(sc.durF, e));
    };
    return {
      fps: this.fps,
      durFrames: sc.durF,
      at,
      until,
      holdEnd,
      err: this.err,
      warn: this.warn,
      text: (p, s, headline = false) => {
        if (s === undefined || s === null) return '';
        if (typeof s !== 'string' && typeof s !== 'number' && typeof s !== 'boolean') {
          this.err(p, `expected text, got ${JSON.stringify(s)}`);
          return '';
        }
        const t = String(s);
        this.meta.texts.push({ path: fmtPath(p), line: this.line(p), text: t, headline });
        return t;
      },
      icon: (p, name) => {
        if (name === undefined || name === null || name === '') return undefined;
        if (typeof name !== 'string') {
          this.err(p, 'icon must be a lucide name like panel-right');
          return undefined;
        }
        this.meta.icons.push({ path: fmtPath(p), line: this.line(p), name });
        return name;
      },
      media: (p, src) => this.mediaPath(p, src),
      probe: (src) => this.input.probeSize?.(src) ?? null,
    };
  }

  mediaPath(p: P, src: unknown): string {
    if (typeof src !== 'string' || !src.trim()) {
      this.err(p, 'expected a media path relative to the work dir, e.g. media/shot.png');
      return '';
    }
    let s = src.trim().replace(/\\/g, '/');
    if (path.isAbsolute(s) || s.startsWith('..')) {
      this.err(p, `media paths must be inside the work dir (relative, e.g. media/x.png), got ${s}; copy the file into work/media/`);
      return s;
    }
    s = s.replace(/^(\.\/)+/, '');
    this.meta.media.push({ path: fmtPath(p), line: this.line(p), src: s });
    return s;
  }

  target(p: P, sc: SceneCtx, name: unknown, plate: Plate | null): string {
    if (typeof name !== 'string' || !name) {
      this.err(p, `expected a target name, got ${JSON.stringify(name)}`);
      return '';
    }
    const ref: TargetRef = { path: fmtPath(p), line: this.line(p), scene: sc.i, name };
    if (plate?.type === 'replica') ref.app = plate.app;
    else if (plate) ref.screenTargets = Object.keys(plate.targets);
    this.meta.targets.push(ref);
    return name;
  }

  event(sc: SceneCtx, e: Omit<MetaEvent, 'scene' | 'frame' | 'end'> & { frame: number; end?: number }) {
    this.meta.events.push({ ...e, frame: sc.baseF + e.frame, end: e.end === undefined ? undefined : sc.baseF + e.end, scene: `s${sc.i}` });
  }

  elementEvents(sc: SceneCtx, el: Element, p: P, prefix = '') {
    const label = `${prefix}${el.type}${elText(el) ? ` "${short(elText(el))}"` : ''}`;
    this.event(sc, { frame: el.frame, end: el.end, kind: 'element', label, path: fmtPath(p) });
    walkFrames(el, (o, k) => {
      if (o === el) return;
      const t = typeof o.text === 'string' ? o.text : typeof o.label === 'string' ? o.label : typeof o.phrase === 'string' ? o.phrase : typeof o.title === 'string' ? o.title : k;
      this.event(sc, { frame: o.frame as number, kind: 'item', label: `${el.type} item "${short(String(t))}"`, path: fmtPath(p) });
    });
  }

  // ----- main -----
  run(): CompileResult {
    this.doc = YAML.parseDocument(this.input.yaml, { lineCounter: this.lc, prettyErrors: true, uniqueKeys: true });
    for (const e of this.doc.errors) this.diags.push({ level: 'error', path: 'edit.yaml', line: e.linePos?.[0]?.line, message: `YAML: ${e.message.split('\n')[0]}` });
    if (this.doc.errors.length) return this.result(null);
    const root = this.doc.toJS({ maxAliasCount: 1000 }) as unknown;
    if (!isObj(root)) {
      this.err([], 'edit.yaml must be a mapping with `scenes:`');
      return this.result(null);
    }
    for (const k of Object.keys(root)) if (!['title', 'look', 'theme', 'camera', 'chapters', 'scenes', 'notes', 'note'].includes(k)) this.warn([k], `unknown top-level field "${k}" (ignored)`);

    const { aroll, source } = this.input;
    if (!this.input.words) this.warn([], 'words.out.json missing: only w-id-free anchors (o:12.5) can resolve');
    const fpsRaw = aroll?.fps ?? source?.fps ?? 30;
    this.fps = Math.round(fpsRaw * 1000) / 1000;
    if (aroll && typeof aroll.duration === 'number' && aroll.duration > 0) this.total = aroll.duration;
    else {
      this.total = (this.idx.duration || 0) + 0.5;
      this.warn([], `aroll.json missing or without duration; using the transcript end (${this.total.toFixed(1)} s)`);
    }
    this.totalF = Math.max(1, Math.round(this.total * this.fps));
    this.meta.fps = this.fps;
    this.meta.durationInFrames = this.totalF;
    if (typeof root.title === 'string') this.meta.title = root.title;

    if (root.look !== undefined) {
      if (LOOKS.includes(root.look as Look)) this.look = root.look as Look;
      else this.err(['look'], `unknown look ${JSON.stringify(root.look)}; use ${LOOKS.join(' or ')}`);
    }
    const panel = this.look === 'panel';
    let theme: ThemeName = panel ? 'velour' : 'ember-dark';
    if (root.theme !== undefined) {
      if (THEMES.includes(root.theme as ThemeName)) theme = root.theme as ThemeName;
      else this.err(['theme'], `unknown theme ${JSON.stringify(root.theme)}; use ${THEMES.join(' or ')}`);
    }
    const camera = this.camera(root.camera);

    // ---- scenes: resolve starts ----
    if (!Array.isArray(root.scenes) || root.scenes.length === 0) {
      this.err(['scenes'], 'edit.yaml needs a non-empty `scenes:` list');
      return this.result(null);
    }
    const rawScenes = root.scenes as unknown[];
    type Pre = { i: number; raw: Record<string, unknown>; kind: Kind; anchorT: number; startF: number; pushedBy?: number };
    const pre: Pre[] = [];
    let prevT = 0;
    rawScenes.forEach((s, i) => {
      const p: P = ['scenes', i];
      if (!isObj(s)) return this.err(p, 'scene must be a mapping with `kind` and `at`');
      if (!KINDS.includes(s.kind as Kind)) return this.err([...p, 'kind'], `unknown scene kind ${JSON.stringify(s.kind)}; use one of: ${KINDS.join(', ')}`);
      const kind = s.kind as Kind;
      for (const k of Object.keys(s)) if (!SCENE_COMMON.includes(k) && !SCENE_FIELDS[kind].includes(k)) this.warn([...p, k], `unknown field "${k}" for a ${kind} scene (ignored); fields: ${SCENE_FIELDS[kind].join(', ')}`);
      let t: number | null;
      if (s.at === undefined) {
        if (i === 0) t = 0;
        else return this.err([...p, 'at'], 'scene needs `at:` (where it starts)');
      } else t = this.resolve(s.at, [...p, 'at'], 'at', [{ from: prevT - 0.05, to: this.total, label: 'the transcript after the previous scene' }]);
      if (t === null) return;
      if (pre.length && t <= pre[pre.length - 1].anchorT + 1e-6) {
        return this.err([...p, 'at'], `starts at ${t.toFixed(1)} s, not after scenes[${pre[pre.length - 1].i}] (${pre[pre.length - 1].anchorT.toFixed(1)} s); scenes must be in time order`);
      }
      if (t >= this.total) return this.err([...p, 'at'], `starts at ${t.toFixed(1)} s, after the video ends (${this.total.toFixed(1)} s)`);
      pre.push({ i, raw: s, kind, anchorT: t, startF: pre.length === 0 ? 0 : this.f(t) });
      prevT = t;
    });
    if (pre.length && pre[0].anchorT > 0.5) this.warn(['scenes', pre[0].i, 'at'], `the first scene starts at ${pre[0].anchorT.toFixed(1)} s; it is extended back to 0:00`);

    // ---- chapters ----
    const { cards, chapterInfos, grid, badges } = this.chapters(root.chapters);

    // ---- push scenes that start inside a card ----
    for (const sc of pre) {
      cards.forEach((card, k) => {
        if (sc.startF >= card.from && sc.startF < card.to) {
          sc.startF = card.to;
          sc.pushedBy = k;
        }
      });
    }
    const alive: Pre[] = [];
    pre.forEach((sc, j) => {
      const next = pre[j + 1];
      if (next && next.startF <= sc.startF) {
        this.warn(['scenes', sc.i, 'at'], `starts inside chapter card ${sc.pushedBy ?? next.pushedBy} and so does scenes[${next.i}]; this scene never shows (move it, or drop it)`);
        return;
      }
      if (sc.startF >= this.totalF) {
        this.warn(['scenes', sc.i, 'at'], `pushed past the end of the video by a chapter card; it never shows`);
        return;
      }
      alive.push(sc);
    });

    // ---- compile each scene against its window ----
    const compiled: { sc: SceneCtx; scene: Scene }[] = [];
    alive.forEach((s, j) => {
      const endF = alive[j + 1]?.startF ?? this.totalF;
      const sc: SceneCtx = {
        i: s.i,
        path: ['scenes', s.i],
        kind: s.kind,
        raw: s.raw,
        anchorT: s.anchorT,
        baseF: s.startF,
        endF,
        durF: endF - s.startF,
        window: { from: Math.min(s.anchorT, s.startF / this.fps) - 0.05, to: endF / this.fps, label: 'scene' },
        pushedBy: s.pushedBy,
      };
      if (j === 0) sc.window.from = 0;
      const scene = this.scene(sc);
      if (scene) compiled.push({ sc, scene });
    });

    // ---- split around chapter cards, insert cards ----
    type Seg = { scene: Scene; sc?: SceneCtx; part: number; explicitT?: Transition; webcam?: WebcamMode };
    const segs: Seg[] = [];
    for (const { sc, scene } of compiled) {
      const parts = subtract([scene.from, scene.from + scene.duration], cards.map((k) => [k.from, k.to]));
      parts.forEach(([a, b], n) => {
        const frag = fragment(scene, a - scene.from, b - a, n);
        if (n > 0) frag.id = `${scene.id}.${n + 1}`;
        frag.from = a;
        segs.push({ scene: frag, sc, part: n, explicitT: n === 0 ? (sc.raw.transition as Transition | undefined) : undefined, webcam: sc.raw.webcam as WebcamMode | undefined });
      });
    }
    cards.forEach((k, idx) => {
      const ch: ChapterScene = { id: `ch${idx}`, kind: 'chapter', index: k.index, from: k.from, duration: k.to - k.from, transitionIn: 'cut', transitionOut: 'cut' };
      segs.push({ scene: ch, part: 0 });
    });
    segs.sort((a, b) => a.scene.from - b.scene.from);

    // ---- transitions ----
    segs.forEach((seg, k) => {
      const prev = segs[k - 1]?.scene;
      const s = seg.scene;
      let t: Transition;
      if (k === 0) t = 'cut';
      else if (s.kind === 'chapter') t = !panel && prev?.kind === 'plug' ? 'flash' : 'cut';
      else if (seg.part > 0) t = 'cut';
      else if (seg.explicitT !== undefined) t = seg.explicitT;
      else if (!panel && (s.kind === 'plug' || prev?.kind === 'plug')) t = 'flash';
      else if (prev?.kind === 'chapter') t = 'cut';
      else t = 'blur';
      s.transitionIn = t;
    });
    segs.forEach((seg, k) => (seg.scene.transitionOut = segs[k + 1]?.scene.transitionIn ?? 'cut'));

    // ---- webcam track ----
    const webcam: WebcamKey[] = [];
    for (const seg of segs) {
      const s = seg.scene;
      let mode: WebcamMode;
      if (panel) {
        // The creator stays in the tile (a chapter card just covers it for its 2 s). Only an explicit
        // full (a closing shot) or hidden moves them.
        mode = seg.webcam === 'full' || seg.webcam === 'hidden' ? seg.webcam : 'tile';
      } else if (s.kind === 'chapter') mode = 'hidden';
      else if (seg.webcam !== undefined) mode = seg.webcam;
      else mode = defaultWebcam(s);
      const prev = webcam[webcam.length - 1];
      if (prev?.mode !== mode) {
        // Between visible modes the tile morphs WITH the dissolve (reference), so the big head never
        // stays sharp over the incoming scene and then blurs on its own.
        const dissolves = s.transitionIn === 'blur' || s.transitionIn === 'fade';
        const lead = prev && prev.mode !== 'hidden' && mode !== 'hidden' && dissolves ? Math.max(1, Math.round(0.33 * this.fps)) : 0;
        webcam.push({ frame: Math.max(prev ? prev.frame + 1 : 0, s.from - lead), mode });
      }
    }

    // ---- meta ----
    for (const seg of segs) {
      const s = seg.scene;
      const label =
        s.kind === 'chapter'
          ? `chapter ${s.index + 1} ${chapterInfos[s.index]?.title ?? ''}`.trim()
          : `${s.id} ${s.kind}${s.kind === 'app' ? ` ${s.plate.type === 'replica' ? s.plate.app : path.basename(s.plate.src)}` : ''}${s.kind === 'stage' && s.title ? ` "${short(s.title.text)}"` : ''}`;
      const ms: MetaScene = { id: s.id, index: seg.sc?.i ?? null, kind: s.kind, from: s.from, duration: s.duration, label, part: seg.part };
      if (s.kind === 'app') {
        if (s.plate.type === 'replica') ms.app = s.plate.app;
        else ms.screen = s.plate.src;
      }
      this.meta.scenes.push(ms);
      this.meta.events.push({ frame: s.from, end: s.from + s.duration, kind: s.kind === 'chapter' ? 'chapter' : 'scene', label, path: seg.sc ? fmtPath(seg.sc.path) : `chapters.items[${(s as ChapterScene).index}]`, scene: s.id });
      if (s.duration < MIN_VISUAL_S * this.fps) this.warn(seg.sc?.path ?? ['chapters'], `${label} is on screen for only ${(s.duration / this.fps).toFixed(2)} s (min ${MIN_VISUAL_S} s)`);
      else if (s.kind === 'stage' && s.layout === 'hero-left' && s.duration < 3 * this.fps) this.warn(seg.sc?.path ?? ['scenes'], `${label} is only ${(s.duration / this.fps).toFixed(1)} s; the webcam morph takes 0.45 s each way, so hero stages need at least 3 s (use layout: center, or show it over the app)`);
    }
    this.meta.events.sort((a, b) => a.frame - b.frame);

    // ---- aroll ----
    let arollOut: Timeline['aroll'] = null;
    if (!aroll) this.warn([], 'aroll.json missing: no talking head or audio (aroll: null)');
    else if (!this.input.arollVideo) this.warn([], 'aroll.mp4 not found in the work dir: rendering without the talking head and audio (aroll: null); run `screenplay aroll`');
    else {
      const cuts = (aroll.cuts ?? []).map((s) => this.f(s)).filter((fr) => fr > 0 && fr < this.totalF);
      arollOut = { src: 'aroll.mp4', durationInFrames: this.totalF, cuts: [...new Set(cuts)].sort((a, b) => a - b) };
    }

    const timeline: Timeline = {
      version: 1,
      fps: this.fps,
      width: 1920,
      height: 1080,
      durationInFrames: this.totalF,
      look: this.look,
      theme,
      aroll: arollOut,
      camera,
      webcam,
      badges: panel ? badges : [],
      chapterGrid: grid,
      chapters: chapterInfos,
      scenes: segs.map((s) => s.scene),
    };
    return this.result(timeline);
  }

  result(timeline: Timeline | null): CompileResult {
    const errors = this.diags.filter((d) => d.level === 'error').length;
    return { timeline: errors ? null : timeline, diags: this.diags, meta: this.meta, errors, warnings: this.diags.length - errors };
  }

  camera(raw: unknown): Timeline['camera'] {
    const cam: Timeline['camera'] = { focus: [0.5, 0.42], zoom: 1, mirror: false };
    const track = this.input.face && this.input.face.x.length ? { track: this.input.face } : {};
    if (raw === undefined) return { ...cam, ...track };
    if (!isObj(raw)) {
      this.err(['camera'], 'camera must be {focus: [x, y], zoom, mirror, track}');
      return cam;
    }
    if (raw.focus !== undefined) {
      const f = raw.focus;
      if (Array.isArray(f) && f.length === 2 && f.every((v) => typeof v === 'number' && v >= 0 && v <= 1)) cam.focus = [f[0], f[1]];
      else this.err(['camera', 'focus'], 'focus must be [x, y] with values 0..1 (face centre in the source frame)');
    }
    if (raw.zoom !== undefined) {
      if (typeof raw.zoom === 'number' && raw.zoom > 0) cam.zoom = raw.zoom;
      else this.err(['camera', 'zoom'], 'zoom must be a positive number');
    }
    if (raw.mirror !== undefined) cam.mirror = !!raw.mirror;
    // `track: false` holds camera.focus even when the work dir has a face.json.
    return raw.track === false ? cam : { ...cam, ...track };
  }

  chapters(raw: unknown) {
    const cards: { from: number; to: number; index: number }[] = [];
    const chapterInfos: ChapterInfo[] = [];
    const grid = { heading: '', logo: true };
    const stepTitles: string[] = [];
    const items = isObj(raw) ? raw.items : undefined;
    if (raw !== undefined && !isObj(raw)) this.err(['chapters'], 'chapters must be {heading, logo, items: [...]}');
    if (isObj(raw)) for (const k of Object.keys(raw)) if (!['heading', 'logo', 'items', 'badge'].includes(k)) this.warn(['chapters', k], `unknown field "${k}" (ignored)`);
    if (items !== undefined && !Array.isArray(items)) this.err(['chapters', 'items'], 'chapters.items must be a list');
    const list = Array.isArray(items) ? items : [];
    const cardF = Math.round((this.look === 'panel' ? PANEL_CHAPTER_CARD_S : CHAPTER_CARD_S) * this.fps);
    let prevT = 0;
    const textCtx = this.ctx({ i: -1, path: ['chapters'], kind: 'talking', raw: {}, anchorT: 0, baseF: 0, endF: this.totalF, durF: this.totalF, window: { from: 0, to: this.total } });
    list.forEach((it, k) => {
      const p: P = ['chapters', 'items', k];
      if (!isObj(it)) return this.err(p, 'chapter item must be {at, title, icon}');
      if (it.at === undefined || it.at === null) {
        // Tile only (a chapter covered elsewhere, e.g. tips 1-8 of a part-two video): it shows on the
        // grid as already done but inserts no card.
        const title = typeof it.title === 'string' ? textCtx.text([...p, 'title'], it.title, true) : (this.err([...p, 'title'], 'chapter needs `title`'), '');
        chapterInfos.push({ index: k, title, icon: textCtx.icon([...p, 'icon'], it.icon) ?? 'sparkles', frame: -1 });
        stepTitles.push(title);
        return;
      }
      const t = this.resolve(it.at, [...p, 'at'], 'at', [{ from: prevT - 0.05, to: this.total, label: 'the transcript after the previous chapter' }]);
      if (t === null) return;
      let from = this.f(t);
      const last = cards[cards.length - 1];
      if (last && from < last.to) {
        this.warn([...p, 'at'], `starts ${((last.to - from) / this.fps).toFixed(1)} s inside the previous chapter card; pushed to its end`);
        from = last.to;
      }
      if (from >= this.totalF) return this.err([...p, 'at'], `lands at ${t.toFixed(1)} s, after the video ends`);
      const to = Math.min(this.totalF, from + cardF);
      cards.push({ from, to, index: chapterInfos.length });
      const title = typeof it.title === 'string' ? textCtx.text([...p, 'title'], it.title, true) : (this.err([...p, 'title'], 'chapter needs `title`'), '');
      const icon = textCtx.icon([...p, 'icon'], it.icon) ?? 'sparkles';
      if (it.icon === undefined) this.warn([...p, 'icon'], 'chapter has no `icon`; using sparkles');
      chapterInfos.push({ index: k, title, icon, frame: from });
      stepTitles.push(typeof it.badge === 'string' ? textCtx.text([...p, 'badge'], it.badge, true) : title);
      prevT = t;
    });
    // fix indices (skipped items) so ChapterScene.index == position in chapters[]
    chapterInfos.forEach((ci, k) => (ci.index = k));
    if (isObj(raw)) {
      grid.heading = typeof raw.heading === 'string' ? textCtx.text(['chapters', 'heading'], raw.heading, true) : `${chapterInfos.length} Features`;
      grid.logo = raw.logo === undefined ? true : !!raw.logo;
    } else grid.heading = `${chapterInfos.length} Features`;

    // Step badge: one per chapter from its card on, plus an intro before the first card.
    const badgeRaw = isObj(raw) && isObj(raw.badge) ? raw.badge : {};
    if (isObj(raw) && raw.badge !== undefined && !isObj(raw.badge)) this.err(['chapters', 'badge'], 'badge must be {eyebrow, intro}');
    const eyebrow = typeof badgeRaw.eyebrow === 'string' ? textCtx.text(['chapters', 'badge', 'eyebrow'], badgeRaw.eyebrow) : 'Part';
    const badges: StepBadge[] = [];
    chapterInfos.forEach((ci, k) => {
      if (ci.frame >= 0) badges.push({ frame: ci.frame, eyebrow, title: stepTitles[k], step: k + 1, total: chapterInfos.length });
    });
    if (badges.length && badges[0].frame > 0) {
      const title = typeof badgeRaw.intro === 'string' ? textCtx.text(['chapters', 'badge', 'intro'], badgeRaw.intro, true) : grid.heading.replace(/\*/g, '');
      const lit = badges[0].step - 1; // parts covered earlier stay filled
      badges.unshift({ frame: 0, eyebrow: lit > 0 ? eyebrow : 'Intro', title, step: lit, total: chapterInfos.length });
    }
    return { cards, chapterInfos, grid, badges };
  }

  // ----- scenes -----
  scene(sc: SceneCtx): Scene | null {
    const raw = sc.raw;
    const base = { id: `s${sc.i}`, from: sc.baseF, duration: sc.durF, transitionIn: 'cut' as Transition, transitionOut: 'cut' as Transition };
    if (raw.transition !== undefined && !TRANSITIONS.includes(raw.transition as Transition)) {
      this.err([...sc.path, 'transition'], `unknown transition ${JSON.stringify(raw.transition)}; use one of: ${TRANSITIONS.join(', ')}`);
      delete raw.transition;
    }
    if (raw.webcam !== undefined && !WEBCAM_MODES.includes(raw.webcam as WebcamMode)) {
      this.err([...sc.path, 'webcam'], `unknown webcam mode ${JSON.stringify(raw.webcam)}; use one of: ${WEBCAM_MODES.join(', ')}`);
      delete raw.webcam;
    } else if (this.look === 'panel' && raw.webcam !== undefined && !['tile', 'full', 'hidden'].includes(raw.webcam as string)) {
      this.warn([...sc.path, 'webcam'], `webcam: ${String(raw.webcam)} is ignored in the panel look; the creator stays in the tile (only full and hidden change that)`);
    }
    const ctx = this.ctx(sc);
    switch (sc.kind) {
      case 'talking': {
        if (this.look === 'panel' && raw.webcam !== 'full' && !(Array.isArray(raw.elements) && raw.elements.length)) this.warn(sc.path, 'a talking scene with no elements leaves the panel empty; give it elements, or use `webcam: full` for a full-frame moment');
        const dim = raw.dim === undefined ? 0.7 : typeof raw.dim === 'number' && raw.dim >= 0 && raw.dim <= 1 ? raw.dim : (this.err([...sc.path, 'dim'], 'dim must be a number 0..1'), 0.7);
        const s: TalkingScene = { ...base, kind: 'talking', dim, elements: this.elements(sc, ctx, raw.elements) };
        return s;
      }
      case 'stage': {
        let layout: StageScene['layout'] = raw.layout === undefined ? 'hero-left' : raw.layout === 'hero-left' || raw.layout === 'center' ? raw.layout : (this.err([...sc.path, 'layout'], 'layout must be hero-left or center'), 'hero-left');
        if (this.look === 'panel') {
          if (raw.layout === 'hero-left') this.warn([...sc.path, 'layout'], 'hero-left needs a big webcam; the panel look always uses the whole panel');
          layout = 'center';
        }
        let title: StageScene['title'] = null;
        const tp: P = [...sc.path, 'title'];
        if (typeof raw.title === 'string') {
          title = { text: ctx.text(tp, raw.title, true), frame: 0, end: sc.durF };
        } else if (isObj(raw.title)) {
          const t = raw.title;
          const frame = ctx.at(t.at, [...tp, 'at'], 0);
          title = { text: ctx.text([...tp, 'text'], t.text ?? '', true), frame, end: ctx.holdEnd(t, tp, frame, sc.durF) };
          if (t.sub !== undefined) title.sub = ctx.text([...tp, 'sub'], t.sub);
          if (t.text === undefined) this.err([...tp, 'text'], 'title needs `text`');
        } else if (raw.title !== undefined && raw.title !== null) this.err(tp, 'title must be text or {text, at, sub}');
        if (title) this.event(sc, { frame: title.frame, end: title.end, kind: 'element', label: `title "${short(title.text)}"`, path: fmtPath(tp) });
        const s: StageScene = { ...base, kind: 'stage', layout, title, elements: this.elements(sc, ctx, raw.elements) };
        return s;
      }
      case 'app':
        return this.app(sc, ctx, base);
      case 'plug':
        return this.plug(sc, ctx, base);
      case 'board':
        return this.board(sc, ctx, base);
    }
  }

  elements(sc: SceneCtx, ctx: FrameCtx, raw: unknown): Element[] {
    if (raw === undefined || raw === null) return [];
    if (!Array.isArray(raw)) {
      this.err([...sc.path, 'elements'], '`elements` must be a list');
      return [];
    }
    const out: Element[] = [];
    raw.forEach((r, k) => {
      const p: P = [...sc.path, 'elements', k];
      const el = compileElement(r, p, ctx, { frame: 0, end: sc.durF });
      if (el) {
        out.push(el);
        this.elementEvents(sc, el, p);
      }
    });
    return out;
  }

  app(sc: SceneCtx, ctx: FrameCtx, base: Pick<AppScene, 'id' | 'from' | 'duration' | 'transitionIn' | 'transitionOut'>): AppScene | null {
    const raw = sc.raw;
    const p = sc.path;
    let plate: Plate;
    if (raw.screen !== undefined) {
      if (raw.app !== undefined) this.warn([...p, 'app'], 'both `app` and `screen` given; using the screen plate');
      const src = this.mediaPath([...p, 'screen'], raw.screen);
      const ext = path.extname(src).toLowerCase();
      const isVideo = VIDEO_EXT.includes(ext);
      if (!isVideo && !IMAGE_EXT.includes(ext)) this.err([...p, 'screen'], `unsupported media type "${ext}"; use an image (${IMAGE_EXT.join(' ')}) or video (${VIDEO_EXT.join(' ')})`);
      let size: [number, number] | null = null;
      if (Array.isArray(raw.size) && raw.size.length === 2 && raw.size.every((v) => typeof v === 'number' && v > 0)) size = [raw.size[0] as number, raw.size[1] as number];
      else if (raw.size !== undefined) this.err([...p, 'size'], 'size must be [width, height] in media pixels');
      else {
        size = src ? (this.input.probeSize?.(src) ?? null) : null;
        if (size) this.warn([...p, 'size'], `no size given; probed ${size[0]}×${size[1]} (add \`size: [${size[0]}, ${size[1]}]\`)`);
        else this.err([...p, 'size'], 'screen plates need `size: [width, height]` (media pixels)');
      }
      const targets: Record<string, Rect> = {};
      if (isObj(raw.targets)) {
        for (const [name, r] of Object.entries(raw.targets)) {
          if (Array.isArray(r) && r.length === 4 && r.every((v) => typeof v === 'number')) targets[name] = { x: r[0], y: r[1], w: r[2], h: r[3] };
          else if (isObj(r) && ['x', 'y', 'w', 'h'].every((k) => typeof r[k] === 'number')) targets[name] = { x: r.x as number, y: r.y as number, w: r.w as number, h: r.h as number };
          else this.err([...p, 'targets', name], 'target must be [x, y, w, h] in media pixels');
          const t = targets[name];
          if (t && size && (t.x < 0 || t.y < 0 || t.x + t.w > size[0] + 1 || t.y + t.h > size[1] + 1)) this.warn([...p, 'targets', name], `rect [${t.x}, ${t.y}, ${t.w}, ${t.h}] extends outside the ${size[0]}×${size[1]} media`);
        }
      } else if (raw.targets !== undefined) this.err([...p, 'targets'], 'targets must be a mapping name: [x, y, w, h]');
      const sz = size ?? [1920, 1080];
      if (isVideo) {
        let startFrom = 0;
        if (raw.start !== undefined) {
          if (typeof raw.start === 'number' && raw.start >= 0) startFrom = this.f(raw.start);
          else this.err([...p, 'start'], 'start must be seconds into the recording, e.g. 12.5');
        }
        plate = { type: 'video', src, size: sz, startFrom, targets, ...(raw.tone === 'light' ? { tone: 'light' as const } : {}) };
      } else {
        if (raw.start !== undefined) this.warn([...p, 'start'], '`start` only applies to video plates');
        plate = { type: 'image', src, size: sz, targets, ...(raw.tone === 'light' ? { tone: 'light' as const } : {}) };
      }
    } else if (typeof raw.app === 'string' && raw.app) {
      if (raw.data !== undefined && !isObj(raw.data)) this.err([...p, 'data'], 'data must be a mapping');
      plate = { type: 'replica', app: raw.app, data: isObj(raw.data) ? raw.data : {} };
      for (const k of ['size', 'targets', 'start']) if (raw[k] !== undefined) this.warn([...p, k], `\`${k}\` only applies to screen plates`);
    } else {
      this.err(p, 'app scene needs `app: <replica id>` (see `screenplay replicas`) or `screen: media/file.png`');
      return null;
    }
    if (raw.state !== undefined && !isObj(raw.state)) this.err([...p, 'state'], 'state must be a mapping');
    const state = isObj(raw.state) ? raw.state : {};
    if (plate.type === 'replica') for (const k of Object.keys(state)) this.meta.stateKeys.push({ path: fmtPath([...p, 'state', k]), line: this.line([...p, 'state', k]), scene: sc.i, app: plate.app, key: k });
    if (plate.type !== 'replica' && raw.state !== undefined) this.warn([...p, 'state'], '`state` only applies to replicas');

    const camera: AppScene['camera'] = { scale: 1 };
    if (isObj(raw.camera)) {
      const cm = raw.camera;
      if (cm.scale !== undefined) {
        if (typeof cm.scale === 'number' && cm.scale > 0) camera.scale = cm.scale;
        else this.err([...p, 'camera', 'scale'], 'scale must be a positive number (1 = whole window)');
      }
      if (cm.target !== undefined) camera.target = this.target([...p, 'camera', 'target'], sc, cm.target, plate);
      if (cm.rect !== undefined) {
        const r = cm.rect;
        if (Array.isArray(r) && r.length === 4 && r.every((v) => typeof v === 'number')) camera.rect = { x: r[0], y: r[1], w: r[2], h: r[3] };
        else this.err([...p, 'camera', 'rect'], 'rect must be [x, y, w, h]');
      }
    } else if (raw.camera !== undefined) this.err([...p, 'camera'], 'camera must be {scale, target}');

    const actions: Action[] = [];
    if (raw.beats !== undefined && !Array.isArray(raw.beats)) this.err([...p, 'beats'], '`beats` must be a list');
    if (Array.isArray(raw.beats)) {
      raw.beats.forEach((b, k) => {
        const a = this.beat(sc, ctx, b, [...p, 'beats', k], plate);
        if (a) actions.push(a);
      });
    }
    actions.sort((a, b) => a.frame - b.frame);
    return { ...base, kind: 'app', plate, state, camera, actions };
  }

  beat(sc: SceneCtx, ctx: FrameCtx, b: unknown, p: P, plate: Plate): Action | null {
    if (!isObj(b)) {
      this.err(p, 'beat must be a mapping like {at: "phrase", click: target}');
      return null;
    }
    let verbs = VERBS.filter((v) => b[v] !== undefined);
    if (verbs.includes('click')) verbs = verbs.filter((v) => v !== 'set');
    if (verbs.includes('type') && typeof b.lift === 'boolean') verbs = verbs.filter((v) => v !== 'lift');
    if (verbs.length === 0) {
      this.err(p, `beat has no verb; use one of: ${VERBS.join(', ')}`);
      return null;
    }
    if (verbs.length > 1) {
      this.err(p, `one verb per beat, found ${verbs.join(' + ')}; split it into ${verbs.length} beats with the same \`at\``);
      return null;
    }
    const verb = verbs[0];
    for (const k of Object.keys(b)) {
      if (k === verb || BEAT_COMMON.includes(k) || BEAT_FIELDS[verb].includes(k)) continue;
      this.warn([...p, k], `unknown field "${k}" for a ${verb} beat (ignored); fields: ${['at', 'until', 'hold', ...BEAT_FIELDS[verb]].join(', ')}`);
    }
    if (b.at === undefined) {
      this.err([...p, 'at'], 'beat needs `at:` (the word it lands on)');
      return null;
    }
    const isScreen = plate.type !== 'replica';
    if (isScreen && (verb === 'set' || verb === 'type' || verb === 'tween')) {
      this.err([...p, verb], `\`${verb}\` needs a replica; screen plates are static media`);
      return null;
    }
    const frame = ctx.at(b.at, [...p, 'at'], 0);
    const hold = DEFAULT_HOLD[verb];
    if (hold === 0 && (b.until !== undefined || b.hold !== undefined)) this.warn([...p, b.until !== undefined ? 'until' : 'hold'], `\`${verb}\` is instant; until/hold ignored`);
    const end = () => ctx.holdEnd(b, p, frame, Math.min(sc.durF, frame + Math.round(hold * this.fps)));
    const tgt = (k: Verb) => this.target([...p, k], sc, b[k], plate);
    const txt = (k: string, headline = false) => (b[k] === undefined ? undefined : ctx.text([...p, k], b[k], headline));
    let a: Action | null = null;
    switch (verb) {
      case 'click': {
        const set = b.set === undefined ? undefined : isObj(b.set) ? b.set : (this.err([...p, 'set'], 'set must be a mapping of state keys'), undefined);
        if (set && isScreen) this.warn([...p, 'set'], '`set` does nothing on a screen plate');
        a = { do: 'click', frame, target: tgt('click') };
        if (b.tooltip !== undefined) a.tooltip = txt('tooltip');
        if (set && !isScreen) a.set = set;
        if (b.ring !== undefined) a.ring = !!b.ring;
        break;
      }
      case 'move':
        a = { do: 'move', frame, target: tgt('move') };
        if (b.tooltip !== undefined) a.tooltip = txt('tooltip');
        break;
      case 'type': {
        if (typeof b.key !== 'string' || !b.key) this.err([...p, 'key'], 'type needs `key:` (the replica state key that holds the text, e.g. prompt; see `screenplay replicas`)');
        if (typeof b.text !== 'string') this.err([...p, 'text'], 'type needs `text:` (what gets typed)');
        const text = txt('text') ?? '';
        const cps = b.cps === undefined ? 40 : typeof b.cps === 'number' && b.cps > 0 ? b.cps : (this.err([...p, 'cps'], 'cps must be a positive number'), 40);
        const typed = frame + Math.max(1, Math.round((text.length / cps) * this.fps));
        if (typed > sc.durF && b.until === undefined && b.hold === undefined) this.warn([...p, 'text'], `typing needs ${(text.length / cps).toFixed(1)} s and runs past the scene end; it is cut short (raise cps or shorten the text)`);
        a = { do: 'type', frame, end: ctx.holdEnd(b, p, frame, Math.min(sc.durF, typed)), key: String(b.key ?? ''), text, target: tgt('type') };
        if (b.lift !== undefined) a.lift = !!b.lift;
        break;
      }
      case 'set':
        if (!isObj(b.set)) {
          this.err([...p, 'set'], 'set must be a mapping of state keys, e.g. {view: settings}');
          return null;
        }
        a = { do: 'set', frame, set: b.set };
        break;
      case 'tween': {
        const to = typeof b.to === 'number' ? b.to : (this.err([...p, 'to'], 'tween needs a number `to:`, e.g. {tween: scroll, to: 420}'), 0);
        if (typeof b.tween !== 'string') this.err([...p, 'tween'], 'tween names a numeric state key, e.g. scroll');
        a = { do: 'tween', frame, end: end(), key: String(b.tween), to };
        if (typeof b.from === 'number') a.from = b.from;
        break;
      }
      case 'callout': {
        const side = b.side === undefined ? 'right' : ['left', 'right', 'top', 'bottom'].includes(String(b.side)) ? (b.side as 'left') : (this.err([...p, 'side'], 'side must be left, right, top or bottom'), 'right');
        if (b.text === undefined) this.warn([...p, 'text'], 'callout without `text` draws only a dot and a line');
        a = { do: 'callout', frame, end: end(), target: tgt('callout'), text: txt('text', true) ?? '', side, dim: b.dim === undefined ? true : !!b.dim };
        if (b.sub !== undefined) a.sub = txt('sub');
        break;
      }
      case 'lift': {
        if (typeof b.lift !== 'string') {
          this.err([...p, 'lift'], 'lift needs a target name (lift: true only works on a type beat)');
          return null;
        }
        a = { do: 'lift', frame, end: end(), target: tgt('lift') };
        if (b.scale !== undefined) typeof b.scale === 'number' && b.scale > 0 ? (a.scale = b.scale) : this.err([...p, 'scale'], 'scale must be a positive number');
        if (b.to !== undefined) Array.isArray(b.to) && b.to.length === 2 && b.to.every((v) => typeof v === 'number') ? (a.to = [b.to[0], b.to[1]]) : this.err([...p, 'to'], 'to must be [x, y] in output pixels');
        break;
      }
      case 'explode': {
        const list = Array.isArray(b.explode) ? b.explode : typeof b.explode === 'string' ? [b.explode] : null;
        if (!list || list.length === 0) {
          this.err([...p, 'explode'], 'explode needs a list of targets');
          return null;
        }
        const targets = list.map((t, j) => this.target([...p, 'explode', j], sc, t, plate));
        const labels = b.labels === undefined ? [] : Array.isArray(b.labels) ? b.labels.map((l, j) => ctx.text([...p, 'labels', j], l, true)) : (this.err([...p, 'labels'], 'labels must be a list'), []);
        if (labels.length && labels.length !== targets.length) this.warn([...p, 'labels'], `${labels.length} labels for ${targets.length} targets`);
        a = { do: 'explode', frame, end: end(), targets, labels };
        break;
      }
      case 'focus':
        a = { do: 'focus', frame, end: end(), target: tgt('focus') };
        break;
      case 'zoom': {
        const scale = b.scale === undefined ? 1.35 : typeof b.scale === 'number' && b.scale > 0 ? b.scale : (this.err([...p, 'scale'], 'scale must be a positive number'), 1.35);
        const z = b.zoom;
        if (Array.isArray(z) && z.length === 4 && z.every((v) => typeof v === 'number')) a = { do: 'zoom', frame, end: end(), rect: { x: z[0], y: z[1], w: z[2], h: z[3] }, scale };
        else a = { do: 'zoom', frame, end: end(), target: tgt('zoom'), scale };
        break;
      }
      case 'mark': {
        const style = b.style === undefined ? 'ring' : ['ring', 'marker', 'underline'].includes(String(b.style)) ? (b.style as 'ring') : (this.err([...p, 'style'], 'style must be ring, marker or underline'), 'ring');
        a = { do: 'mark', frame, end: end(), target: tgt('mark'), style };
        break;
      }
      case 'title': {
        if (typeof b.title !== 'string') this.err([...p, 'title'], 'title needs text, e.g. title: "Side chats"');
        a = { do: 'title', frame, end: end(), text: ctx.text([...p, 'title'], b.title ?? '', true) };
        if (b.sub !== undefined) a.sub = txt('sub');
        break;
      }
      case 'show': {
        const e = end();
        const el = compileElement(b.show, [...p, 'show'], ctx, { frame, end: e });
        if (!el) return null;
        const at = this.meta.events.length;
        this.elementEvents(sc, el, [...p, 'show'], 'show ');
        Object.assign(this.meta.events[at], { kind: 'beat', verb: 'show' });
        a = { do: 'show', frame, end: Math.max(e, el.end), element: el };
        break;
      }
    }
    if (!a) return null;
    const what = 'target' in a && a.target ? ` ${a.target}` : a.do === 'explode' ? ` ${a.targets.join(',')}` : a.do === 'title' ? ` "${short(a.text)}"` : a.do === 'set' ? ` ${short(JSON.stringify(a.set))}` : '';
    const targets = a.do === 'explode' ? a.targets : 'target' in a && a.target ? [a.target] : undefined;
    if (a.do !== 'show') this.event(sc, { frame: a.frame, end: 'end' in a ? a.end : undefined, kind: 'beat', verb: a.do, label: `${a.do}${what}`, path: fmtPath(p), line: this.line(p), targets });
    if (plate.type === 'replica') {
      const keys = a.do === 'type' ? [a.key] : (a.do === 'set' || a.do === 'click') && a.set ? Object.keys(a.set) : [];
      for (const k of keys) this.meta.stateKeys.push({ path: fmtPath([...p, a.do === 'type' ? 'key' : 'set']), line: this.line([...p, a.do === 'type' ? 'key' : 'set']), scene: sc.i, app: plate.app, key: k });
    }
    return a;
  }

  plug(sc: SceneCtx, ctx: FrameCtx, base: Pick<PlugScene, 'id' | 'from' | 'duration' | 'transitionIn' | 'transitionOut'>): PlugScene {
    const p = sc.path;
    const raw = sc.raw.media;
    const media: PlugScene['media'] = [];
    if (!Array.isArray(raw) || raw.length === 0) this.err([...p, 'media'], 'plug needs `media: [{src, at}]`');
    const list = Array.isArray(raw) ? raw : [];
    const frames = list.map((m, k) => {
      if (isObj(m) && m.at !== undefined) return ctx.at(m.at, [...p, 'media', k, 'at'], 0);
      if (k > 0) this.err([...p, 'media', k, 'at'], 'every media item after the first needs `at:` (the word it cuts in on)');
      return 0;
    });
    list.forEach((m, k) => {
      const mp: P = [...p, 'media', k];
      if (typeof m === 'string') m = { src: m };
      if (!isObj(m)) return this.err(mp, 'media item must be {src, at, scroll, until}');
      for (const key of Object.keys(m)) if (!['src', 'at', 'scroll', 'until', 'hold'].includes(key)) this.warn([...mp, key], `unknown field "${key}" (ignored)`);
      const src = this.mediaPath([...mp, 'src'], m.src);
      const ext = path.extname(src).toLowerCase();
      const type: 'image' | 'video' = VIDEO_EXT.includes(ext) ? 'video' : 'image';
      if (!VIDEO_EXT.includes(ext) && !IMAGE_EXT.includes(ext)) this.err([...mp, 'src'], `unsupported media type "${ext}"`);
      const frame = frames[k];
      const item: PlugScene['media'][number] = { frame, src, type };
      if (m.scroll !== undefined) {
        const s = m.scroll;
        if (Array.isArray(s) && s.length === 2 && s.every((v) => typeof v === 'number')) {
          const nextF = frames.filter((fr) => fr > frame).sort((a, b) => a - b)[0] ?? sc.durF;
          const start = Math.min(sc.durF - 1, frame + Math.round(0.3 * this.fps));
          item.scroll = { from: s[0], to: s[1], start, end: Math.max(start + 1, ctx.holdEnd(m, mp, frame, nextF)) };
        } else this.err([...mp, 'scroll'], 'scroll must be [fromPx, toPx]');
      }
      media.push(item);
      this.event(sc, { frame, kind: 'element', label: `plug ${path.basename(src)}`, path: fmtPath(mp) });
    });
    media.sort((a, b) => a.frame - b.frame);
    if (media.length && media[0].frame > 0) media[0].frame = 0; // the first page is up as the plug starts
    return { ...base, kind: 'plug', media };
  }

  board(sc: SceneCtx, ctx: FrameCtx, base: Pick<BoardScene, 'id' | 'from' | 'duration' | 'transitionIn' | 'transitionOut'>): BoardScene {
    const p = sc.path;
    const raw = sc.raw.nodes;
    const nodes: BoardNode[] = [];
    if (!Array.isArray(raw) || raw.length === 0) this.err([...p, 'nodes'], 'board needs `nodes: [{at, element}]`');
    (Array.isArray(raw) ? raw : []).forEach((n, k) => {
      const np: P = [...p, 'nodes', k];
      if (!isObj(n)) return this.err(np, 'node must be {at, element}');
      const frame = ctx.at(n.at, [...np, 'at'], 0);
      const el = compileElement(n.element, [...np, 'element'], ctx, { frame, end: sc.durF });
      if (!el) return;
      this.elementEvents(sc, el, [...np, 'element'], 'node ');
      const pos = boardPos(k);
      nodes.push({ id: `n${k}`, frame, x: pos.x, y: pos.y, scale: 1, element: el });
    });
    return { ...base, kind: 'board', nodes, line: sc.raw.line === undefined ? false : !!sc.raw.line };
  }
}

// ---------- helpers ----------

function defaultWebcam(s: Scene): WebcamMode {
  switch (s.kind) {
    case 'talking':
      return 'full';
    case 'app':
      return 'pip';
    case 'stage':
      return s.layout === 'center' ? 'pip' : 'hero';
    case 'plug':
      return 'plug';
    case 'board':
    case 'chapter':
      return 'hidden';
  }
}

// Winding left-to-right path on the world canvas (world px, node centres).
function boardPos(k: number) {
  return { x: k * 1500, y: [0, -460, 120, 520, -200][k % 5] };
}

const short = (s: string, n = 28) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

function elText(el: Element): string {
  const e = el as Record<string, unknown>;
  for (const k of ['text', 'title', 'label']) if (typeof e[k] === 'string' && e[k]) return e[k] as string;
  if (el.type === 'tree') return el.root.text;
  if (el.type === 'keys') return el.keys.join('+');
  if (el.type === 'image') return el.caption ?? path.basename(el.src);
  return '';
}

// Visit every nested object that carries a numeric `frame` (items, marks, columns, lit...).
function walkFrames(o: unknown, fn: (obj: Record<string, unknown>, key: string) => void, key = '') {
  if (Array.isArray(o)) return o.forEach((v) => walkFrames(v, fn, key));
  if (!isObj(o)) return;
  if (typeof o.frame === 'number') fn(o, key);
  for (const [k, v] of Object.entries(o)) if (v && typeof v === 'object') walkFrames(v, fn, k);
}

// [a, b) minus a set of [c, d) windows -> remaining intervals.
export function subtract(iv: [number, number], cuts: [number, number][]): [number, number][] {
  let parts: [number, number][] = [iv];
  for (const [c0, c1] of cuts) {
    const next: [number, number][] = [];
    for (const [a, b] of parts) {
      if (c1 <= a || c0 >= b) next.push([a, b]);
      else {
        if (c0 > a) next.push([a, c0]);
        if (c1 < b) next.push([c1, b]);
      }
    }
    parts = next;
  }
  return parts.filter(([a, b]) => b > a);
}

// A piece of a scene: frames shifted so the piece starts at 0, everything outside dropped or
// clamped. Continuations (after a chapter card) fold earlier state changes into `state`.
export function fragment(scene: Scene, shift: number, dur: number, part: number): Scene {
  const s = structuredClone(scene) as Scene;
  s.duration = dur;
  if (shift === 0 && dur === scene.duration) return s;
  const keep = (frame: number, end: number) => end - shift > 0 && frame - shift < dur;
  const shiftEl = (el: Element): Element | null => {
    if (!keep(el.frame, el.end)) return null;
    const lo = Math.max(0, el.frame - shift);
    const hi = Math.min(dur, el.end - shift);
    walkFrames(el, (o) => {
      if (o === (el as unknown)) return;
      o.frame = Math.max(lo, Math.min(hi - 1, (o.frame as number) - shift));
    });
    if (el.type === 'keys' && el.press !== undefined) el.press = Math.max(lo, el.press - shift);
    el.frame = lo;
    el.end = hi;
    return el;
  };
  const shiftEls = (els: Element[]) => els.map(shiftEl).filter((e): e is Element => !!e);
  switch (s.kind) {
    case 'talking':
    case 'stage':
      s.elements = shiftEls(s.elements);
      if (s.kind === 'stage' && s.title) {
        if (!keep(s.title.frame, s.title.end)) s.title = null;
        else s.title = { ...s.title, frame: Math.max(0, s.title.frame - shift), end: Math.min(dur, s.title.end - shift) };
      }
      break;
    case 'app': {
      const state = { ...s.state };
      const out: Action[] = [];
      for (const a of s.actions) {
        const f = a.frame - shift;
        if (f < 0) {
          // happened before this piece: keep only its state effect
          if ((a.do === 'set' || a.do === 'click') && a.set) Object.assign(state, a.set);
          if (a.do === 'tween' && a.end - shift <= 0) {
            state[a.key] = a.to;
            continue;
          }
          if (a.do === 'type') {
            if (a.end - shift <= 0) state[a.key] = a.text;
            else out.push({ ...a, frame: 0, end: Math.min(dur, a.end - shift) });
          }
          if ('end' in a && a.do !== 'type' && a.end - shift > 0) out.push({ ...a, frame: 0, end: Math.min(dur, a.end - shift) } as Action);
          continue;
        }
        if (f >= dur) continue;
        const b = { ...a, frame: f } as Action;
        if ('end' in b) (b as { end: number }).end = Math.min(dur, (a as { end: number }).end - shift);
        out.push(b);
      }
      s.state = state;
      s.actions = out;
      // A recording split by a chapter card carries on where it left off.
      if (s.plate.type === 'video') s.plate.startFrom += shift;
      break;
    }
    case 'plug': {
      const before = s.media.filter((m) => m.frame - shift <= 0);
      const after = s.media.filter((m) => m.frame - shift > 0 && m.frame - shift < dur);
      const first = before[before.length - 1];
      s.media = [...(first ? [{ ...first, frame: 0 }] : []), ...after.map((m) => ({ ...m, frame: m.frame - shift }))].map((m) =>
        m.scroll ? { ...m, scroll: { ...m.scroll, start: m.scroll.start - shift, end: m.scroll.end - shift } } : m,
      );
      break;
    }
    case 'board':
      s.nodes = s.nodes.map((n) => {
        const el = shiftEl(n.element) ?? { ...n.element, frame: 0, end: 0 };
        return { ...n, frame: Math.max(0, Math.min(dur - 1, n.frame - shift)), element: el };
      });
      break;
  }
  void part;
  return s;
}

// State of an app scene at a scene-relative frame (yaml state + set/click/type effects; replica
// defaults are merged by the renderer).
export function sceneStateAt(scene: AppScene, frame: number): Record<string, unknown> {
  const st: Record<string, unknown> = { ...scene.state };
  for (const a of [...scene.actions].sort((x, y) => x.frame - y.frame)) {
    if (a.frame > frame) break;
    if ((a.do === 'set' || a.do === 'click') && a.set) Object.assign(st, a.set);
    if (a.do === 'type') st[a.key] = a.text.slice(0, Math.floor(a.text.length * Math.min(1, (frame - a.frame + 1) / Math.max(1, a.end - a.frame))));
    if (a.do === 'tween') {
      const from = a.from ?? (typeof st[a.key] === 'number' ? (st[a.key] as number) : 0);
      const x = Math.min(1, (frame - a.frame) / Math.max(1, a.end - a.frame));
      const e = x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2; // same cubic ease-in-out as the renderer
      st[a.key] = from + (a.to - from) * e;
    }
  }
  return st;
}

// ---------- work-dir entry points ----------

export function compileEdit(input: CompileInput): CompileResult {
  return new Compiler(input).run();
}

export function probeMediaSize(file: string): [number, number] | null {
  const r = spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0:s=x', file], { encoding: 'utf8' });
  const m = /^(\d+)x(\d+)/.exec(r.stdout?.trim() ?? '');
  return m ? [parseInt(m[1], 10), parseInt(m[2], 10)] : null;
}

export type WorkCompile = CompileResult & { work: string; timelineFile: string; words: Word[] };

export function compileWork(work: string, opts: { write?: boolean } = {}): WorkCompile {
  const editFile = path.join(work, 'edit.yaml');
  if (!fs.existsSync(editFile)) throw new CliError(`no edit.yaml in ${work} (write one; see docs/EDIT-YAML.md)`);
  const opt = <T>(f: string): T | null => (fs.existsSync(path.join(work, f)) ? readJson<T>(path.join(work, f)) : null);
  const words = opt<Word[]>('words.out.json');
  const res = compileEdit({
    yaml: fs.readFileSync(editFile, 'utf8'),
    words,
    aroll: opt<ArollJson>('aroll.json'),
    source: opt<SourceJson>('source.json'),
    arollVideo: fs.existsSync(path.join(work, 'aroll.mp4')),
    face: opt<{ fps: number; x: number[] }>('face.json'),
    probeSize: (src) => (fs.existsSync(path.join(work, src)) ? probeMediaSize(path.join(work, src)) : null),
  });
  const dir = buildDir(work);
  const timelineFile = path.join(dir, 'timeline.json');
  if (opts.write !== false) {
    writeFileAtomic(path.join(dir, 'compile.json'), JSON.stringify({ diags: res.diags, meta: res.meta }, null, 1));
    if (res.timeline) writeFileAtomic(timelineFile, JSON.stringify({ timeline: res.timeline }));
  }
  return { ...res, work, timelineFile, words: words ?? [] };
}

// ---------- reporting ----------

export function formatDiag(d: Diag): string {
  const tag = d.level === 'error' ? c.red('error') : c.yellow('warn ');
  const where = d.path ? `${d.path}${d.line ? c.dim(` (line ${d.line})`) : ''}: ` : d.line ? c.dim(`line ${d.line}: `) : '';
  return `  ${tag} ${where}${d.message}`;
}

export function sceneTable(meta: CompileMeta, timeline: Timeline | null): string {
  const fps = meta.fps;
  const lines = meta.scenes.map((s) => {
    const cam = timeline ? [...timeline.webcam].reverse().find((k) => k.frame <= s.from)?.mode : undefined;
    const sc = timeline?.scenes.find((x) => x.id === s.id);
    const n = sc?.kind === 'app' ? `${sc.actions.length} beats` : sc && 'elements' in sc ? `${sc.elements.length} elements` : sc?.kind === 'board' ? `${sc.nodes.length} nodes` : '';
    return `  ${fmtClock(s.from / fps).padStart(7)}–${fmtClock((s.from + s.duration) / fps).padEnd(7)} ${s.label.padEnd(34)} ${c.dim(`${(s.duration / fps).toFixed(1)}s ${sc ? `in:${sc.transitionIn}` : ''} cam:${cam ?? '-'} ${n}`)}`;
  });
  return lines.join('\n');
}

export async function compileCommand(argv: string[]) {
  const a = parseArgs(argv, ['quiet', 'json']);
  const work = workDir(a);
  const res = compileWork(work);
  if (a.flags.json) {
    console.log(JSON.stringify({ errors: res.errors, warnings: res.warnings, diags: res.diags, timeline: res.timeline ? res.timelineFile : null }, null, 1));
  } else {
    for (const d of res.diags) console.log(formatDiag(d));
    if (res.timeline && !a.flags.quiet) {
      console.log(c.bold(`\n${res.meta.title ?? path.basename(work)}  ${fmtClock(res.timeline.durationInFrames / res.timeline.fps)} @ ${res.timeline.fps} fps  ${res.timeline.scenes.length} scenes  ${res.timeline.chapters.length} chapters`));
      console.log(sceneTable(res.meta, res.timeline));
    }
    console.log(res.timeline ? `\n${c.green('compiled')} ${res.timelineFile}  ${c.dim(`(${res.errors} errors, ${res.warnings} warnings)`)}` : `\n${c.red('failed')}: ${res.errors} errors, ${res.warnings} warnings (timeline.json not written)`);
  }
  if (res.errors) process.exitCode = 1;
}
