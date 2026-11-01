import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AnchorError, WordIndex, resolveAnchor } from '../anchors.ts';
import { w, words } from './fixtures/load.ts';

const idx = new WordIndex(words);
const at = (raw: unknown, windows = [] as { from: number; to: number; label?: string }[]) => resolveAnchor(raw, idx, { mode: 'at', windows, fps: 30 });
const until = (raw: unknown, windows = [] as { from: number; to: number; label?: string }[]) => resolveAnchor(raw, idx, { mode: 'until', windows, fps: 30 });

test('w-ids: at = word start, until = word end, offsets applied', () => {
  assert.equal(at('w58').t, w('w58').start);
  assert.equal(until('w58').t, w('w58').end);
  assert.ok(Math.abs(at('w58 +0.5s').t - (w('w58').start + 0.5)) < 1e-9);
  assert.throws(() => at('w9999'), /w9999 does not exist \(words go w0–w174\)/);
});

test('o: and f: anchors', () => {
  assert.equal(at('o:12.5').t, 12.5);
  assert.equal(at('o:1:02 -1s').t, 61);
  assert.equal(at('f:90').t, 3);
});

test('phrases: case/punctuation-insensitive, multi-word, first word start / last word end', () => {
  const r = at('SHOW panel!');
  assert.equal(r.t, w('w58').start);
  assert.equal(r.first, 58);
  assert.equal(r.last, 59);
  assert.equal(until('show panel').t, w('w59').end);
  // apostrophes: "It's" in the transcript
  assert.equal(at('its important').t, w('w107').start);
  assert.equal(at("it's important").t, w('w107').start);
});

test('phrases: hyphenation-insensitive fallback (subagent vs sub-agent)', () => {
  // transcript: "sub-agents." w106, "subagent." w116, "one-way" w122, "sub-agent," w126
  assert.equal(at('subagents').t, w('w106').start); // joined form finds the hyphenated word
  assert.equal(at('oneway order').t, w('w122').start);
  assert.equal(at('subagent').t, w('w116').start); // exact token match wins
  assert.equal(at('sub agent').t, w('w126').start);
});

test('phrases: #N picks the Nth occurrence', () => {
  assert.equal(at('official tips').t, w('w17').start);
  assert.equal(at('official tips#2').t, w('w26').start);
  assert.equal(at('the main session#2').t, w('w117').start);
  assert.throws(() => at('official tips#3'), /occurs 2× there, 2× in the whole video/);
});

test('phrases: searched inside the window first, then globally with a warning', () => {
  const scene = { from: 8, to: 20, label: 'scene' };
  const r = at('official tips', [scene]);
  assert.equal(r.t, w('w26').start); // the in-scene occurrence, not w17
  assert.equal(r.warning, undefined);
  const g = at('show panel', [scene]);
  assert.equal(g.t, w('w58').start);
  assert.equal(g.outside, true);
  assert.match(g.warning!, /not found in scene \(8\.0–20\.0 s\); using w58 at 26\.4 s/);
});

test('phrases: windows are tried in order (until searches after `at` first)', () => {
  const afterAt = { from: 30, to: 40 };
  const scene = { from: 18, to: 40, label: 'scene' };
  // "the" occurs at w44 (in scene, before 30) and w73 (after 30)
  assert.equal(until('the', [afterAt, scene]).first, 73);
  assert.equal(until('the', [scene]).first, 44);
});

test('not found: message names the scene window and the closest match', () => {
  try {
    at('show the pannel', [{ from: 18, to: 40, label: 'scene' }]);
    assert.fail('should throw');
  } catch (e) {
    assert.ok(e instanceof AnchorError);
    assert.match(e.message, /phrase "show the pannel" not found in scene \(18\.0–40\.0 s\); closest: "show panel" at w58/);
  }
  // closest is outside the scene
  try {
    at('wrap it up', [{ from: 0, to: 20, label: 'scene' }]);
    assert.fail('should throw');
  } catch (e) {
    assert.match((e as Error).message, /"wrap up" at w151 \(68\.1 s, outside\)/);
  }
  assert.throws(() => at('zebra quantum xylophone'), /nothing similar in the transcript/);
});
