// screenplay init <work> --camera <video> [--mic <audio>] [--words <json>] [--offset <sec>]
// screenplay init <work> --borumi <bundle.bmprojbundle> [--scene N] [--words <json>]
import fs from 'node:fs';
import path from 'node:path';
import type { SourceInfo, Word } from './types.ts';
import { writeSnappedWords } from './media.ts';
import { expandHome, flagNum, flagStr, log, parseArgs, probe, readJson, run, tmpDir, UsageError, which, workDir, writeJson } from './util.ts';
import { normaliseWords } from './words.ts';

const USAGE = 'screenplay init <work> --camera <video> [--mic <audio>] [--words <json>] [--offset <sec>]  |  --borumi <bundle> [--scene N]';

type CutroomSource = {
  media: { id: string; path: string; width: number; height: number; fps: number; duration_ms: number }[];
  clips: { track: string; media: string; start_ms: number; dur_ms: number; media_in_ms: number; take: number }[];
  words: { text: string; start_ms: number; end_ms: number }[];
  scenes: { name: string; start_ms: number; end_ms: number }[];
};

/** Reads a Borumi bundle through `cutroom ingest borumi` (read-only on the bundle) → camera, mic, offset, words. */
export async function fromBorumi(bundle: string, scene: string | undefined): Promise<{ camera: string; mic?: string; micOffset: number; words: Word[]; origin: string }> {
  const cutroom = which('cutroom');
  if (!cutroom) throw new UsageError('--borumi needs the `cutroom` CLI on PATH');
  if (!fs.existsSync(bundle)) throw new UsageError(`Borumi bundle not found: ${bundle}`);
  const out = path.join(tmpDir('screenplay-borumi-'), 'ingest');
  await run(cutroom, ['ingest', 'borumi', bundle, out, ...(scene ? ['--scenes', scene] : [])]);
  const s = readJson<CutroomSource>(path.join(out, 'source.json'));
  const cams = s.clips.filter((c) => c.track === 'camera');
  if (cams.length !== 1) {
    const list = s.scenes.map((sc, k) => `  --scene ${k + 1}: ${sc.name} (${((sc.end_ms - sc.start_ms) / 1000).toFixed(1)} s)`).join('\n');
    throw new UsageError(cams.length ? `the bundle has ${cams.length} camera takes; pick one scene:\n${list}` : 'no camera clip found in the Borumi project');
  }
  const cam = cams[0];
  const mediaPath = (id: string) => {
    const m = s.media.find((x) => x.id === id);
    if (!m) throw new Error(`cutroom output references unknown media ${id}`);
    return m.path;
  };
  const camZero = cam.start_ms - cam.media_in_ms; // timeline ms of camera time 0
  const mic = s.clips.find((c) => c.track === 'mic' && c.take === cam.take) ?? s.clips.find((c) => c.track === 'mic' && c.start_ms < cam.start_ms + cam.dur_ms && c.start_ms + c.dur_ms > cam.start_ms);
  const micOffset = mic ? (mic.start_ms - mic.media_in_ms - camZero) / 1000 : 0;
  const camEnd = cam.media_in_ms + cam.dur_ms;
  const words = normaliseWords(
    s.words
      .map((w) => ({ text: w.text, start: (w.start_ms - camZero) / 1000, end: (w.end_ms - camZero) / 1000 }))
      .filter((w) => w.start >= cam.media_in_ms / 1000 - 0.05 && w.start < camEnd / 1000),
  );
  return { camera: mediaPath(cam.media), mic: mic ? mediaPath(mic.media) : undefined, micOffset: Math.round(micOffset * 10000) / 10000, words, origin: `${bundle}${scene ? ` (scene ${scene})` : ''}` };
}

export async function init(argv: string[]): Promise<void> {
  const args = parseArgs(argv);
  // Also accept `init <camera> <work>` (positional camera first).
  const [p0, p1] = args.positional;
  let camera = flagStr(args, 'camera');
  if (!camera && p1 !== undefined && fs.existsSync(expandHome(p0)) && fs.statSync(expandHome(p0)).isFile()) {
    camera = p0;
    args.positional = [p1, ...args.positional.slice(2)];
  }
  const work = workDir(args, USAGE);
  let mic = flagStr(args, 'mic');
  let micOffset = flagNum(args, 'offset', 0);
  let words: Word[] | null = null;
  let origin: string | undefined;

  const borumi = flagStr(args, 'borumi');
  if (borumi) {
    const b = await fromBorumi(path.resolve(expandHome(borumi)), flagStr(args, 'scene'));
    camera ??= b.camera;
    if (!mic && b.mic) {
      mic = b.mic;
      if (args.flags.offset === undefined) micOffset = b.micOffset;
    }
    words = b.words;
    origin = b.origin;
    log(`borumi: camera ${path.basename(b.camera)}${b.mic ? `, mic ${path.basename(b.mic)} (offset ${b.micOffset.toFixed(3)} s)` : ''}, ${b.words.length} words`);
  }
  if (!camera) throw new UsageError(`usage: ${USAGE}`);
  camera = path.resolve(expandHome(camera));
  if (mic) mic = path.resolve(expandHome(mic));

  const cam = await probe(camera);
  if (!cam.video) throw new UsageError(`${camera} has no video stream`);
  if (mic) {
    const m = await probe(mic);
    if (!m.audio) throw new UsageError(`${mic} has no audio stream`);
  } else if (!cam.audio) throw new UsageError(`${camera} has no audio track: pass --mic <audio>`);

  const src: SourceInfo = {
    camera,
    ...(mic ? { mic } : {}),
    fps: cam.video.fps,
    width: cam.video.width,
    height: cam.video.height,
    duration: Math.round(cam.duration * 1000) / 1000,
    micOffset,
    cameraHasAudio: Boolean(cam.audio),
    ...(cam.audio ? { cameraAudioOffset: Math.round((cam.audio.start - cam.video.start) * 10000) / 10000 } : {}),
    ...(origin ? { origin } : {}),
  };

  fs.mkdirSync(work, { recursive: true });
  const prev = path.join(work, 'source.json');
  const changed = fs.existsSync(prev) && readJson<SourceInfo>(prev).camera !== camera;
  writeJson(prev, src);

  const wordsFile = flagStr(args, 'words');
  if (wordsFile) words = normaliseWords(readJson<unknown>(path.resolve(expandHome(wordsFile))));
  if (words) {
    await writeSnappedWords(work, src, words);
    log(`wrote words.json (${words.length} words, times pinned to the audio)`);
  } else if (changed && fs.existsSync(path.join(work, 'words.json'))) {
    log('warning: the camera changed but words.json is from the old one: run `screenplay transcribe --force`');
  }
  log(`wrote ${prev}: ${src.width}x${src.height} @ ${src.fps} fps, ${src.duration.toFixed(1)} s${mic ? `, mic offset ${micOffset.toFixed(3)} s` : ''}`);
}
