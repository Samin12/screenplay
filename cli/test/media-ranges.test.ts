import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildSegments, cutMask, joins, keptRanges, mapWords, outputDuration, toOutput } from '../media/ranges.ts';
import type { Envelope, Word } from '../media/types.ts';

const W = (spec: [string, number, number][]): Word[] => spec.map(([text, start, end], i) => ({ i, text, start, end }));

/** Envelope with speech (-25 dB) inside the given spans and room tone (-70 dB) elsewhere. */
function env(duration: number, speech: [number, number][]): Envelope {
  const db = new Float32Array(Math.round(duration * 100)).fill(-70);
  for (const [a, b] of speech) for (let f = Math.round(a * 100); f < Math.round(b * 100); f++) db[f] = -25;
  return { hop: 0.01, db, threshold: -55 };
}

describe('cutMask', () => {
  it('marks inclusive ranges and lets keep win', () => {
    assert.deepEqual(cutMask(6, [{ from: 1, to: 3, why: '' }], [{ from: 2, to: 2, why: '' }]), [false, true, false, true, false, false]);
  });
  it('ignores ranges past the end', () => {
    assert.deepEqual(cutMask(3, [{ from: 2, to: 9, why: '' }]), [false, false, true]);
  });
});

describe('keptRanges', () => {
  const words = W([
    ['one', 1.0, 1.4],
    ['two', 1.5, 1.9], // 0.1 s gap: kept as is
    ['three', 3.0, 3.4], // 1.1 s pause: compressed
    ['um', 3.6, 3.9], // cut
    ['four', 4.2, 4.6],
  ]);
  const removed = [false, false, false, true, false];

  it('pads the run, compresses long pauses to tail + head, and joins around cuts', () => {
    const r = keptRanges(words, removed, null, { duration: 10 });
    assert.equal(r.length, 3);
    assert.deepEqual(r[0], { start: 0.92, end: 1.9 + 0.07 });
    assert.deepEqual(r[1], { start: 3.0 - 0.08, end: 3.4 + 0.07 });
    assert.deepEqual(r[2], { start: 4.2 - 0.08, end: 4.6 + 0.07 });
  });

  it('leaves no silence longer than maxGap between kept words', () => {
    const segs = buildSegments(keptRanges(words, removed, null, { duration: 10 }), 30);
    const out = mapWords(words, removed, segs);
    for (let k = 1; k < out.length; k++) assert.ok(out[k].start - out[k - 1].end < 0.25, `gap before ${out[k].text}`);
  });

  it('keeps an untranscribed stretch of speech inside a long pause', () => {
    const ws = W([
      ['a', 1.0, 1.3],
      ['b', 4.0, 4.3],
    ]);
    const e = env(6, [
      [1.0, 1.3],
      [2.0, 3.0], // 1 s of speech whisper missed
      [4.0, 4.3],
    ]);
    const r = keptRanges(ws, [false, false], e, { duration: 6 });
    assert.equal(r.length, 3);
    assert.ok(r[1].start <= 2.0 && r[1].end >= 3.0);
  });

  it('drops a short unattributed noise inside a long pause', () => {
    const ws = W([
      ['a', 1.0, 1.3],
      ['b', 4.0, 4.3],
    ]);
    const e = env(6, [
      [1.0, 1.3],
      [2.5, 2.7], // a breath / click
      [4.0, 4.3],
    ]);
    const r = keptRanges(ws, [false, false], e, { duration: 6 });
    assert.equal(r.length, 2);
  });

  it('cuts between a kept and a removed word at the quietest moment', () => {
    const ws = W([
      ['keep', 1.0, 1.5],
      ['drop', 1.5, 2.0],
    ]);
    const e = env(3, [
      [1.0, 1.47],
      [1.53, 2.0],
    ]);
    const r = keptRanges(ws, [false, true], e, { duration: 3 });
    assert.equal(r.length, 1);
    assert.ok(r[0].end >= 1.47 && r[0].end <= 1.53, `end ${r[0].end}`);
  });
});

describe('buildSegments', () => {
  it('snaps to whole frames, merges near ranges and lays them end to end', () => {
    const segs = buildSegments(
      [
        { start: 0.01, end: 1.0 },
        { start: 1.02, end: 2.0 }, // closer than 60 ms: merged
        { start: 3.0, end: 3.5 },
      ],
      30,
    );
    assert.equal(segs.length, 2);
    assert.deepEqual(segs[0], { srcStart: 0, srcEnd: 2, outStart: 0 });
    assert.deepEqual(segs[1], { srcStart: 3, srcEnd: 3.5, outStart: 2 });
    for (const s of segs) {
      assert.ok(Math.abs(s.srcStart * 30 - Math.round(s.srcStart * 30)) < 1e-6);
      assert.ok(Math.abs((s.srcEnd - s.srcStart) * 30 - Math.round((s.srcEnd - s.srcStart) * 30)) < 1e-3);
    }
    assert.equal(outputDuration(segs), 2.5);
    assert.deepEqual(joins(segs), [2]);
  });

  it('never runs past the source', () => {
    const segs = buildSegments([{ start: 9.5, end: 10.4 }], 30, 0.06, 10);
    assert.equal(segs[0].srcEnd, 10);
  });

  it('keeps sync: total frames equal the sum of segment frames', () => {
    const ranges = Array.from({ length: 200 }, (_, k) => ({ start: k * 0.913 + 0.011, end: k * 0.913 + 0.6 }));
    const segs = buildSegments(ranges, 30);
    const frames = segs.reduce((n, s) => n + Math.round((s.srcEnd - s.srcStart) * 30), 0);
    assert.equal(Math.round(outputDuration(segs) * 30), frames);
  });
});

describe('word mapping', () => {
  const segs = [
    { srcStart: 1, srcEnd: 2, outStart: 0 },
    { srcStart: 5, srcEnd: 6, outStart: 1 },
  ];
  it('maps source times inside segments', () => {
    assert.equal(toOutput(segs, 1.5, 'start'), 0.5);
    assert.equal(toOutput(segs, 5.25, 'end'), 1.25);
  });
  it('clamps times in removed stretches to the nearest kept edge', () => {
    assert.equal(toOutput(segs, 3, 'start'), 1); // next segment start
    assert.equal(toOutput(segs, 3, 'end'), 1); // previous segment end
    assert.equal(toOutput(segs, 0.5, 'start'), 0);
  });
  it('numbers kept words w0.. and keeps the source index', () => {
    const words = W([
      ['a', 1.1, 1.3],
      ['b', 1.4, 1.9],
      ['c', 5.1, 5.4],
    ]);
    const out = mapWords(words, [false, true, false], segs);
    assert.deepEqual(out, [
      { id: 'w0', text: 'a', start: 0.1, end: 0.3, src: 0 },
      { id: 'w1', text: 'c', start: 1.1, end: 1.4, src: 2 },
    ]);
  });
});
