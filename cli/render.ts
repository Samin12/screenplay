// Remotion-backed commands: still, sheet, targets, render, studio.
// All of them recompile edit.yaml first (cheap), reuse the per-work-dir bundle cache (cli/bundle.ts)
// and share one headless Chrome per invocation.

import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import YAML from 'yaml';
import { AnchorError, WordIndex, parseAnchor, resolveSpec } from './anchors.ts';
import { compileWork, formatDiag, sceneStateAt, type CompileMeta, type MetaEvent, type WorkCompile } from './compile.ts';
import { CHROMIUM, browserLogs, closeBrowser, defaultConcurrency, ensureBundle, getBrowser, onBrowserLog } from './bundle.ts';
import { buildSrt, youtubeChapters } from './captions.ts';
import { loadManifest } from './replicas.ts';
import { CliError, REPO, buildDir, c, flagStr, fmtClock, parseArgs, sha1, workDir, writeFileAtomic, type Args } from './util.ts';
import type { AppScene, Timeline } from '../src/types.ts';
import { PANEL_VIEW } from '../src/theme/panel.ts';

type Ready = WorkCompile & { timeline: Timeline };

function prepare(work: string): Ready {
  const res = compileWork(work);
  const errs = res.diags.filter((d) => d.level === 'error');
  for (const d of errs) console.error(formatDiag(d));
  if (!res.timeline) throw new CliError(`edit.yaml has ${res.errors} error(s); fix them (\`screenplay check ${work}\`) and retry`);
  return res as Ready;
}

// Anchor -> absolute frame (phrases are searched in the whole video).
export function frameOf(raw: string, t: Timeline, words: WorkCompile['words'], mode: 'at' | 'until' = 'at'): number {
  try {
    const spec = parseAnchor(raw);
    let f: number;
    if (spec.kind === 'frame') f = spec.frame + Math.round(spec.offset * t.fps);
    else f = Math.round(resolveSpec(spec, new WordIndex(words), { mode, fps: t.fps }).t * t.fps);
    return Math.max(0, Math.min(t.durationInFrames - 1, f));
  } catch (e) {
    if (e instanceof AnchorError) throw new CliError(`anchor ${JSON.stringify(raw)}: ${e.message}`);
    throw e;
  }
}

const sceneAt = (meta: CompileMeta, f: number) => meta.scenes.find((s) => s.from <= f && f < s.from + s.duration);

// Beats / elements on screen at frame f (instant beats count for 1 s).
function activeAt(meta: CompileMeta, f: number, fps: number): MetaEvent[] {
  return meta.events.filter((e) => (e.kind === 'beat' || e.kind === 'element') && e.frame <= f && f < (e.end ?? e.frame + fps));
}

function range(a: Args, t: Timeline, words: WorkCompile['words']): [number, number] {
  const from = flagStr(a, 'from');
  const to = flagStr(a, 'to');
  const f0 = from ? frameOf(from, t, words) : 0;
  const f1 = to ? frameOf(to, t, words, 'until') : t.durationInFrames - 1;
  if (f1 <= f0) throw new CliError(`--to (${fmtClock(f1 / t.fps)}) must be after --from (${fmtClock(f0 / t.fps)})`);
  return [f0, f1];
}

async function session(work: string, res: Ready) {
  const { selectComposition } = await import('@remotion/renderer');
  const { serveUrl, key } = await ensureBundle(work);
  const browser = await getBrowser();
  const inputProps = { timeline: res.timeline } as Record<string, unknown>;
  const main = await selectComposition({ serveUrl, id: 'Main', inputProps, puppeteerInstance: browser, chromiumOptions: CHROMIUM, logLevel: 'error', onBrowserLog });
  return { serveUrl, key, browser, inputProps, main };
}

function reportBrowserErrors() {
  if (browserLogs.length) {
    console.error(c.yellow(`browser console errors (${browserLogs.length}):`));
    for (const l of [...new Set(browserLogs)].slice(0, 8)) console.error(c.dim(`  ${l.slice(0, 300)}`));
  }
}

