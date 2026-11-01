// screenplay aroll <work> [--plan] [--no-verify] [--crf 18] [--preset medium] [--lufs -16]
// Cuts the talking head: removes cut words, compresses every pause, renders aroll.mp4 (1080p30, H.264,
// AAC 48 kHz, -16 LUFS) and writes aroll.json + words.out.json.
import fs from 'node:fs';
import path from 'node:path';
import { allCuts, readCuts } from './cutsfile.ts';
import { computeEnvelope, readWav } from './audio.ts';
import { verifyJoins } from './joins.ts';
import { face } from './face.ts';
import { ensureAudio, ffmpeg, filterScriptArgs, mediaDir } from './media.ts';
import { pickModel, VERBATIM_PROMPT } from './transcribe.ts';
import { buildSegments, cutMask, joins, keptRanges, mapWords, outputDuration } from './ranges.ts';
import type { ArollInfo, OutWord, Segment, SourceInfo, Word } from './types.ts';
import { flagNum, flagStr, loadSource, loadWords, log, parseArgs, probe, which, workDir, writeJson, writeWordsJson } from './util.ts';

const USAGE = 'screenplay aroll <work> [--plan] [--no-verify] [--crf 18] [--preset medium] [--lufs -16]';

export const OUT_FPS = 30;
export const OUT_W = 1920;
export const OUT_H = 1080;
const FADE = 0.008; // seconds of fade at every join (no clicks)

export type Plan = { src: SourceInfo; words: Word[]; removed: boolean[]; segments: Segment[]; outWords: OutWord[]; duration: number; maxGap: number };

/** Everything aroll decides, without rendering. `verify` checks cut points inside continuous speech by ear. */
export async function makePlan(work: string, verify = true): Promise<Plan> {
  const src = loadSource(work);
  const words = loadWords(work);
  const cuts = readCuts(path.join(work, 'cuts.yaml'));
  const { wav16 } = await ensureAudio(work, src);
  const { samples, sampleRate } = readWav(wav16);
  const env = computeEnvelope(samples, sampleRate);
  // words.json is already pinned to the audio (transcribe/init snap it once).
  const removed = cutMask(words.length, allCuts(cuts), cuts.keep);
  let joinsAt: Map<string, number> | undefined;
  if (verify && removed.some(Boolean)) {
    if (!which('whisper-cli')) log('  (whisper-cli not found: tight joins are not checked)');
    else {
      let model: string | null = null;
      try {
        model = pickModel();
      } catch {
        log('  (no whisper model: tight joins are not checked)');
      }
      if (model) joinsAt = await verifyJoins(mediaDir(work), words, removed, env, samples, sampleRate, { model, prompt: VERBATIM_PROMPT });
    }
  }
  // A verified cut point past a kept word means that word really runs up to it (and likewise after a cut).
  const timed = words.map((w) => ({ ...w }));
  for (const [key, t] of joinsAt ?? []) {
    const [x, y] = key.split('|').map(Number);
    if (!removed[x] && removed[y]) timed[x].end = Math.round(Math.max(timed[x].end, t - 0.03) * 1000) / 1000;
    else if (removed[x] && !removed[y]) timed[y].start = Math.round(Math.min(timed[y].start, t + 0.03) * 1000) / 1000;
  }
  const ranges = keptRanges(timed, removed, env, { duration: src.duration, maxGap: cuts.maxGap, joins: joinsAt });
  const segments = buildSegments(ranges, OUT_FPS, 0.06, src.duration);
  if (!segments.length) throw new Error('nothing left to keep: every word is cut');
  const outWords = mapWords(timed, removed, segments);
  return { src, words: timed, removed, segments, outWords, duration: outputDuration(segments, OUT_FPS), maxGap: cuts.maxGap };
}

export function writePlan(work: string, plan: Plan): void {
  const info: ArollInfo = { duration: plan.duration, fps: OUT_FPS, segments: plan.segments, cuts: joins(plan.segments) };
  writeJson(path.join(work, 'aroll.json'), info);
  writeWordsJson(path.join(work, 'words.out.json'), plan.outWords);
}

