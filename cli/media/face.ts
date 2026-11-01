// screenplay face <work>
// Follows the face through aroll.mp4 and writes face.json, so the camera tile stays on the head when
// he leans or turns (what Borumi's face tracking does). The crop holds still for small moves, glides
// for big ones, and may jump only at a jump cut, where the picture jumps anyway. macOS only.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { log, parseArgs, which, workDir, writeJson } from './util.ts';

const USAGE = 'screenplay face <work>';
const SWIFT = path.join(path.dirname(fileURLToPath(import.meta.url)), 'face.swift');

export const TRACK_FPS = 5;
const DEAD_ZONE = 0.03; // of the frame width: smaller moves don't move the crop

export type FaceTrack = { fps: number; x: number[] };

const median = (v: number[]) => [...v].sort((a, b) => a - b)[Math.floor(v.length / 2)];

// Raw per-sample face x (null where no face was found) -> the path the crop should take. Pure.
// `cuts` are in seconds of the cut video; nothing is smoothed across them.
export function smoothTrack(raw: (number | null)[], cuts: number[], fps = TRACK_FPS): number[] {
  if (raw.length === 0) return [];
  const known = raw.filter((v): v is number => v !== null);
  if (known.length === 0) return raw.map(() => 0.5);
  const edges = [0, ...cuts.map((c) => Math.round(c * fps)).filter((i) => i > 0 && i < raw.length), raw.length].sort((a, b) => a - b);
  const out = new Array<number>(raw.length);
  for (let s = 0; s + 1 < edges.length; s++) {
    const [a, b] = [edges[s], edges[s + 1]];
    if (a === b) continue;
    // Fill gaps from the nearest face in this take (else the nearest anywhere).
    const seg = raw.slice(a, b);
    const inTake = seg.filter((v): v is number => v !== null);
    const fallback = inTake.length ? inTake[0] : known[0];
    let last: number | null = null;
    const filled = seg.map((v) => (last = v ?? last));
    let next: number | null = null;
    for (let i = filled.length - 1; i >= 0; i--) filled[i] = next = filled[i] ?? next ?? fallback;
    // A one-second median drops false detections and head bobs.
    const med = filled.map((_, i) => median((filled as number[]).slice(Math.max(0, i - 2), i + 3)));
    // Dead zone: the crop is dragged only once the face leaves it.
    let c = median(med.slice(0, Math.min(med.length, 5)));
    const held = med.map((v) => {
      if (v - c > DEAD_ZONE) c = v - DEAD_ZONE;
      else if (c - v > DEAD_ZONE) c = v + DEAD_ZONE;
      return c;
    });
    // Ease the drags.
    const sigma = 2;
    const kernel = [-4, -3, -2, -1, 0, 1, 2, 3, 4].map((d) => ({ d, w: Math.exp(-(d * d) / (2 * sigma * sigma)) }));
    held.forEach((_, i) => {
      let sum = 0;
      let weight = 0;
      for (const { d, w } of kernel) {
        const j = i + d;
        if (j < 0 || j >= held.length) continue;
        sum += held[j] * w;
        weight += w;
      }
      out[a + i] = Math.round((sum / weight) * 1000) / 1000;
    });
  }
  return out;
}

export async function face(argv: string[]): Promise<void> {
  const args = parseArgs(argv, []);
  const work = workDir(args, USAGE);
  const video = path.join(work, 'aroll.mp4');
  if (!fs.existsSync(video)) throw new Error(`no aroll.mp4 in ${work}; run \`screenplay aroll\` first`);
  if (!which('swift')) throw new Error('face tracking needs swift (Xcode command line tools)');
  const r = spawnSync('swift', [SWIFT, video, String(TRACK_FPS)], { encoding: 'utf8', maxBuffer: 1 << 28 });
  if (r.status !== 0) throw new Error(`face tracking failed: ${r.stderr?.trim() ?? r.error?.message}`);
  const rows = r.stdout.trim().split('\n').map((l) => l.split(' '));
  const raw = rows.map((c) => (c.length >= 2 ? parseFloat(c[1]) : null));
  const found = raw.filter((v) => v !== null).length;
  const arollFile = path.join(work, 'aroll.json');
  const cuts = fs.existsSync(arollFile) ? ((JSON.parse(fs.readFileSync(arollFile, 'utf8')) as { cuts?: number[] }).cuts ?? []) : [];
  const x = smoothTrack(raw, cuts);
  const out: FaceTrack = { fps: TRACK_FPS, x };
  writeJson(path.join(work, 'face.json'), out);
  log(`wrote face.json: face found in ${found}/${raw.length} samples, crop moves between ${Math.min(...x).toFixed(2)} and ${Math.max(...x).toFixed(2)}`);
}