async function pool<T>(items: T[], n: number, fn: (x: T, i: number) => Promise<void>) {
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(n, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        await fn(items[i], i);
      }
    }),
  );
}

// ---------------------------------------------------------------- still

export async function stillCommand(argv: string[]) {
  const a = parseArgs(argv);
  const work = workDir(a);
  const at = flagStr(a, 'at') ?? a._[1];
  if (!at) throw new CliError('usage: screenplay still <work> --at <w12|"phrase"|o:sec|f:frame> [-o file.png]');
  const res = prepare(work);
  const t = res.timeline;
  const frame = frameOf(at, t, res.words);
  const out = path.resolve(flagStr(a, 'o', 'out') ?? path.join(buildDir(work), 'stills', `still-${frame}.png`));
  fs.mkdirSync(path.dirname(out), { recursive: true });
  try {
    const { renderStill } = await import('@remotion/renderer');
    const s = await session(work, res);
    const scale = flagStr(a, 'scale') ? Number(flagStr(a, 'scale')) : 1;
    await renderStill({ composition: s.main, serveUrl: s.serveUrl, output: out, frame, inputProps: s.inputProps, ...(/\.jpe?g$/i.test(out) ? { imageFormat: 'jpeg' as const, jpegQuality: 90 } : { imageFormat: 'png' as const }), scale, puppeteerInstance: s.browser, chromiumOptions: CHROMIUM, logLevel: 'error', overwrite: true, onBrowserLog });
  } finally {
    await closeBrowser();
  }
  const sc = sceneAt(res.meta, frame);
  const act = activeAt(res.meta, frame, t.fps).map((e) => e.label);
  console.log(`${out}\n${c.dim(`frame ${frame} (${fmtClock(frame / t.fps, 2)})  ${sc?.label ?? ''}${act.length ? `  · ${act.join(' · ')}` : ''}`)}`);
  reportBrowserErrors();
}

// ---------------------------------------------------------------- sheet

type Shot = { frame: number; label: string; sub: string };

function beatShots(meta: CompileMeta, t: Timeline, f0: number, f1: number): Shot[] {
  const fps = t.fps;
  const shots: Shot[] = [];
  for (const e of meta.events) {
    if (e.kind === 'item' || e.frame < f0 || e.frame > f1) continue;
    const end = e.end ?? e.frame + 1;
    let f: number;
    if (e.kind === 'scene' || e.kind === 'chapter') f = e.frame + Math.min(Math.round(0.6 * fps), Math.max(0, end - e.frame - 1));
    else if (e.verb === 'type') f = Math.max(e.frame, end - 2);
    else if (e.end === undefined) f = e.frame + Math.round(0.15 * fps);
    else f = e.frame + Math.min(Math.round(0.8 * fps), Math.floor((end - e.frame) / 2));
    // hidden under a chapter card: show it where it surfaces (the card's end)
    const card = e.kind !== 'chapter' ? meta.scenes.find((x) => x.kind === 'chapter' && x.from <= f && f < x.from + x.duration) : undefined;
    if (card) f = card.from + card.duration + Math.round(0.6 * fps);
    f = Math.max(f0, Math.min(f1, Math.min(t.durationInFrames - 1, f)));
    const sc = sceneAt(meta, f);
    shots.push({ frame: f, label: e.kind === 'scene' || e.kind === 'chapter' ? e.label : `${e.scene} ${e.label}`, sub: e.kind === 'scene' || e.kind === 'chapter' ? '' : (sc?.label ?? '') });
  }
  shots.sort((x, y) => x.frame - y.frame);
  // merge shots that land within 0.25 s of each other
  const merged: Shot[] = [];
  for (const s of shots) {
    const last = merged[merged.length - 1];
    if (last && s.frame - last.frame < Math.round(0.25 * fps)) {
      last.label = `${last.label} + ${s.label.replace(/^s\d+(\.\d+)? /, '')}`;
      continue;
    }
    merged.push({ ...s });
  }
  return merged;
}