export function maxWordGap(words: { start: number; end: number }[]): { gap: number; at: number } {
  let gap = 0;
  let at = 0;
  for (let k = 1; k < words.length; k++) {
    const g = words[k].start - words[k - 1].end;
    if (g > gap) {
      gap = g;
      at = k;
    }
  }
  return { gap, at };
}

const frame = (t: number) => Math.round(t * OUT_FPS);

type Loudness = { input_i: string; input_tp: string; input_lra: string; input_thresh: string; target_offset: string };

function parseLoudnorm(stderr: string): Loudness {
  const blocks = stderr.match(/\{[^{}]*"input_i"[^{}]*\}/g);
  if (!blocks) throw new Error('loudnorm measurement missing from ffmpeg output');
  return JSON.parse(blocks[blocks.length - 1]) as Loudness;
}

/** Cut audio (sample-exact, frame-aligned, faded at every join) + loudness measurement in one pass. */
async function renderAudio(work: string, wav48: string, segs: Segment[], lufs: number): Promise<{ file: string; loud: Loudness }> {
  const dir = mediaDir(work);
  const file = path.join(dir, 'aroll-audio.wav');
  const sr = 48000;
  const lines: string[] = [`[0:a]asplit=${segs.length}${segs.map((_, k) => `[s${k}]`).join('')};`];
  segs.forEach((s, k) => {
    const a = Math.round(frame(s.srcStart) * (sr / OUT_FPS));
    const b = Math.round(frame(s.srcEnd) * (sr / OUT_FPS));
    const dur = (b - a) / sr;
    const f = Math.min(FADE, dur / 4);
    lines.push(`[s${k}]atrim=start_sample=${a}:end_sample=${b},asetpts=N/SR/TB,afade=t=in:d=${f.toFixed(4)},afade=t=out:st=${(dur - f).toFixed(5)}:d=${f.toFixed(4)}[c${k}];`);
  });
  lines.push(`${segs.map((_, k) => `[c${k}]`).join('')}concat=n=${segs.length}:v=0:a=1,asplit=2[out][m];`);
  lines.push(`[m]loudnorm=I=${lufs}:TP=-1.5:LRA=11:print_format=json[mm]`);
  const graph = path.join(dir, 'aroll-audio.filter');
  fs.writeFileSync(graph, lines.join('\n'));
  const stderr = await ffmpeg(['-i', wav48, ...(await filterScriptArgs(graph)), '-map', '[out]', '-c:a', 'pcm_s16le', file, '-map', '[mm]', '-f', 'null', '-'], `cut audio: ${segs.length} segments`);
  return { file, loud: parseLoudnorm(stderr) };
}

/**
 * Second loudness pass. loudnorm falls back to dynamic mode when a straight gain would push true peaks past
 * the ceiling (typical for a quiet lav), which lands a few tenths off target; a re-measure and a small
 * linear trim (only if the peaks allow it) brings it back.
 */
async function normaliseAudio(work: string, cutWav: string, loud: Loudness, lufs: number): Promise<{ file: string; lufs: number }> {
  const dir = mediaDir(work);
  const pass2 = path.join(dir, 'aroll-audio-norm.wav');
  const ln = `loudnorm=I=${lufs}:TP=-1.5:LRA=11:measured_I=${loud.input_i}:measured_TP=${loud.input_tp}:measured_LRA=${loud.input_lra}:measured_thresh=${loud.input_thresh}:offset=${loud.target_offset}:linear=true`;
  await ffmpeg(['-i', cutWav, '-af', `${ln},aresample=48000`, '-c:a', 'pcm_f32le', pass2], 'loudness: pass 2');
  const check = parseLoudnorm(await ffmpeg(['-i', pass2, '-af', `loudnorm=I=${lufs}:TP=-1.5:print_format=json`, '-f', 'null', '-'], 'loudness: check'));
  const trim = lufs - Number(check.input_i);
  if (Math.abs(trim) < 0.1 || Number(check.input_tp) + trim > -1.0) return { file: pass2, lufs: Number(check.input_i) };
  const trimmed = path.join(dir, 'aroll-audio-final.wav');
  await ffmpeg(['-i', pass2, '-af', `volume=${trim.toFixed(2)}dB`, '-c:a', 'pcm_f32le', trimmed], `loudness: trim ${trim >= 0 ? '+' : ''}${trim.toFixed(2)} dB`);
  return { file: trimmed, lufs: Number(check.input_i) + trim };
}

