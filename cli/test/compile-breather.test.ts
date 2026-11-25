// chapters.breather: a pause with room tone at each chapter card. It inserts time, so the tests pin
// the one map everything goes through (cli/breather.ts) and that all outputs agree with it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { FIXTURES, aroll, basicYaml, F, w, words, y, errors, warnings } from './fixtures/load.ts';
import { compileEdit } from '../compile.ts';
import { breatherMap, quietPointIn, roomToneIn, shiftTrack, shiftWords } from '../breather.ts';
import { buildSrt, youtubeChapters } from '../captions.ts';

const yaml = (breather: string) => y`
  look: panel
  chapters:
    style: path
    ${breather}
    items:
      - { at: w41, label: "Tip 1", title: "First" }
      - { at: w120, label: "Tip 2", title: "Second" }
  scenes:
    - { kind: stage, at: w0, title: Hello }
    - { kind: stage, at: w60, title: Middle }
    - { kind: app, at: w160, app: _fixture, beats: [ { at: w170, click: toggle } ] }
`;
// the pause is 0.3 s before each card's anchor word
const quiet = (t: number) => t - 0.3;
const tone = () => '_breather/tone-1.00.wav';
const run = (b: string, extra = {}) => compileEdit({ yaml: yaml(b), words, aroll, arollVideo: true, quiet, tone, ...extra });

test('off by default: the same bytes with or without the analysis hooks (and as the golden)', () => {
  const plain = compileEdit({ yaml: yaml(''), words, aroll, arollVideo: true });
  const hooked = run('');
  assert.equal(JSON.stringify(hooked.timeline), JSON.stringify(plain.timeline));
  assert.ok(!('breathers' in plain.timeline!.aroll!) && hooked.words === undefined);
  const gold = compileEdit({ yaml: basicYaml.replace(/^look:.*$/m, ''), words, aroll, arollVideo: true, quiet, tone });
  assert.equal(JSON.stringify({ timeline: gold.timeline }), fs.readFileSync(path.join(FIXTURES, 'golden-panel.timeline.json'), 'utf8'));
});

test('on: one map moves words, length, cuts, cards and scenes together', () => {
  const off = run('').timeline!;
  const r = run('breather: { seconds: 1 }');
  assert.deepEqual(errors(r), []);
  const t = r.timeline!;
  const q = [w('w41').start - 0.3, w('w120').start - 0.3].map((s) => F(s));
  // two breathers of 30 frames, each starting on the pause (the second one already 1 s later)
  assert.deepEqual(t.aroll!.breathers, [{ at: q[0], frames: 30 }, { at: q[1] + 30, frames: 30 }]);
  assert.equal(t.aroll!.tone, '_breather/tone-1.00.wav');
  assert.equal(t.durationInFrames, off.durationInFrames + 60);
  // the card starts on the pause and lasts the breather plus its normal 2 s
  const cards = t.scenes.filter((s) => s.kind === 'chapter');
  assert.deepEqual(cards.map((c) => [c.from, c.duration]), [[q[0], 90], [q[1] + 30, 90]]);
  assert.deepEqual(t.chapters.map((c) => c.frame), cards.map((c) => c.from));
  // words: before the first pause untouched, after it +1 s, after the second +2 s
  const moved = r.words!;
  const d = (id: string) => Math.round((moved.find((x) => x.id === id)!.start - w(id).start) * 1000) / 1000;
  assert.deepEqual([d('w10'), d('w41'), d('w100'), d('w120'), d('w170')], [0, 1, 1, 2, 2]);
  // A-roll cuts (20 s and 41.3 s in the fixture) follow the same map
  assert.deepEqual(t.aroll!.cuts, [F(20 + 1), F(41.3 + 1)].map((f, i) => (aroll.cuts![i] < w('w41').start - 0.3 ? F(aroll.cuts![i]) : f)));
  // a scene and a beat after both breathers sit 2 s later than without
  const app = (tl: typeof t) => tl.scenes.find((s) => s.kind === 'app')!;
  assert.equal(app(t).from, app(off).from + 60);
  // chapters file: the card's first frame
  const lines = youtubeChapters(t).text.trim().split('\n');
  assert.equal(lines[1], `00:${String(Math.floor(q[0] / 30)).padStart(2, '0')} Tip 1: First`);
});