function everyShots(meta: CompileMeta, t: Timeline, f0: number, f1: number, step: number): Shot[] {
  const shots: Shot[] = [];
  for (let f = f0; f <= f1; f += step) {
    const sc = sceneAt(meta, f);
    const act = activeAt(meta, f, t.fps).map((e) => e.label);
    shots.push({ frame: f, label: sc?.label ?? '', sub: act.slice(-2).join(' · ') });
  }
  return shots;
}

export async function sheetCommand(argv: string[]) {
  const a = parseArgs(argv, ['beats']);
  const work = workDir(a);
  const res = prepare(work);
  const t = res.timeline;
  const [f0, f1] = range(a, t, res.words);
  const every = flagStr(a, 'every');
  let shots: Shot[];
  if (every) {
    const sec = parseFloat(every);
    if (!(sec > 0)) throw new CliError('--every needs a duration like 2s');
    shots = everyShots(res.meta, t, f0, f1, Math.max(1, Math.round(sec * t.fps)));
  } else shots = beatShots(res.meta, t, f0, f1);
  if (shots.length === 0) throw new CliError('nothing to show in that range');
  const perPage = Math.max(4, parseInt(flagStr(a, 'per-page') ?? '24', 10));
  const cols = Math.max(1, parseInt(flagStr(a, 'cols') ?? '4', 10));

  const sheetDir = path.join(buildDir(work), 'sheet');
  const framesDir = path.join(sheetDir, 'frames');
  fs.mkdirSync(framesDir, { recursive: true });
  const outBase = path.resolve(flagStr(a, 'o', 'out') ?? path.join(buildDir(work), 'sheet.jpg'));
  const outputs: string[] = [];
  const t0 = Date.now();
  try {
    const { renderStill, selectComposition } = await import('@remotion/renderer');
    const s = await session(work, res);
    // thumbnails, cached per (timeline, bundle)
    const key = sha1(JSON.stringify(t) + s.key).slice(0, 12);
    const keyFile = path.join(framesDir, '.key');
    const fresh = fs.existsSync(keyFile) && fs.readFileSync(keyFile, 'utf8') === key ? new Set(fs.readdirSync(framesDir)) : new Set<string>();
    fs.writeFileSync(keyFile, key);
    const todo = [...new Set(shots.map((x) => x.frame))].filter((f) => !fresh.has(`f-${f}.jpg`));
    let done = 0;
    await pool(todo, defaultConcurrency(), async (f) => {
      await renderStill({ composition: s.main, serveUrl: s.serveUrl, output: path.join(framesDir, `f-${f}.jpg`), frame: f, inputProps: s.inputProps, imageFormat: 'jpeg', jpegQuality: 82, scale: 0.25, puppeteerInstance: s.browser, chromiumOptions: CHROMIUM, logLevel: 'error', overwrite: true, onBrowserLog });
      done++;
      if (process.stderr.isTTY) process.stderr.write(c.dim(`\rrendering thumbnails ${done}/${todo.length}`));
    });
    if (todo.length && process.stderr.isTTY) process.stderr.write('\n');
    const pages = Math.ceil(shots.length / perPage);
    for (let p = 0; p < pages; p++) {
      const items = shots.slice(p * perPage, (p + 1) * perPage).map((x) => ({ src: `_sheet/frames/f-${x.frame}.jpg`, time: fmtClock(x.frame / t.fps), label: x.label, sub: x.sub }));
      const title = `${res.meta.title ?? path.basename(work)}  ·  ${every ? `every ${every}` : 'beats'}  ·  ${fmtClock(f0 / t.fps)}–${fmtClock(f1 / t.fps)}${pages > 1 ? `  ·  page ${p + 1}/${pages}` : ''}`;
      const props = { title, columns: cols, thumb: [480, 270], items } as Record<string, unknown>;
      const comp = await selectComposition({ serveUrl: s.serveUrl, id: 'Sheet', inputProps: props, puppeteerInstance: s.browser, chromiumOptions: CHROMIUM, logLevel: 'error' });
      const ext = path.extname(outBase) || '.jpg';
      const out = pages > 1 ? `${outBase.slice(0, outBase.length - ext.length)}-${p + 1}${ext}` : outBase;
      await renderStill({ composition: comp, serveUrl: s.serveUrl, output: out, frame: 0, inputProps: props, ...(/\.png$/i.test(out) ? { imageFormat: 'png' as const } : { imageFormat: 'jpeg' as const, jpegQuality: 88 }), puppeteerInstance: s.browser, chromiumOptions: CHROMIUM, logLevel: 'error', overwrite: true });
      outputs.push(out);
    }
  } finally {
    await closeBrowser();
  }
  console.log(outputs.join('\n'));
  console.log(c.dim(`${shots.length} shots on ${outputs.length} sheet(s) in ${((Date.now() - t0) / 1000).toFixed(1)} s`));
  reportBrowserErrors();
}

