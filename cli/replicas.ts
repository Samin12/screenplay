// Replica manifest: id, title, size, targets doc, stateDoc and defaults of every replica in
// src/replicas/index.ts, for `screenplay replicas` and the target checks in `screenplay check`.
//
// How it is obtained (src/replicas imports .tsx, which plain Node cannot load):
//   1. fast path: esbuild (already installed as a Remotion dependency) bundles src/replicas/index.ts
//      for Node (npm packages stay external, font loaders and asset imports are stubbed), and the
//      result is imported. ~100 ms.
//   2. fallback: if that import throws (a replica touching browser APIs at import time), the
//      Remotion bundle is used: the `Targets` composition's calculateMetadata returns the same
//      manifest when called with {manifest: true}. Needs Chrome, ~2 s with a cached bundle.
// Either way the result is cached in node_modules/.cache/screenplay/replicas.json, keyed on the
// src/** hash.

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import YAML from 'yaml';
import { CACHE_DIR, REPO, c, parseArgs, writeFileAtomic } from './util.ts';
import { srcHash } from './bundle.ts';

export type ReplicaInfo = {
  id: string;
  title: string;
  size: [number, number];
  tone: 'dark' | 'light';
  targets: Record<string, string>;
  stateDoc: Record<string, string>;
  defaults: { data: Record<string, unknown>; state: Record<string, unknown> };
};

export type Manifest = { replicas: ReplicaInfo[]; via: string; error?: string };

const MANIFEST = path.join(CACHE_DIR, 'replicas.json');

async function viaEsbuild(hash: string): Promise<ReplicaInfo[]> {
  let esbuild: typeof import('esbuild');
  try {
    esbuild = await import('esbuild');
  } catch {
    const req = createRequire(createRequire(import.meta.url).resolve('@remotion/bundler'));
    esbuild = req('esbuild');
  }
  const out = path.join(CACHE_DIR, 'replicas-node.mjs');
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  await esbuild.build({
    entryPoints: [path.join(REPO, 'src', 'replicas', 'index.ts')],
    bundle: true,
    platform: 'node',
    format: 'esm',
    jsx: 'automatic',
    packages: 'external',
    outfile: out,
    logLevel: 'silent',
    loader: { '.png': 'empty', '.jpg': 'empty', '.jpeg': 'empty', '.svg': 'empty', '.webp': 'empty', '.css': 'empty', '.woff2': 'empty', '.ttf': 'empty' },
    plugins: [
      {
        name: 'stub-fonts',
        setup(b) {
          b.onResolve({ filter: /^@remotion\/(google-fonts|fonts)(\/.*)?$/ }, (a) => ({ path: a.path, namespace: 'stub' }));
          b.onLoad({ filter: /.*/, namespace: 'stub' }, () => ({
            contents: 'export const loadFont = () => ({ fontFamily: "sans-serif", fonts: {}, unicodeRanges: {}, waitUntilDone: async () => {} }); export default {};',
            loader: 'js',
          }));
        },
      },
    ],
  });
  const mod = (await import(`${pathToFileURL(out).href}?v=${hash}`)) as { replicas?: Record<string, ReplicaInfo> };
  if (!mod.replicas) throw new Error('src/replicas/index.ts does not export `replicas`');
  return Object.values(mod.replicas).map((r) => JSON.parse(JSON.stringify({ id: r.id, title: r.title, size: r.size, tone: r.tone, targets: r.targets ?? {}, stateDoc: r.stateDoc ?? {}, defaults: r.defaults ?? { data: {}, state: {} } })));
}

async function viaRemotion(): Promise<ReplicaInfo[]> {
  const { ensureBundle, getBrowser, CHROMIUM } = await import('./bundle.ts');
  const { selectComposition } = await import('@remotion/renderer');
  const { serveUrl } = await ensureBundle(null, { quiet: true });
  const comp = await selectComposition({ serveUrl, id: 'Targets', inputProps: { manifest: true }, puppeteerInstance: await getBrowser(), chromiumOptions: CHROMIUM, logLevel: 'error' });
  const m = (comp.props as { manifest?: ReplicaInfo[] }).manifest;
  if (!Array.isArray(m)) throw new Error('Targets composition did not return a manifest');
  return m;
}

