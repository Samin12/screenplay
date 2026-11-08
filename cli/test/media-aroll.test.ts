import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { audioGraph } from '../media/aroll.ts';

describe('audioGraph', () => {
  const segs = [
    { srcStart: 0, srcEnd: 1, outStart: 0 },
    { srcStart: 2, srcEnd: 3, outStart: 1 },
    { srcStart: 5, srcEnd: 6.5, outStart: 2 },
  ];
  it('gives every inner edge a handle of half its crossfade and keeps the total length', () => {
    const g = audioGraph(segs, [0.06, 0.03], -16);
    assert.match(g, /\[s0\]atrim=start_sample=0:end_sample=49440,/); // 1 s + 30 ms handle
    assert.match(g, /\[s1\]atrim=start_sample=94560:end_sample=144720,/); // 2 s - 30 ms .. 3 s + 15 ms
    assert.match(g, /\[s2\]atrim=start_sample=239280:end_sample=312000,/); // 5 s - 15 ms .. 6.5 s
    assert.match(g, /\[c0\]\[c1\]acrossfade=ns=2880:c1=qsin:c2=qsin\[x1\]/);
    assert.match(g, /\[x1\]\[c2\]acrossfade=ns=1440:c1=qsin:c2=qsin\[x2\]/);
    // sum of trimmed lengths minus the overlaps == sum of segment lengths
    const lens = [...g.matchAll(/start_sample=(\d+):end_sample=(\d+)/g)].map((m) => Number(m[2]) - Number(m[1]));
    assert.equal(lens.reduce((a, b) => a + b, 0) - 2880 - 1440, 3.5 * 48000);
  });
  it('a single segment has no crossfade', () => {
    const g = audioGraph([segs[0]], [], -16);
    assert.doesNotMatch(g, /acrossfade/);
    assert.match(g, /\[c0\]asplit=2\[out\]\[m\]/);
  });
});