// ---------------------------------------------------------------- targets

export async function targetsCommand(argv: string[]) {
  const a = parseArgs(argv);
  const work = workDir(a);
  const sceneArg = flagStr(a, 'scene');
  const appArg = flagStr(a, 'app');
  if (sceneArg === undefined && !appArg) throw new CliError('usage: screenplay targets <work> --scene <n> [--at <anchor>]   (or --app <replica> [--state \'{"k":v}\'])');
  const res = compileWork(work);
  let props: Record<string, unknown>;
  let label: string;
  let appId: string | undefined;
  if (appArg) {
    let state: Record<string, unknown> = {};
    const st = flagStr(a, 'state');
    if (st) {
      try {
        state = YAML.parse(st) as Record<string, unknown>;
      } catch (e) {
        throw new CliError(`--state: ${(e as Error).message}`);
      }
    }
    appId = appArg;
    props = { app: appArg, data: {}, state, caption: `replica defaults · state ${JSON.stringify(state)}` };
    label = `app-${appArg}`;
  } else {
    const n = parseInt(sceneArg!, 10);
    const at = flagStr(a, 'at');
    const frags = (res.timeline?.scenes ?? []).filter((s): s is AppScene => s.kind === 'app' && (s.id === `s${n}` || s.id.startsWith(`s${n}.`)));
    if (frags.length) {
      let frag = frags[0];
      let rel = 0;
      if (at) {
        const abs = frameOf(at, res.timeline!, res.words);
        frag = frags.find((s) => s.from <= abs && abs < s.from + s.duration) ?? frags[0];
        rel = Math.max(0, Math.min(frag.duration - 1, abs - frag.from));
        if (abs < frags[0].from || abs >= frags[frags.length - 1].from + frags[frags.length - 1].duration) console.error(c.yellow(`warn: --at ${at} (${fmtClock(abs / res.timeline!.fps)}) is outside scenes[${n}]; clamped`));
      }
      const state = sceneStateAt(frag, rel);
      const when = at ? ` at ${fmtClock((frag.from + rel) / res.timeline!.fps)}` : ' at its start';
      if (frag.plate.type === 'replica') {
        appId = frag.plate.app;
        props = { app: frag.plate.app, data: frag.plate.data, state, plate: res.timeline?.look === 'panel' ? PANEL_VIEW : undefined, caption: `scenes[${n}]${when} · state ${JSON.stringify(state)}` };
      } else props = { screen: { src: frag.plate.src, size: frag.plate.size, targets: frag.plate.targets }, caption: `scenes[${n}] screen plate ${frag.plate.size[0]}×${frag.plate.size[1]}` };
    } else {
      // edit.yaml does not compile (or the scene is not an app scene): fall back to its raw fields
      const doc = YAML.parse(fs.readFileSync(path.join(work, 'edit.yaml'), 'utf8')) as { scenes?: Record<string, unknown>[] };
      const raw = doc?.scenes?.[n];
      if (!raw) throw new CliError(`edit.yaml has no scenes[${n}] (it has ${doc?.scenes?.length ?? 0})`);
      if (raw.kind !== 'app') throw new CliError(`scenes[${n}] is a ${String(raw.kind)} scene; targets only exist in app scenes`);
      if (res.errors) console.error(c.yellow(`warn: edit.yaml has ${res.errors} error(s); showing scenes[${n}] from its raw app/data/state (beats not applied)`));
      if (typeof raw.screen === 'string') {
        const tg: Record<string, { x: number; y: number; w: number; h: number }> = {};
        for (const [k, r] of Object.entries((raw.targets as Record<string, number[]>) ?? {})) tg[k] = { x: r[0], y: r[1], w: r[2], h: r[3] };
        props = { screen: { src: raw.screen.replace(/^\.\//, ''), size: (raw.size as [number, number]) ?? [1920, 1080], targets: tg } };
      } else {
        appId = String(raw.app);
        props = { app: raw.app, data: raw.data ?? {}, state: raw.state ?? {}, plate: (YAML.parse(fs.readFileSync(path.join(work, 'edit.yaml'), 'utf8')) as { look?: string }).look === 'reference' ? undefined : PANEL_VIEW, caption: `scenes[${n}] (raw) · state ${JSON.stringify(raw.state ?? {})}` };
      }
    }
    label = `s${n}`;
  }
  const out = path.resolve(flagStr(a, 'o', 'out') ?? path.join(buildDir(work), `targets-${label}.png`));
  const measured: { name: string; dup: number; r: number[] }[] = [];
  try {
    const { renderStill, selectComposition } = await import('@remotion/renderer');
    const { serveUrl } = await ensureBundle(work);
    const browser = await getBrowser();
    const logs = (l: { type: string; text: string }) => {
      if (l.text.startsWith('SCREENPLAY_TARGETS ')) measured.push(...JSON.parse(l.text.slice('SCREENPLAY_TARGETS '.length)));
      else onBrowserLog(l);
    };
    const comp = await selectComposition({ serveUrl, id: 'Targets', inputProps: props, puppeteerInstance: browser, chromiumOptions: CHROMIUM, logLevel: 'error' });
    await renderStill({ composition: comp, serveUrl, output: out, frame: 0, inputProps: props, imageFormat: 'png', puppeteerInstance: browser, chromiumOptions: CHROMIUM, logLevel: 'error', overwrite: true, onBrowserLog: logs });
  } finally {
    await closeBrowser();
  }
  console.log(out);
  if (measured.length) {
    const names = [...new Set(measured.map((m) => m.name))];
    console.log(c.dim(`measured ${names.length} targets in this state (name [x y w h] in design px):`));
    console.log(
      names
        .map((n) => {
          const m = measured.find((x) => x.name === n)!;
          const k = measured.filter((x) => x.name === n).length;
          return `  ${n} [${m.r.join(' ')}]${k > 1 ? c.dim(` ×${k}, first wins`) : ''}`;
        })
        .join('\n'),
    );
  }
  if (appId) {
    const m = await loadManifest({ allowRemotion: false });
    const r = m.replicas.find((x) => x.id === appId);
    if (r) {
      const present = new Set(measured.map((x) => x.name));
      const missing = Object.keys(r.targets).filter((k) => !/<|\b[NMK]\b/.test(k) && !present.has(k));
      if (missing.length) console.log(c.dim(`documented but not present in this state: ${missing.join(', ')}`));
    }
  }
  reportBrowserErrors();
}

// ---------------------------------------------------------------- render

export async function renderCommand(argv: string[]) {
  const a = parseArgs(argv, ['preview']);
  const work = workDir(a);
  const res = prepare(work);
  const t = res.timeline;
  const preview = !!a.flags.preview;
  const [f0, f1] = range(a, t, res.words);
  const partial = f0 > 0 || f1 < t.durationInFrames - 1;
  const slug = (res.meta.title ?? path.basename(work)).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'screenplay';
  const out = path.resolve(flagStr(a, 'o', 'out') ?? path.join(work, 'out', `${slug}${preview ? '-preview' : ''}.mp4`));
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const conc = flagStr(a, 'concurrency');
  const t0 = Date.now();
  try {
    const { renderMedia } = await import('@remotion/renderer');
    const s = await session(work, res);
    let lastPct = -1;
    await renderMedia({
      composition: s.main,
      serveUrl: s.serveUrl,
      codec: 'h264',
      outputLocation: out,
      inputProps: s.inputProps,
      crf: preview ? 26 : 18,
      scale: preview ? 2 / 3 : 1,
      x264Preset: preview ? 'veryfast' : 'medium',
      imageFormat: 'jpeg',
      jpegQuality: preview ? 80 : 92,
      frameRange: partial ? [f0, f1] : null,
      concurrency: conc ? (isNaN(Number(conc)) ? conc : Number(conc)) : null,
      puppeteerInstance: s.browser,
      chromiumOptions: CHROMIUM,
      logLevel: 'error',
      overwrite: true,
      onBrowserLog,
      onProgress: ({ progress, renderedFrames, encodedFrames }) => {
        const pct = Math.floor(progress * 100);
        if (process.stderr.isTTY) process.stderr.write(c.dim(`\rrendering ${pct}%  (${renderedFrames} rendered, ${encodedFrames} encoded)   `));
        else if (pct >= lastPct + 10) {
          lastPct = pct - (pct % 10);
          process.stderr.write(c.dim(`rendering ${pct}%\n`));
        }
      },
    });
    if (process.stderr.isTTY) process.stderr.write('\n');
  } finally {
    await closeBrowser();
  }
  const base = out.replace(/\.[^.]+$/, '');
  const ch = youtubeChapters(t, { fromF: f0, toF: f1 + 1 });
  if (ch.text) writeFileAtomic(`${base}.chapters.txt`, ch.text);
  writeFileAtomic(`${base}.srt`, buildSrt(res.words, { from: f0 / t.fps, to: (f1 + 1) / t.fps }));
  console.log(out);
  if (ch.text) console.log(`${base}.chapters.txt`);
  console.log(`${base}.srt`);
  for (const w of ch.warnings) console.log(c.dim(`note: ${w}`));
  console.log(c.dim(`${f1 - f0 + 1} frames (${fmtClock((f1 - f0 + 1) / t.fps)}) ${preview ? '720p preview' : '1080p'} in ${((Date.now() - t0) / 1000).toFixed(1)} s`));
  reportBrowserErrors();
}

// ---------------------------------------------------------------- studio

export async function studioCommand(argv: string[]) {
  const a = parseArgs(argv);
  const work = workDir(a);
  const res = compileWork(work);
  for (const d of res.diags) console.log(formatDiag(d));
  if (!res.timeline && !fs.existsSync(res.timelineFile)) throw new CliError('edit.yaml does not compile and there is no previous timeline.json');
  if (!res.timeline) console.error(c.yellow('edit.yaml has errors; opening Studio on the previous timeline.json'));
  const local = path.join(REPO, 'node_modules', '.bin', 'remotion');
  const [cmd, args] = fs.existsSync(local) ? [local, []] : ['npx', ['remotion']];
  const passthrough = argv.filter((x) => x !== a._[0]); // e.g. --port 3001 --no-open
  const child = spawn(cmd, [...args, 'studio', 'src/index.ts', '--public-dir', work, '--props', res.timelineFile, ...passthrough], { cwd: REPO, stdio: 'inherit' });
  await new Promise<void>((resolve) => child.on('exit', (code) => ((process.exitCode = code ?? 0), resolve())));
}
