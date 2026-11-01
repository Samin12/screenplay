import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { computeEnvelope, quietest, snapWords, speechIslands, transcriptionChunks, uncovered } from '../media/audio.ts';
import type { Island } from '../media/audio.ts';
import type { Envelope, Word } from '../media/types.ts';

const W = (spec: [string, number, number][]): Word[] => spec.map(([text, start, end], i) => ({ i, text, start, end }));

/** 16 kHz noise floor with louder 220 Hz "speech" bursts. */
function signal(duration: number, speech: [number, number][]): Float32Array {
  const sr = 16000;
  const s = new Float32Array(duration * sr);
  let seed = 1;
  for (let k = 0; k < s.length; k++) {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    s[k] = (seed / 2147483648 - 0.5) * 0.0006; // about -70 dBFS
  }
  for (const [a, b] of speech) for (let k = Math.round(a * sr); k < Math.round(b * sr); k++) s[k] += 0.1 * Math.sin((2 * Math.PI * 220 * k) / sr);
  return s;
}

describe('envelope and islands', () => {
  it('finds speech islands and bridges short gaps', () => {
    const env = computeEnvelope(signal(5, [[0.5, 1.0], [1.05, 1.5], [3.0, 3.6]]), 16000);
    assert.ok(env.threshold > -70 && env.threshold < -25);
    const isl = speechIslands(env);
    assert.equal(isl.length, 2);
    assert.ok(Math.abs(isl[0].start - 0.5) < 0.03 && Math.abs(isl[0].end - 1.5) < 0.03);
    assert.ok(Math.abs(isl[1].start - 3.0) < 0.03 && Math.abs(isl[1].end - 3.6) < 0.03);
  });

  it('finds the quietest point between words', () => {
    const db = new Float32Array(300).fill(-30);
    for (let f = 140; f < 150; f++) db[f] = -60;
    const env: Envelope = { hop: 0.01, db, threshold: -55 };
    const t = quietest(env, 1.2, 1.7);
    assert.ok(t >= 1.4 && t <= 1.5, String(t));
  });
});

describe('snapWords', () => {
  const islands: Island[] = [
    { start: 1.0, end: 2.0 },
    { start: 3.0, end: 3.5 },
  ];

  it('pins island edges to the first and last word and keeps whisper times inside', () => {
    const w = snapWords(
      W([
        ['one', 0.8, 1.2],
        ['two', 1.3, 1.6],
        ['three', 1.6, 2.3],
      ]),
      islands,
    );
    assert.equal(w[0].start, 1.0);
    assert.equal(w[1].start, 1.3);
    assert.equal(w[2].end, 2.0);
  });

  it('moves a word stranded in silence to the nearest island', () => {
    const w = snapWords(
      W([
        ['a', 1.1, 1.9],
        ['the', 2.4, 2.6], // in the silence, closer to island 1
        ['end.', 3.1, 3.4],
      ]),
      islands,
    );
    assert.ok(w[1].end <= 2.0 && w[1].start >= 1.0);
  });

  it('prefers splitting islands where the transcript has punctuation', () => {
    const w = snapWords(
      W([
        ['So,', 1.0, 1.3],
        ['what-', 1.4, 1.95],
        ['any', 2.02, 2.95], // whisper put it next to island 1, but "what-" ends the phrase
        ['software', 3.05, 3.5],
      ]),
      islands,
    );
    assert.ok(w[2].start >= 3.0, `any starts at ${w[2].start}`);
  });

  it('keeps order and never overlaps', () => {
    const w = snapWords(
      W([
        ['a', 0.0, 0.1],
        ['b', 0.1, 0.2],
        ['c', 5.0, 5.2],
      ]),
      islands,
    );
    for (let k = 1; k < w.length; k++) assert.ok(w[k].start >= w[k - 1].end - 1e-9);
  });
});

describe('transcription chunks', () => {
  it('splits at pauses and caps chunk length', () => {
    const isl: Island[] = Array.from({ length: 10 }, (_, k) => ({ start: k * 1.2, end: k * 1.2 + 1 }));
    const c = transcriptionChunks(isl, 0.15, 2, 4);
    assert.ok(c.length >= 3);
    for (const x of c) assert.ok(x.end - x.start <= 4 + 1e-9);
  });

  it('lists speech islands no word landed on', () => {
    const isl: Island[] = [
      { start: 0, end: 1 },
      { start: 2, end: 2.5 },
      { start: 3, end: 3.1 }, // too short to matter
    ];
    assert.deepEqual(uncovered(isl, [{ start: 0.1, end: 0.9 }]), [{ start: 2, end: 2.5 }]);
  });
});
