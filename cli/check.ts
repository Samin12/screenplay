// screenplay check: compile + lint per docs/EDIT-YAML.md "Rules the checker enforces".
//
//   error  unresolved anchors, unknown replicas / targets, missing media, em dashes on screen
//   warn   phrases found only outside their scene, unknown lucide icons, visuals < 1.2 s,
//          > 6 s without a visual change, headlines > 7 words, overlapping lifts/callouts on a target,
//          undocumented state keys
// Exit code 1 when there are errors.

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { compileWork, formatDiag, MIN_VISUAL_S, type CompileMeta, type Diag, type WorkCompile } from './compile.ts';
import { loadManifest, matchTarget, suggestTargets, type ReplicaInfo } from './replicas.ts';
import { c, fmtClock, parseArgs, workDir } from './util.ts';
import type { Timeline } from '../src/types.ts';

export const MAX_STILL_S = 6;
export const MAX_HEADLINE_WORDS = 7;

// ---------- lucide ----------

const toPascal = (s: string) => s.replace(/(^|[-_ ])(\w)/g, (_: string, __: string, ch: string) => ch.toUpperCase());
const toKebab = (s: string) =>
  s
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([a-zA-Z])(\d)/g, '$1-$2')
    .toLowerCase();

let iconSet: { has: (n: string) => boolean; names: string[] } | null = null;

// Same rule as src/ui/Icon.tsx `iconExists` (which is .tsx and cannot load under plain Node):
// kebab -> PascalCase must be a key of lucide-react's `icons`.
export async function lucide(): Promise<{ has: (n: string) => boolean; names: string[] }> {
  if (iconSet) return iconSet;
  try {
    const mod = (await import('lucide-react')) as { icons: Record<string, unknown> };
    const keys = new Set(Object.keys(mod.icons));
    iconSet = { has: (n) => keys.has(toPascal(n)), names: [...keys].map(toKebab) };
  } catch {
    const dir = path.join(path.dirname(createRequire(import.meta.url).resolve('lucide-react')), 'esm', 'icons');
    const names = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.js')).map((f) => f.slice(0, -3)) : [];
    const set = new Set(names);
    iconSet = { has: (n) => set.has(n), names };
  }
  return iconSet;
}

