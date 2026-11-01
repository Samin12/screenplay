// screenplay transcribe <work> [--model <ggml.bin>] [--force] [--resnap] [--whole] [--lang en] [--prompt "..."|--no-prompt]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { computeEnvelope, readWav, speechIslands, transcriptionChunks, uncovered, writeWav } from './audio.ts';
import type { Chunk } from './audio.ts';
import { ensureAudio, mediaDir, writeSnappedWords } from './media.ts';
import { joinWords } from './text.ts';
import type { Word } from './types.ts';
import { expandHome, flagStr, loadSource, log, parseArgs, readJson, run, tool, UsageError, workDir } from './util.ts';
import { parseWhisperJson } from './words.ts';
import type { ParseOptions } from './words.ts';

const USAGE = 'screenplay transcribe <work> [--model <ggml.bin>] [--force] [--resnap] [--whole] [--lang en] [--prompt "..."] [--no-prompt]';

// Whisper drops disfluencies unless the context shows them; this prompt makes it write "um", "uh" and
// cut-off words ("lit-") so the cut step can find them.
export const VERBATIM_PROMPT = 'Um, so, uh, I- I mean, like, you know, we- we were, uh, thinking. Hmm, okay.';

export function pickModel(explicit?: string): string {
  if (explicit) {
    const p = path.resolve(expandHome(explicit));
    if (!fs.existsSync(p)) throw new UsageError(`model not found: ${p}`);
    return p;
  }
  const dir = path.join(os.homedir(), '.cache', 'whisper');
  for (const name of ['ggml-large-v3-turbo.bin', 'ggml-large-v3-turbo-q5_0.bin', 'ggml-small.bin', 'ggml-small.en.bin', 'ggml-base.en.bin']) {
    const p = path.join(dir, name);
    if (fs.existsSync(p)) return p;
  }
  throw new UsageError(`no whisper model in ${dir}: pass --model <ggml.bin>`);
}

/** Merges per-chunk word lists (already in camera time) into one clean, re-numbered list. */
export function mergeChunkWords(lists: Word[][]): Word[] {
  const out: Word[] = [];
  for (const list of lists)
    for (const w of list) {
      const prev = out[out.length - 1];
      if (prev && (w.start < prev.start || w.end <= prev.end)) continue; // overlap at a chunk edge: keep the earlier chunk's word
      const start = prev ? Math.max(w.start, prev.end) : w.start;
      out.push({ i: out.length, text: w.text, start, end: Math.max(start, w.end) });
    }
  return out;
}

/** Writes each [start, end] range (padded) as a clip and runs them all through one whisper process. */
type ClipOptions = { lead: number; tail: number; whisperArgs: string[]; parse: ParseOptions };

/**
 * Writes each [start, end] range as a clip and runs them all through one whisper process. The lead-in is
 * kept short on purpose: whisper anchors a clip's first word near the clip start, so 0.3 s of lead-in
 * silence shifts the words early (and invites it to parrot the prompt).
 */
async function whisperClips(dir: string, prefix: string, ranges: Chunk[], samples: Float32Array, sampleRate: number, duration: number, o: ClipOptions): Promise<Word[][]> {
  fs.mkdirSync(dir, { recursive: true });
  const clips = ranges.map((c, k) => {
    const prevEnd = k > 0 ? ranges[k - 1].end : 0;
    const nextStart = k + 1 < ranges.length ? ranges[k + 1].start : duration;
    const a = Math.round(Math.max(0, c.start - Math.min(o.lead, (c.start - prevEnd) / 2)) * sampleRate);
    const b = Math.round(Math.min(duration, c.end + Math.min(o.tail, (nextStart - c.end) / 2)) * sampleRate);
    const file = path.join(dir, `${prefix}-${String(k).padStart(4, '0')}.wav`);
    writeWav(file, samples, sampleRate, a, b);
    return { file, offset: a / sampleRate };
  });
  if (!clips.length) return [];
  await run(tool('whisper-cli'), [...o.whisperArgs, ...clips.map((c) => c.file)]);
  return clips.map((c) => (fs.existsSync(c.file + '.json') ? parseWhisperJson(readJson(c.file + '.json'), c.offset, o.parse) : []));
}