async function renderVideo(work: string, plan: Plan, audio: string, crf: number, preset: string): Promise<string> {
  const { src, segments: segs } = plan;
  const dir = mediaDir(work);
  const out = path.join(work, 'aroll.mp4');
  const fit = src.width === OUT_W && src.height === OUT_H ? '' : `,scale=${OUT_W}:${OUT_H}:force_original_aspect_ratio=increase:flags=lanczos,crop=${OUT_W}:${OUT_H}`;
  const lines: string[] = [`[0:v:0]setpts=PTS-STARTPTS,fps=${OUT_FPS}${fit},setsar=1,split=${segs.length}${segs.map((_, k) => `[s${k}]`).join('')};`];
  segs.forEach((s, k) => lines.push(`[s${k}]trim=start_frame=${frame(s.srcStart)}:end_frame=${frame(s.srcEnd)},setpts=PTS-STARTPTS[c${k}];`));
  lines.push(`${segs.map((_, k) => `[c${k}]`).join('')}concat=n=${segs.length}:v=1:a=0,format=yuv420p[v];`);
  lines.push(`[1:a]aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo[a]`);
  const graph = path.join(dir, 'aroll-video.filter');
  fs.writeFileSync(graph, lines.join('\n'));
  await ffmpeg(
    [
      '-i', src.camera,
      '-i', audio,
      ...(await filterScriptArgs(graph)),
      '-map', '[v]', '-map', '[a]',
      '-c:v', 'libx264', '-preset', preset, '-crf', String(crf), '-pix_fmt', 'yuv420p', '-r', String(OUT_FPS),
      '-c:a', 'aac', '-b:a', '192k', '-ar', '48000',
      '-movflags', '+faststart',
      out,
    ],
    `video: ${(plan.duration / 60).toFixed(1)} min, crf ${crf}`,
  );
  return out;
}

export async function aroll(argv: string[]): Promise<void> {
  const args = parseArgs(argv, ['plan', 'no-verify']);
  const work = workDir(args, USAGE);
  const lufs = flagNum(args, 'lufs', -16);
  const plan = await makePlan(work, !args.flags['no-verify']);
  const { src, segments, outWords, duration } = plan;
  const removedWords = plan.removed.filter(Boolean).length;
  const gap = maxWordGap(outWords);
  log(`plan: ${src.duration.toFixed(1)} s → ${duration.toFixed(1)} s, ${segments.length} segments, ${removedWords} words cut, max gap between words ${gap.gap.toFixed(2)} s`);

  if (!args.flags.plan) {
    const { wav48 } = await ensureAudio(work, src);
    const { file, loud } = await renderAudio(work, wav48, segments, lufs);
    const norm = await normaliseAudio(work, file, loud, lufs);
    log(`  loudness ${loud.input_i} → ${norm.lufs.toFixed(1)} LUFS`);
    const out = await renderVideo(work, plan, norm.file, flagNum(args, 'crf', 18), flagStr(args, 'preset') ?? 'medium');
    const p = await probe(out);
    if (Math.abs(p.duration - duration) > 2 / OUT_FPS) log(`warning: aroll.mp4 is ${p.duration.toFixed(3)} s, expected ${duration.toFixed(3)} s`);
    log(`wrote ${out} (${p.duration.toFixed(2)} s)`);
  }
  writePlan(work, plan);
  log(`wrote aroll.json (${segments.length - 1} joins) and words.out.json (${outWords.length} words)`);
  if (!args.flags.plan) {
    // Best effort: without it the tile holds camera.focus. Runs after aroll.json so it can see the cuts.
    await face([work]).catch((e: Error) => log(`  (face tracking skipped: ${e.message}; the tile holds camera.focus)`));
  }
}
