// Small shared helpers for the screenplay CLI (no Remotion, no React: safe to import anywhere).

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

export const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const CACHE_DIR = path.join(REPO, 'node_modules', '.cache', 'screenplay');

// ---------- argv ----------

export type Args = { _: string[]; flags: Record<string, string | true> };

// `--key value`, `--key=value`, `--flag` (boolean), `-o value`. Positionals in `_`.
export function parseArgs(argv: string[], booleans: string[] = []): Args {
  const out: Args = { _: [], flags: {} };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--') {
      out._.push(...argv.slice(i + 1));
      break;
    }
    const long = /^--([^=]+)(?:=(.*))?$/.exec(a);
    const short = /^-([a-zA-Z])$/.exec(a);
    if (long || short) {
      const key = long ? long[1] : short![1];
      if (long && long[2] !== undefined) out.flags[key] = long[2];
      else if (booleans.includes(key) || i + 1 >= argv.length || /^--?[a-zA-Z]/.test(argv[i + 1])) out.flags[key] = true;
      else out.flags[key] = argv[++i];
      continue;
    }
    out._.push(a);
  }
  return out;
}

export const flagStr = (a: Args, ...keys: string[]): string | undefined => {
  for (const k of keys) {
    const v = a.flags[k];
    if (typeof v === 'string') return v;
  }
  return undefined;
};

export class CliError extends Error {}

// ---------- work dir ----------

export function workDir(a: Args): string {
  const w = a._[0];
  if (!w) throw new CliError('missing <work> directory argument');
  const abs = path.resolve(w);
  if (!fs.existsSync(abs) || !fs.statSync(abs).isDirectory()) throw new CliError(`work directory not found: ${abs}`);
  return abs;
}

export const buildDir = (work: string) => {
  const d = path.join(work, '.screenplay');
  fs.mkdirSync(d, { recursive: true });
  return d;
};

export function readJson<T>(file: string): T {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8')) as T;
  } catch (e) {
    throw new CliError(`cannot read ${file}: ${(e as Error).message}`);
  }
}

export function writeFileAtomic(file: string, data: string | Buffer) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp-${process.pid}`;
  fs.writeFileSync(tmp, data);
  fs.renameSync(tmp, file);
}

// ---------- hashing ----------

// Hash of every file's path + mtime + size under the given roots (fast: no file contents read).
export function treeHash(roots: string[], extra: string[] = []): string {
  const h = crypto.createHash('sha1');
  const walk = (p: string) => {
    let st: fs.Stats;
    try {
      st = fs.statSync(p);
    } catch {
      return;
    }
    if (st.isDirectory()) {
      for (const e of fs.readdirSync(p).sort()) {
        if (e === '.DS_Store' || e === 'node_modules') continue;
        walk(path.join(p, e));
      }
    } else {
      h.update(`${path.relative(REPO, p)}:${st.mtimeMs}:${st.size}\n`);
    }
  };
  for (const r of roots) walk(r);
  for (const e of extra) h.update(e);
  return h.digest('hex').slice(0, 16);
}

export const sha1 = (s: string | Buffer) => crypto.createHash('sha1').update(s).digest('hex');

// ---------- time formatting ----------

export const fmtSec = (s: number) => `${s.toFixed(1)} s`;

// 75.25 -> "1:15.3"
export function fmtClock(s: number, decimals = 1): string {
  const neg = s < 0;
  s = Math.abs(s);
  const m = Math.floor(s / 60);
  const rest = s - m * 60;
  const sec = rest.toFixed(decimals).padStart(decimals ? decimals + 3 : 2, '0');
  return `${neg ? '-' : ''}${m}:${sec}`;
}

// YouTube chapter stamp: 0:00 / 1:05 / 1:02:03
export function fmtYouTube(s: number): string {
  const t = Math.floor(s);
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const sec = t % 60;
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}` : `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

// SRT stamp: 00:01:02,345
export function fmtSrt(s: number): string {
  const ms = Math.max(0, Math.round(s * 1000));
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const sec = Math.floor((ms % 60000) / 1000);
  const r = ms % 1000;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')},${String(r).padStart(3, '0')}`;
}

// ---------- terminal ----------

const tty = process.stdout.isTTY && !process.env.NO_COLOR;
const paint = (code: string) => (s: string) => (tty ? `\x1b[${code}m${s}\x1b[0m` : s);
export const c = { red: paint('31'), yellow: paint('33'), green: paint('32'), dim: paint('2'), bold: paint('1'), cyan: paint('36') };

export const log = (...a: unknown[]) => console.log(...a);
