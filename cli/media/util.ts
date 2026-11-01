import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { SourceInfo, Word } from './types.ts';

// ---------- argv ----------

export type Args = { positional: string[]; flags: Record<string, string | true> };

/** Parses `a b --key value --flag --k=v`. A flag followed by another flag (or nothing) is boolean. */
export function parseArgs(argv: string[], booleans: string[] = []): Args {
  const positional: string[] = [];
  const flags: Record<string, string | true> = {};
  for (let k = 0; k < argv.length; k++) {
    const a = argv[k];
    if (a.startsWith('--') && a.length > 2) {
      const eq = a.indexOf('=');
      if (eq > 0) {
        flags[a.slice(2, eq)] = a.slice(eq + 1);
        continue;
      }
      const name = a.slice(2);
      const next = argv[k + 1];
      if (booleans.includes(name) || next === undefined || (next.startsWith('--') && next.length > 2)) flags[name] = true;
      else {
        flags[name] = next;
        k++;
      }
    } else positional.push(a);
  }
  return { positional, flags };
}

export function flagStr(args: Args, name: string): string | undefined {
  const v = args.flags[name];
  return typeof v === 'string' ? v : undefined;
}

export function flagNum(args: Args, name: string, fallback: number): number {
  const v = flagStr(args, name);
  if (v === undefined) return fallback;
  const n = Number(v);
  if (!Number.isFinite(n)) throw new UsageError(`--${name} expects a number, got "${v}"`);
  return n;
}

export class UsageError extends Error {}

/** The work dir is the first positional argument. */
export function workDir(args: Args, usage: string): string {
  const w = args.positional[0];
  if (!w) throw new UsageError(`usage: ${usage}`);
  return path.resolve(w);
}

export function expandHome(p: string): string {
  return p.startsWith('~/') ? path.join(os.homedir(), p.slice(2)) : p;
}

// ---------- files ----------

export function readJson<T>(file: string): T {
  return JSON.parse(fs.readFileSync(file, 'utf8')) as T;
}

export function writeJson(file: string, data: unknown, compact = false): void {
  fs.writeFileSync(file, compact ? JSON.stringify(data) + '\n' : JSON.stringify(data, null, 2) + '\n');
}

/** words.json is written one word per line: compact and diff-friendly. */
export function writeWordsJson(file: string, words: object[]): void {
  fs.writeFileSync(file, '[\n' + words.map((w) => '  ' + JSON.stringify(w)).join(',\n') + '\n]\n');
}

export function loadSource(work: string): SourceInfo {
  const f = path.join(work, 'source.json');
  if (!fs.existsSync(f)) throw new UsageError(`${f} not found: run \`screenplay init ${work} --camera <video>\` first`);
  return readJson<SourceInfo>(f);
}

export function loadWords(work: string): Word[] {
  const f = path.join(work, 'words.json');
  if (!fs.existsSync(f)) throw new UsageError(`${f} not found: run \`screenplay transcribe ${work}\` first`);
  return readJson<Word[]>(f);
}

export function tmpDir(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

// ---------- processes ----------

export function which(cmd: string): string | null {
  const r = spawnSync('/usr/bin/which', [cmd], { encoding: 'utf8' });
  if (r.status === 0 && r.stdout.trim()) return r.stdout.trim();
  for (const dir of ['/opt/homebrew/bin', '/usr/local/bin', path.join(os.homedir(), '.cargo/bin')]) {
    const p = path.join(dir, cmd);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

export function tool(cmd: string): string {
  const p = which(cmd);
  if (!p) throw new Error(`\`${cmd}\` not found on PATH`);
  return p;
}

export type RunResult = { code: number; stdout: string; stderr: string };

/** Runs a command, capturing output. Rejects on non-zero exit unless allowFail. */
export function run(cmd: string, args: string[], opts: { allowFail?: boolean; cwd?: string; onStderr?: (s: string) => void } = {}): Promise<RunResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd: opts.cwd, stdio: ['ignore', 'pipe', 'pipe'] });
    const out: Buffer[] = [];
    const err: Buffer[] = [];
    child.stdout.on('data', (d: Buffer) => out.push(d));
    child.stderr.on('data', (d: Buffer) => {
      err.push(d);
      opts.onStderr?.(d.toString('utf8'));
    });
    child.on('error', reject);
    child.on('close', (code) => {
      const r = { code: code ?? -1, stdout: Buffer.concat(out).toString('utf8'), stderr: Buffer.concat(err).toString('utf8') };
      if (r.code !== 0 && !opts.allowFail) {
        const tail = r.stderr.split('\n').filter(Boolean).slice(-15).join('\n');
        reject(new Error(`${path.basename(cmd)} exited with ${r.code}\n${tail}`));
      } else resolve(r);
    });
  });
}

// ---------- ffprobe ----------

export type Probe = {
  duration: number;
  video?: { width: number; height: number; fps: number; rotation: number; start: number };
  audio?: { sampleRate: number; channels: number; start: number };
};

function ratio(s: string | undefined): number {
  if (!s) return 0;
  const [a, b] = s.split('/').map(Number);
  return b ? a / b : a;
}

export async function probe(file: string): Promise<Probe> {
  if (!fs.existsSync(file)) throw new UsageError(`media not found: ${file}`);
  const r = await run(tool('ffprobe'), ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', file]);
  const j = JSON.parse(r.stdout) as {
    streams: { codec_type: string; width?: number; height?: number; avg_frame_rate?: string; r_frame_rate?: string; sample_rate?: string; channels?: number; duration?: string; start_time?: string; tags?: Record<string, string>; side_data_list?: { rotation?: number }[]; disposition?: { attached_pic?: number } }[];
    format: { duration?: string };
  };
  const v = j.streams.find((s) => s.codec_type === 'video' && !s.disposition?.attached_pic);
  const a = j.streams.find((s) => s.codec_type === 'audio');
  const out: Probe = { duration: Number(j.format.duration ?? v?.duration ?? a?.duration ?? 0) };
  if (v) {
    const rot = Number(v.side_data_list?.find((d) => d.rotation !== undefined)?.rotation ?? v.tags?.rotate ?? 0);
    let width = v.width ?? 0;
    let height = v.height ?? 0;
    if (Math.abs(rot) % 180 === 90) [width, height] = [height, width];
    const fps = ratio(v.avg_frame_rate) || ratio(v.r_frame_rate) || 30;
    out.video = { width, height, fps: Math.round(fps * 1000) / 1000, rotation: rot, start: Number(v.start_time ?? 0) || 0 };
  }
  if (a) out.audio = { sampleRate: Number(a.sample_rate ?? 0), channels: a.channels ?? 1, start: Number(a.start_time ?? 0) || 0 };
  return out;
}

// ---------- formatting ----------

export function fmtTime(sec: number): string {
  const s = Math.round(Math.max(0, sec) * 10) / 10;
  const m = Math.floor(s / 60);
  const r = s - m * 60;
  return `${String(m).padStart(2, '0')}:${r.toFixed(1).padStart(4, '0')}`;
}

export function round3(x: number): number {
  return Math.round(x * 1000) / 1000;
}

export function log(msg: string): void {
  process.stderr.write(msg + '\n');
}