export async function loadManifest(opts: { allowRemotion?: boolean } = {}): Promise<Manifest> {
  const hash = srcHash();
  const force = process.env.SCREENPLAY_REPLICAS_VIA; // 'esbuild' | 'remotion': skip the cache, force a path
  try {
    if (force) throw new Error('forced');
    const cached = JSON.parse(fs.readFileSync(MANIFEST, 'utf8')) as { hash: string; replicas: ReplicaInfo[]; via: string };
    if (cached.hash === hash) return { replicas: cached.replicas, via: `${cached.via} (cached)` };
  } catch {
    /* no cache */
  }
  let replicas: ReplicaInfo[];
  let via = 'esbuild';
  try {
    if (force === 'remotion') throw new Error('SCREENPLAY_REPLICAS_VIA=remotion');
    replicas = await viaEsbuild(hash);
  } catch (e) {
    const first = (e as Error).message.split('\n')[0];
    if (opts.allowRemotion === false) return { replicas: [], via: 'none', error: first };
    try {
      replicas = await viaRemotion();
      via = 'remotion';
    } catch (e2) {
      return { replicas: [], via: 'none', error: `${first}; remotion fallback: ${(e2 as Error).message.split('\n')[0]}` };
    } finally {
      const { closeBrowser } = await import('./bundle.ts');
      await closeBrowser();
    }
  }
  writeFileAtomic(MANIFEST, JSON.stringify({ hash, via, replicas }, null, 1));
  return { replicas, via };
}

// ---------- target name patterns ----------
// Docs keys may be patterns: `item-N` (N/M/K = a number), `session-<id>` (<anything> = any token).

export function targetPattern(key: string): RegExp {
  const parts = key.split(/(<[^>]+>|\b[NMK]\b)/);
  const src = parts.map((p) => (/^<[^>]+>$/.test(p) ? '[^\\s]+' : /^[NMK]$/.test(p) ? '\\d+' : p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))).join('');
  return new RegExp(`^${src}$`);
}

export const isPatternKey = (key: string) => /<[^>]+>|\b[NMK]\b/.test(key);

export function matchTarget(name: string, keys: string[]): string | null {
  if (keys.includes(name)) return name;
  for (const k of keys) if (isPatternKey(k) && targetPattern(k).test(name)) return k;
  return null;
}

export function suggestTargets(name: string, keys: string[], n = 3): string[] {
  const score = (a: string, b: string) => {
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
    return dp[b.length] / Math.max(a.length, b.length);
  };
  return keys
    .map((k) => ({ k, s: Math.min(score(name, k), isPatternKey(k) ? score(name.replace(/\d+/g, 'N'), k) : 1) }))
    .filter((x) => x.s < 0.6)
    .sort((a, b) => a.s - b.s)
    .slice(0, n)
    .map((x) => x.k);
}

// ---------- command ----------

export async function replicasCommand(argv: string[]) {
  const a = parseArgs(argv, ['json']);
  const m = await loadManifest();
  if (m.error) {
    console.error(`${c.red('error')} could not load src/replicas: ${m.error}`);
    process.exitCode = 1;
    return;
  }
  const only = a._[0];
  const list = only ? m.replicas.filter((r) => r.id === only) : m.replicas;
  if (only && list.length === 0) {
    console.error(`${c.red('error')} no replica "${only}"; known: ${m.replicas.map((r) => r.id).join(', ')}`);
    process.exitCode = 1;
    return;
  }
  if (a.flags.json) {
    console.log(JSON.stringify(list, null, 1));
    return;
  }
  for (const r of list) {
    console.log(`${c.bold(r.id)}  ${r.title}  ${c.dim(`${r.size[0]}×${r.size[1]} ${r.tone}`)}`);
    const tw = Math.max(8, ...Object.keys(r.targets).map((k) => k.length));
    console.log(c.dim('  targets'));
    for (const [k, v] of Object.entries(r.targets)) console.log(`    ${k.padEnd(tw)}  ${c.dim(v)}`);
    const sw = Math.max(8, ...Object.keys(r.stateDoc).map((k) => k.length));
    console.log(c.dim('  state'));
    for (const [k, v] of Object.entries(r.stateDoc)) console.log(`    ${k.padEnd(sw)}  ${c.dim(v)}${k in r.defaults.state ? c.dim(`  (default ${JSON.stringify(r.defaults.state[k])})`) : ''}`);
    if (only) {
      console.log(c.dim('  default data (override any of it with `data:` in the scene)'));
      console.log(
        YAML.stringify(r.defaults.data, { lineWidth: 120 })
          .trimEnd()
          .split('\n')
          .map((l) => `    ${l}`)
          .join('\n'),
      );
    }
    console.log('');
  }
  if (!only) console.log(c.dim(`${list.length} replicas (via ${m.via}). \`screenplay replicas <id>\` shows default data; \`screenplay targets <work> --scene <n>\` shows target boxes.`));
}