test('no caption cue crosses or runs into a breather', () => {
  const r = run('breather: { seconds: 1 }');
  const t = r.timeline!;
  const breaks = t.aroll!.breathers!.map((b): [number, number] => [b.at / t.fps, (b.at + b.frames) / t.fps]);
  const srt = buildSrt(r.words!, { breaks });
  const sec = (s: string) => {
    const [h, m, rest] = s.split(':');
    return Number(h) * 3600 + Number(m) * 60 + Number(rest.replace(',', '.'));
  };
  const cues = [...srt.matchAll(/(\d\d:\d\d:\d\d,\d{3}) --> (\d\d:\d\d:\d\d,\d{3})/g)].map((m) => [sec(m[1]), sec(m[2])]);
  assert.ok(cues.length > 10);
  for (const [a, b] of cues) for (const [s, e] of breaks) assert.ok(b <= s + 0.001 || a >= e - 0.001, `cue ${a}-${b} touches breather ${s}-${e}`);
  // and no word straddles one
  for (const x of r.words!) for (const [s, e] of breaks) assert.ok(x.end <= s + 0.001 || x.start >= e - 0.001, `${x.id} straddles`);
});

test('breather options are validated; a recording with no clean room tone is an error, never silence', () => {
  assert.ok(errors(run('breather: { seconds: 9 }')).some((e) => /seconds must be a number from 0.3 to 3/.test(e.message)));
  assert.ok(warnings(run('breather: { seconds: 1, loud: true }')).some((d) => /unknown field "loud"/.test(d.message)));
  const noTone = run('breather: { seconds: 1 }', { tone: () => null });
  assert.equal(noTone.timeline, null);
  assert.ok(errors(noTone).some((e) => /no clean room tone/.test(e.message)));
  const click = run('breather: { seconds: 1, click: media/click.wav }').timeline!;
  assert.equal(click.aroll!.click, 'media/click.wav');
  assert.ok(!('click' in run('breather: { seconds: 1, click: none }').timeline!.aroll!));
});

test('the map: out and back agree, words stay whole, the face track holds during the pause', () => {
  const m = breatherMap([2, 5], 1);
  assert.deepEqual([m.out(1), m.out(2), m.out(4.9), m.out(5)], [1, 3, 5.9, 7]);
  assert.deepEqual([m.back(1), m.back(2.5), m.back(3), m.back(6.5), m.back(8)], [1, 2, 2, 5, 6]);
  const ws = shiftWords([{ id: 'a', text: 'a', start: 1.8, end: 2.05 }, { id: 'b', text: 'b', start: 1.95, end: 2.4 }], m);
  assert.deepEqual(ws.map((x) => [x.start, x.end]), [[1.8, 2], [3, 3.4]]);
  const tr = shiftTrack({ fps: 1, x: [0, 1, 2, 3, 4, 5, 6] }, m);
  assert.deepEqual(tr.x, [0, 1, 2, 2, 3, 4, 5, 5, 6]);
});

test('quiet point: the latest real pause before the card; room tone: quiet, steady, transient-free', () => {
  const sr = 48000;
  const sig = new Float32Array(sr); // 1 s: speech, a 0.25 s pause at 0.5-0.75, speech
  for (let i = 0; i < sr; i++) sig[i] = (i / sr > 0.5 && i / sr < 0.75 ? 0.001 : 0.2) * Math.sin(i * 0.05);
  const q = quietPointIn(sig, 10, 10.92);
  assert.ok(q > 10.55 && q < 10.72, String(q));
  // room tone: noise with one loud click in the first half second -> the window must avoid the click
  const st = new Float32Array(sr * 4 * 2);
  let seed = 7;
  for (let i = 0; i < st.length; i++) st[i] = (((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32) * 2 - 1) * 0.004;
  for (let i = 0; i < 400; i++) st[2 * (sr / 4 + i)] = st[2 * (sr / 4 + i) + 1] = 0.5;
  const tone = roomToneIn(st, 1)!;
  assert.equal(tone.length, sr * 2);
  assert.ok(Math.max(...tone.map(Math.abs)) < 0.01);
  assert.equal(roomToneIn(new Float32Array(sr * 4), 1), null); // digital silence is not room tone
});