function nearest(name: string, list: string[], n = 3): string[] {
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
  return list
    .map((k) => ({ k, d: lev(name, k) - (k.includes(name) || name.includes(k) ? 2 : 0) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, n)
    .filter((x) => x.d <= Math.max(3, name.length / 2))
    .map((x) => x.k);
}

// ---------- lint ----------

export type CheckOptions = { manifest?: ReplicaInfo[] | null; fileExists?: (rel: string) => boolean; lucide?: { has: (n: string) => boolean; names: string[] } };

// Pure lint over a compile result (tests call this directly).
export function lint(meta: CompileMeta, timeline: Timeline | null, opts: CheckOptions): Diag[] {
  const out: Diag[] = [];
  const err = (p: string, line: number | undefined, message: string) => out.push({ level: 'error', path: p, line, message });
  const warn = (p: string, line: number | undefined, message: string) => out.push({ level: 'warn', path: p, line, message });
  const fps = meta.fps;

  // replicas + targets
  if (opts.manifest) {
    const byId = new Map(opts.manifest.map((r) => [r.id, r]));
    const badApp = new Set<number>();
    for (const s of meta.scenes) {
      if (s.app && s.part === 0 && !byId.has(s.app) && s.index !== null) {
        badApp.add(s.index);
        err(`scenes[${s.index}].app`, undefined, `unknown replica "${s.app}"; known: ${[...byId.keys()].join(', ')} (see \`screenplay replicas\`)`);
      }
    }
    for (const t of meta.targets) {
      if (t.screenTargets) {
        if (!t.screenTargets.includes(t.name)) {
          const sug = suggestTargets(t.name, t.screenTargets);
          err(t.path, t.line, `unknown target "${t.name}" on this screen plate${sug.length ? `; did you mean ${sug.join(', ')}?` : ''} (defined in scenes[${t.scene}].targets: ${t.screenTargets.join(', ') || 'none'})`);
        }
        continue;
      }
      if (!t.app || badApp.has(t.scene)) continue;
      const r = byId.get(t.app);
      if (!r) continue;
      const keys = Object.keys(r.targets);
      if (!matchTarget(t.name, keys)) {
        const sug = suggestTargets(t.name, keys);
        err(t.path, t.line, `unknown target "${t.name}" for replica ${t.app}${sug.length ? `; did you mean ${sug.join(', ')}?` : ''} (\`screenplay replicas ${t.app}\` lists all ${keys.length})`);
      }
    }
    for (const k of meta.stateKeys) {
      const r = byId.get(k.app);
      if (!r) continue;
      if (!(k.key in r.stateDoc) && !(k.key in r.defaults.state)) warn(k.path, k.line, `state key "${k.key}" is not documented for ${k.app} (known: ${Object.keys(r.stateDoc).join(', ')})`);
    }
  } else if (meta.targets.some((t) => t.app)) {
    warn('', undefined, 'replica manifest unavailable: replica ids and target names were not checked');
  } else {
    for (const t of meta.targets) if (t.screenTargets && !t.screenTargets.includes(t.name)) err(t.path, t.line, `unknown target "${t.name}" on this screen plate (defined: ${t.screenTargets.join(', ') || 'none'})`);
  }

  // icons
  if (opts.lucide) {
    for (const ic of meta.icons) {
      // `claude` (starburst tile) and `critter` (pixel mascot) are the engine's own glyphs.
      if (ic.name !== 'claude' && ic.name !== 'critter' && !opts.lucide.has(ic.name)) {
        const sug = nearest(ic.name, opts.lucide.names);
        warn(ic.path, ic.line, `unknown lucide icon "${ic.name}" (renders a dot)${sug.length ? `; did you mean ${sug.join(', ')}?` : ''}`);
      }
    }
  }

  // media
  if (opts.fileExists) {
    const seen = new Set<string>();
    for (const m of meta.media) {
      if (!m.src || seen.has(`${m.path}`)) continue;
      seen.add(m.path);
      if (!opts.fileExists(m.src)) err(m.path, m.line, `media file not found: ${m.src} (paths are relative to the work dir)`);
    }
  }

  // on-screen text
  for (const t of meta.texts) {
    if (t.text.includes('—')) err(t.path, t.line, `em dash in on-screen text "${t.text}"; use a comma, colon or period`);
    if (t.headline) {
      const n = t.text.replace(/\*/g, '').split(/\s+/).filter(Boolean).length;
      if (n > MAX_HEADLINE_WORDS) warn(t.path, t.line, `headline has ${n} words (keep it to ${MAX_HEADLINE_WORDS}): "${t.text}"`);
    }
  }

  // short visuals
  for (const e of meta.events) {
    if ((e.kind === 'beat' || e.kind === 'element') && e.verb !== 'type' && e.end !== undefined && e.end - e.frame < MIN_VISUAL_S * fps) {
      warn(e.path, e.line, `${e.label} is on screen for only ${((e.end - e.frame) / fps).toFixed(2)} s (min ${MIN_VISUAL_S} s); extend \`until\` or add \`hold\``);
    }
  }

  // overlapping lifts / callouts on the same target
  const spotlight = meta.events.filter((e) => e.kind === 'beat' && e.end !== undefined && ['lift', 'callout', 'focus', 'explode'].includes(e.verb ?? '') && e.targets);
  for (let i = 0; i < spotlight.length; i++) {
    for (let j = i + 1; j < spotlight.length; j++) {
      const a = spotlight[i];
      const b = spotlight[j];
      if (a.scene !== b.scene) continue;
      const shared = a.targets!.filter((t) => b.targets!.includes(t));
      const ov = Math.min(a.end!, b.end!) - Math.max(a.frame, b.frame);
      if (ov <= 0) continue;
      if (shared.length) warn(b.path, b.line, `${b.label} overlaps ${a.path} (${a.label}) on ${shared.join(', ')} for ${(ov / fps).toFixed(1)} s; end the first one earlier (until/hold)`);
      // One spotlight at a time: the scene has a single dim hole, and labels draw over lifted clones.
      else if (ov >= Math.round(0.25 * fps)) warn(b.path, b.line, `${b.label} starts while ${a.label} (${a.path}) is still up (${(ov / fps).toFixed(1)} s overlap); end the first one earlier (e.g. until: "<phrase>" -0.5s) or start this one later`);
    }
  }

  // > 6 s without any visual change
  if (timeline) {
    const pts: number[] = [0, timeline.durationInFrames];
    for (const e of meta.events) {
      pts.push(e.frame);
      if (e.end !== undefined) pts.push(e.end);
    }
    for (const k of timeline.webcam) pts.push(k.frame);
    const modeAt = (f: number) => [...timeline.webcam].reverse().find((k) => k.frame <= f)?.mode;
    if (timeline.aroll) for (const cut of timeline.aroll.cuts) if (modeAt(cut) === 'full') pts.push(cut);
    const fill = (a: number, b: number) => {
      for (let f = a; f <= b; f += fps) pts.push(f);
      pts.push(b);
    };
    for (const s of timeline.scenes) {
      if (s.kind === 'app') for (const a of s.actions) if (a.do === 'type' || a.do === 'zoom') fill(s.from + a.frame, s.from + a.end);
      if (s.kind === 'plug') for (const m of s.media) if (m.scroll) fill(s.from + m.scroll.start, s.from + m.scroll.end);
    }
    const sorted = [...new Set(pts.map((p) => Math.round(p)))].sort((a, b) => a - b);
    for (let i = 1; i < sorted.length; i++) {
      const gap = sorted[i] - sorted[i - 1];
      if (gap > MAX_STILL_S * fps) {
        const sc = meta.scenes.find((s) => s.from <= sorted[i - 1] && sorted[i - 1] < s.from + s.duration);
        const p = sc && sc.index !== null ? `scenes[${sc.index}]` : '';
        warn(p, undefined, `no visual change for ${(gap / fps).toFixed(1)} s (${fmtClock(sorted[i - 1] / fps)}–${fmtClock(sorted[i] / fps)}${sc ? `, in ${sc.label}` : ''}); add a beat or element`);
      }
    }
  }
  return out;
}

export async function checkWork(work: string): Promise<{ res: WorkCompile; diags: Diag[]; manifestError?: string }> {
  const res = compileWork(work);
  const diags = [...res.diags];
  if (res.diags.some((d) => d.message.startsWith('YAML:'))) return { res, diags };
  const needManifest = res.meta.targets.some((t) => t.app) || res.meta.scenes.some((s) => s.app);
  const m = needManifest ? await loadManifest() : null;
  const extra = lint(res.meta, res.timeline, {
    manifest: m && !m.error ? m.replicas : needManifest ? null : [],
    fileExists: (rel) => fs.existsSync(path.join(work, rel)),
    lucide: await lucide(),
  });
  if (m?.error) extra.unshift({ level: 'warn', path: '', message: `could not load src/replicas (${m.error}); replica targets not checked` });
  diags.push(...extra);
  return { res, diags, manifestError: m?.error };
}

export async function checkCommand(argv: string[]) {
  const a = parseArgs(argv, ['json']);
  const work = workDir(a);
  const { res, diags } = await checkWork(work);
  const errors = diags.filter((d) => d.level === 'error');
  const warns = diags.filter((d) => d.level === 'warn');
  if (a.flags.json) {
    console.log(JSON.stringify({ errors: errors.length, warnings: warns.length, diags }, null, 1));
  } else {
    const byLine = (x: Diag, y: Diag) => (x.line ?? 1e9) - (y.line ?? 1e9);
    for (const d of [...errors.sort(byLine), ...warns.sort(byLine)]) console.log(formatDiag(d));
    const t = res.timeline;
    const sum = t ? c.dim(`  ${fmtClock(t.durationInFrames / t.fps)}, ${t.scenes.length} scenes, ${t.chapters.length} chapters, ${res.meta.events.filter((e) => e.kind === 'beat').length} beats, ${res.meta.events.filter((e) => e.kind === 'element').length} elements`) : '';
    console.log(`\n${errors.length ? c.red(`✗ ${errors.length} errors`) : c.green('✓ no errors')}, ${warns.length} warnings${sum}`);
  }
  if (errors.length) process.exitCode = 1;
}
