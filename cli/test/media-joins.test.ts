import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { cutSpans, dips, isTight, scoreSplice } from '../media/joins.ts';
import { keptRanges } from '../media/ranges.ts';
import type { Envelope, Word } from '../media/types.ts';

function env(levels: [number, number, number][], duration = 3): Envelope {
  const db = new Float32Array(duration * 100).fill(-70);
  for (const [a, b, v] of levels) for (let f = Math.round(a * 100); f < Math.round(b * 100); f++) db[f] = v;
  return { hop: 0.01, db, threshold: -55 };
}

describe('join checks', () => {
  it('groups removed words into spans with their kept neighbours', () => {
    assert.deepEqual(cutSpans([true, false, true, true, false, true]), [
      { r0: 0, r1: 0, L: null, N: 1 },
      { r0: 2, r1: 3, L: 1, N: 4 },
      { r0: 5, r1: 5, L: 4, N: null },
    ]);
  });

  it('finds dips between syllables', () => {
    const e = env([
      [1.0, 1.4, -30],
      [1.4, 1.45, -50],
      [1.45, 1.9, -28],
    ]);
    const d = dips(e, 1.1, 1.8);
    assert.equal(d.length, 1);
    assert.ok(Math.abs(d[0].t - 1.42) < 0.03 && d[0].depth >= 18);
  });

  it('flags a join with no pause as tight', () => {
    const e = env([[1.0, 2.0, -30]]);
    const a: Word = { i: 0, text: 'keep', start: 1.0, end: 1.5 };
    const b: Word = { i: 1, text: 'drop', start: 1.5, end: 2.0 };
    assert.equal(isTight(a, b, e).tight, true);
    const quiet = env([
      [1.0, 1.45, -30],
      [1.55, 2.0, -30],
    ]);
    assert.equal(isTight(a, b, quiet).tight, false);
  });

  it('scores splices: kept words heard, removed words gone', () => {
    const expected = ['and', 'even', 'people', 'have', 'been'];
    const gone = ['you', 'know'];
    const good = scoreSplice(['and', 'even', 'people', 'have', 'been'], expected, gone, 0.3);
    const clipped = scoreSplice(['and', 'people', 'have', 'been'], expected, gone, 0);
    const leftover = scoreSplice(['and', 'even', 'you', 'know', 'people', 'have', 'been'], expected, gone, 0);
    assert.ok(good > clipped && good > leftover);
  });

  it('a verified join overrides the estimated cut point', () => {
    const words: Word[] = [
      { i: 0, text: 'even,', start: 1.0, end: 1.2 },
      { i: 1, text: 'you', start: 1.2, end: 1.4 },
      { i: 2, text: 'know,', start: 1.4, end: 1.6 },
      { i: 3, text: 'people', start: 1.9, end: 2.2 },
    ];
    const r = keptRanges(words, [false, true, true, false], null, { duration: 3, joins: new Map([['0|1', 1.33]]) });
    assert.equal(r[0].end, 1.33);
  });
});