export async function transcribe(argv: string[]): Promise<void> {
  const args = parseArgs(argv, ['force', 'no-prompt', 'resnap', 'whole']);
  const work = workDir(args, USAGE);
  const src = loadSource(work);
  const out = path.join(work, 'words.json');
  const rawFile = path.join(mediaDir(work), 'words.raw.json');
  if (args.flags.resnap) {
    if (!fs.existsSync(rawFile)) throw new UsageError(`${rawFile} not found: run transcribe --force`);
    const words = await writeSnappedWords(work, src, readJson<Word[]>(rawFile));
    log(`re-snapped words.json from words.raw.json (${words.length} words)`);
    return;
  }
  if (fs.existsSync(out) && !args.flags.force) {
    log(`words.json exists (${readJson<unknown[]>(out).length} words): skipping (use --force to redo)`);
    return;
  }
  const model = pickModel(flagStr(args, 'model'));
  const { wav16 } = await ensureAudio(work, src);
  const prompt = args.flags['no-prompt'] ? undefined : (flagStr(args, 'prompt') ?? VERBATIM_PROMPT);
  const whisperArgs = ['-m', model, '-l', flagStr(args, 'lang') ?? 'en', '-t', String(Math.min(8, Math.max(2, os.availableParallelism?.() ?? 4))), '-ojf', '-np', ...(prompt ? ['--prompt', prompt] : [])];
  const t0 = Date.now();
  let raw: Word[];
  if (args.flags.whole) {
    log(`whisper: ${path.basename(model)} on ${(src.duration / 60).toFixed(1)} min of audio (one pass)...`);
    const base = path.join(mediaDir(work), 'whisper');
    await run(tool('whisper-cli'), [...whisperArgs, '-f', wav16, '-of', base]);
    raw = parseWhisperJson(readJson(base + '.json'), 0, { prompt });
  } else {
    // One clip per stretch of speech (split at pauses), all through a single whisper process.
    const { samples, sampleRate } = readWav(wav16);
    const islands = speechIslands(computeEnvelope(samples, sampleRate));
    const chunks = transcriptionChunks(islands);
    log(`whisper: ${path.basename(model)} on ${chunks.length} speech chunks (${(src.duration / 60).toFixed(1)} min)...`);
    const dir = path.join(mediaDir(work), 'whisper');
    const parse: ParseOptions = { prompt };
    raw = mergeChunkWords(await whisperClips(dir, 'chunk', chunks, samples, sampleRate, src.duration, { lead: 0.1, tail: 0.3, whisperArgs, parse }));
    // Speech whisper skipped (it sometimes stops early inside a clip): transcribe those bits on their own.
    const missed = uncovered(islands, raw);
    if (missed.length) {
      const extra = (await whisperClips(dir, 'gap', missed, samples, sampleRate, src.duration, { lead: 0.15, tail: 0.4, whisperArgs, parse: { ...parse, minSegmentProb: 0.45 } })).flat();
      const added = extra.filter((w) => missed.some((g) => (w.start + w.end) / 2 >= g.start - 0.15 && (w.start + w.end) / 2 <= g.end + 0.15));
      raw = mergeChunkWords([[...raw, ...added].sort((a, b) => a.start - b.start)]);
      log(`  ${missed.length} stretch(es) of speech had no words: re-transcribed, ${added.length} word(s) added`);
    }
  }
  log(`  done (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
  if (!raw.length) throw new Error('whisper returned no words');
  // Pin word times to where the speech actually is.
  const words = await writeSnappedWords(work, src, raw);
  log(`wrote words.json: ${words.length} words. "${joinWords(words.slice(0, 14).map((w) => w.text))}..."`);
}
