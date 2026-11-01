// Remotion bundle cache + browser session shared by still / sheet / targets / render / replicas.
//
// The webpack bundle is cached per work dir in <work>/.screenplay/bundle, keyed on a hash of every
// src/** file's mtime+size (plus the lockfile), so repeated stills skip bundling entirely.
//
// Public dir: the bundle is built WITHOUT a public dir (copying a work dir with a multi-GB aroll.mp4
// into every bundle would be slow, and <work>/.screenplay lives inside it). Instead
// <bundle>/public is synced on every run with links to the work dir's top-level entries:
// directories as symlinks, files as hard links (Remotion's file server refuses to serve a path
// whose final component is a symlink, but follows symlinked directories). `.screenplay` itself is
// never linked, so there is no symlink loop; `_sheet` points at .screenplay/sheet for contact sheets.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { CACHE_DIR, REPO, c, treeHash } from './util.ts';

export const SRC = path.join(REPO, 'src');
export const ENTRY = path.join(SRC, 'index.ts');
export const CHROMIUM = { gl: 'angle' as const };

export function srcHash(): string {
  const lock = path.join(REPO, 'package-lock.json');
  const extra = fs.existsSync(lock) ? [`lock:${fs.statSync(lock).mtimeMs}`] : [];
  return treeHash([SRC], extra);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function withLock<T>(lockDir: string, fn: () => Promise<T>): Promise<T> {
  const t0 = Date.now();
  for (;;) {
    try {
      fs.mkdirSync(lockDir);
      break;
    } catch {
      let age = 0;
      try {
        age = Date.now() - fs.statSync(lockDir).mtimeMs;
      } catch {
        continue;
      }
      if (age > 10 * 60_000) {
        fs.rmdirSync(lockDir); // stale lock from a crashed run (an empty dir we created)
        continue;
      }
      if (Date.now() - t0 > 15 * 60_000) throw new Error(`timed out waiting for ${lockDir}`);
      await sleep(400);
    }
  }
  try {
    return await fn();
  } finally {
    try {
      fs.rmdirSync(lockDir);
    } catch {
      /* already gone */
    }
  }
}

export type BundleInfo = { serveUrl: string; key: string; fresh: boolean };

// Returns the bundle directory (usable as serveUrl). `work` null -> a shared bundle without media.
export async function ensureBundle(work: string | null, opts: { quiet?: boolean } = {}): Promise<BundleInfo> {
  const outDir = work ? path.join(work, '.screenplay', 'bundle') : path.join(CACHE_DIR, 'bundle');
  fs.mkdirSync(path.dirname(outDir), { recursive: true });
  const key = srcHash();
  const keyFile = path.join(outDir, '.screenplay-key');
  const ok = () => fs.existsSync(path.join(outDir, 'index.html')) && fs.existsSync(keyFile) && fs.readFileSync(keyFile, 'utf8') === key;
  let fresh = false;
  if (!ok()) {
    await withLock(`${outDir}.lock`, async () => {
      if (ok()) return;
      const { bundle } = await import('@remotion/bundler');
      const t0 = Date.now();
      if (!opts.quiet) process.stderr.write(c.dim(`bundling src/ (cached in ${outDir})... `));
      let last = -1;
      await bundle({
        entryPoint: ENTRY,
        outDir,
        publicDir: path.join(path.dirname(outDir), '.no-public-dir'),
        enableCaching: true,
        onProgress: (p: number) => {
          if (opts.quiet || !process.stderr.isTTY) return;
          const q = Math.floor(p / 10);
          if (q !== last) {
            last = q;
            process.stderr.write(c.dim(`${p}% `));
          }
        },
      });
      fs.writeFileSync(keyFile, key);
      fresh = true;
      if (!opts.quiet) process.stderr.write(c.dim(`done in ${((Date.now() - t0) / 1000).toFixed(1)} s\n`));
    });
  }
  syncPublic(outDir, work);
  return { serveUrl: outDir, key, fresh };
}

function linkInfo(p: string): fs.Stats | null {
  try {
    return fs.lstatSync(p);
  } catch {
    return null;
  }
}

export function syncPublic(outDir: string, work: string | null) {
  const pub = path.join(outDir, 'public');
  fs.mkdirSync(pub, { recursive: true });
  const want = new Map<string, { dir: boolean; src: string }>();
  if (work) {
    for (const e of fs.readdirSync(work)) {
      if (e === '.screenplay' || e === '.DS_Store') continue;
      const src = path.join(work, e);
      let st: fs.Stats;
      try {
        st = fs.statSync(src);
      } catch {
        continue; // dangling symlink
      }
      want.set(e, { dir: st.isDirectory(), src: st.isDirectory() ? src : fs.realpathSync(src) });
    }
    const sheet = path.join(work, '.screenplay', 'sheet');
    fs.mkdirSync(sheet, { recursive: true });
    want.set('_sheet', { dir: true, src: sheet });
  }
  for (const e of fs.readdirSync(pub)) {
    const dest = path.join(pub, e);
    const l = linkInfo(dest)!;
    const w = want.get(e);
    let good = false;
    if (w && w.dir) good = l.isSymbolicLink() && fs.readlinkSync(dest) === w.src;
    else if (w && !w.dir) {
      const s = linkInfo(w.src);
      good = !l.isSymbolicLink() && l.isFile() && !!s && s.ino === l.ino && s.dev === l.dev;
    }
    if (good) {
      want.delete(e);
      continue;
    }
    // Only ever remove our own links (or single files we copied); never recurse into a directory.
    if (l.isSymbolicLink() || l.isFile()) fs.unlinkSync(dest);
  }
  for (const [e, w] of want) {
    const dest = path.join(pub, e);
    if (linkInfo(dest)) continue;
    if (w.dir) fs.symlinkSync(w.src, dest);
    else {
      try {
        fs.linkSync(w.src, dest);
      } catch {
        const size = fs.statSync(w.src).size;
        if (size > 50e6) process.stderr.write(c.yellow(`copying ${e} (${(size / 1e6).toFixed(0)} MB) into the bundle: hard link failed (different volume?)\n`));
        fs.copyFileSync(w.src, dest);
      }
    }
  }
}

// ---------- browser session ----------

type Browser = Awaited<ReturnType<typeof import('@remotion/renderer').openBrowser>>;
let browser: Browser | null = null;

export async function getBrowser(): Promise<Browser> {
  if (browser) return browser;
  const { openBrowser } = await import('@remotion/renderer');
  browser = await openBrowser('chrome', { chromiumOptions: CHROMIUM, logLevel: 'error' });
  return browser;
}

export async function closeBrowser() {
  if (browser) {
    const b = browser;
    browser = null;
    await b.close({ silent: true }).catch(() => {});
  }
}

export const defaultConcurrency = () => Math.max(1, Math.min(6, Math.floor(os.cpus().length / 2)));

// Collect browser console errors so a broken replica/element explains itself.
export const browserLogs: string[] = [];
export const onBrowserLog = (log: { type: string; text: string }) => {
  if (log.type === 'error' && browserLogs.length < 50) browserLogs.push(log.text);
};
