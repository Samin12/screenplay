// ffmpeg plumbing: camera-time aligned audio, analysis envelope, filter scripts.
import fs from 'node:fs';
import path from 'node:path';
import { computeEnvelope, readWav, snapWords, speechIslands } from './audio.ts';
import type { Envelope, SourceInfo, Word } from './types.ts';
import { log, run, tool, writeWordsJson } from './util.ts';

/** Cache/build folder for the media pipeline inside the work dir. */
export function mediaDir(work: string): string {
  const d = path.join(work, '.screenplay', 'media');
  fs.mkdirSync(d, { recursive: true });
  return d;
}

let ffmpegMajor: number | null = null;

async function ffmpegVersion(): Promise<number> {
  if (ffmpegMajor === null) {
    const r = await run(tool('ffmpeg'), ['-hide_banner', '-version'], { allowFail: true });
    const m = /ffmpeg version n?(\d+)/.exec(r.stdout);
    ffmpegMajor = m ? Number(m[1]) : 7;
  }
  return ffmpegMajor;
}

/** Arguments that read a filter_complex graph from a file (the syntax changed in ffmpeg 7). */
export async function filterScriptArgs(file: string): Promise<string[]> {
  return (await ffmpegVersion()) >= 7 ? ['-/filter_complex', file] : ['-filter_complex_script', file];
}

export async function ffmpeg(args: string[], label: string): Promise<string> {
  const t0 = Date.now();
  const r = await run(tool('ffmpeg'), ['-hide_banner', '-nostdin', '-y', ...args]);
  log(`  ${label} (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
  return r.stderr;
}

/** Where the speech comes from and how it lines up with the camera (camera time = audio time + offset). */
export function audioSource(src: SourceInfo): { file: string; offset: number } {
  if (src.mic) return { file: src.mic, offset: src.micOffset ?? 0 };
  if (src.cameraHasAudio === false) throw new Error('the camera has no audio track and no --mic was given');
  return { file: src.camera, offset: src.cameraAudioOffset ?? 0 };
}

/** Audio filter that shifts a stream into camera time and pads/trims it to the camera duration. */
export function alignFilter(offset: number, duration: number): string {
  const parts = ['asetpts=PTS-STARTPTS'];
  if (offset > 0.0005) parts.push(`adelay=delays=${Math.round(offset * 1000)}:all=1`);
  else if (offset < -0.0005) parts.push(`atrim=start=${(-offset).toFixed(4)}`, 'asetpts=PTS-STARTPTS');
  parts.push(`apad=whole_dur=${duration.toFixed(4)}`, `atrim=end=${duration.toFixed(4)}`);
  return parts.join(',');
}

/**
 * Extracts the speech audio in camera time: a 48 kHz copy for the cut and a 16 kHz mono copy for
 * whisper and the level analysis. Cached; re-extracted when source.json is newer.
 */
export async function ensureAudio(work: string, src: SourceInfo): Promise<{ wav48: string; wav16: string }> {
  const dir = mediaDir(work);
  const wav48 = path.join(dir, 'audio48k.wav');
  const wav16 = path.join(dir, 'audio16k.wav');
  const srcStamp = fs.statSync(path.join(work, 'source.json')).mtimeMs;
  const fresh = (f: string) => fs.existsSync(f) && fs.statSync(f).mtimeMs >= srcStamp;
  if (fresh(wav48) && fresh(wav16)) return { wav48, wav16 };
  const a = audioSource(src);
  const align = alignFilter(a.offset, src.duration);
  await ffmpeg(
    [
      '-i', a.file,
      '-filter_complex', `[0:a:0]aresample=48000,${align},asplit=2[a][b];[b]aresample=16000,aformat=channel_layouts=mono[m]`,
      '-map', '[a]', '-c:a', 'pcm_s16le', wav48,
      '-map', '[m]', '-ac', '1', '-c:a', 'pcm_s16le', wav16,
    ],
    `extracted ${src.mic ? 'mic' : 'camera'} audio${Math.abs(a.offset) > 0.0005 ? ` (offset ${a.offset.toFixed(3)} s)` : ''}`,
  );
  return { wav48, wav16 };
}

export async function loadEnvelope(work: string, src: SourceInfo): Promise<Envelope> {
  const { wav16 } = await ensureAudio(work, src);
  const { samples, sampleRate } = readWav(wav16);
  return computeEnvelope(samples, sampleRate);
}

/**
 * Writes words.json from raw transcript words: keeps the raw list in .screenplay/media/words.raw.json
 * and pins the times to the speech in the audio (done once; `transcribe --resnap` redoes it from raw).
 */
export async function writeSnappedWords(work: string, src: SourceInfo, raw: Word[]): Promise<Word[]> {
  writeWordsJson(path.join(mediaDir(work), 'words.raw.json'), raw);
  const env = await loadEnvelope(work, src);
  const words = snapWords(raw, speechIslands(env));
  writeWordsJson(path.join(work, 'words.json'), words);
  return words;
}
