// Shared shapes of the files in the work directory (see docs/EDIT-YAML.md, "Work directory").

/** work/source.json */
export type SourceInfo = {
  camera: string; // absolute path to the talking-head video
  mic?: string; // absolute path to a separate microphone recording (optional)
  fps: number;
  width: number;
  height: number;
  duration: number; // seconds (camera)
  // Seconds the mic recording starts AFTER the camera (camera time = mic time + micOffset).
  micOffset: number;
  cameraHasAudio?: boolean;
  cameraAudioOffset?: number; // camera's own audio vs its video (camera time = audio time + offset)
  origin?: string; // e.g. the Borumi bundle it came from
};

/** One entry of work/words.json (source time, seconds). */
export type Word = { i: number; text: string; start: number; end: number };

/** One entry of work/words.out.json (output time, seconds). */
export type OutWord = { id: string; text: string; start: number; end: number; src: number };

/** An inclusive source-word range to remove. */
export type CutRange = { from: number; to: number; why: string };

export type CutKind = 'filler' | 'stutter' | 'false-start' | 'retake' | 'noise';

/** A cut proposed by the detector. */
export type Proposal = CutRange & {
  kind: CutKind;
  confident: boolean;
  note?: string; // longer explanation for review.md
};

/** A kept source range and where it lands in the output. */
export type Segment = { srcStart: number; srcEnd: number; outStart: number };

/** work/aroll.json */
export type ArollInfo = {
  duration: number;
  fps: number;
  segments: Segment[];
  cuts: number[]; // output seconds of every join
};

/** Speech/silence analysis of the audio at a fixed hop. */
export type Envelope = {
  hop: number; // seconds per frame
  db: Float32Array; // RMS level per frame, dBFS
  threshold: number; // dB below which a frame counts as silence
};
