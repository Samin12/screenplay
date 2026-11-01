import { test } from 'node:test';
import assert from 'node:assert/strict';
import { basicYaml, compile, words } from './fixtures/load.ts';
import { buildSrt, wrap, youtubeChapters } from '../captions.ts';
import { fragment, subtract } from '../compile.ts';
import type { AppScene } from '../../src/types.ts';

test('srt: <= 42 chars per line, <= 2 lines, ordered non-overlapping cues', () => {
  const srt = buildSrt(words);
  const cues = srt.trim().split(/\n\n/);
  assert.ok(cues.length > 10);
  let prevEnd = -1;
  cues.forEach((c, i) => {
    const [n, times, ...lines] = c.split('\n');
    assert.equal(n, String(i + 1));
    assert.ok(lines.length >= 1 && lines.length <= 2, c);
    for (const l of lines) assert.ok(l.length <= 42, l);
    const [a, b] = times.split(' --> ').map((t) => {
      const [h, m, s] = t.replace(',', '.').split(':').map(Number);
      return h * 3600 + m * 60 + s;
    });
    assert.ok(b > a);
    assert.ok(a >= prevEnd - 1e-6, `cue ${i + 1} overlaps the previous one`);
    prevEnd = b;
  });
  assert.match(cues[0], /^1\n00:00:00,180 --> /);
  // every word appears exactly once, in order
  const text = cues.map((c) => c.split('\n').slice(2).join(' ')).join(' ');
  assert.equal(text, words.map((w) => w.text).join(' '));
});

test('srt: a range is re-based to 0', () => {
  const srt = buildSrt(words, { from: 18.8, to: 30 });
  assert.match(srt, /^1\n00:00:00,020 --> /);
  assert.ok(!srt.includes('Claude Club'));
});

test('wrap balances two lines', () => {
  assert.deepEqual(wrap('one two three four five six seven eight nine ten eleven', 42), ['one two three four five six', 'seven eight nine ten eleven']);
  assert.deepEqual(wrap('short', 42), ['short']);
});

test('youtube chapters: 00:00 first, one line per chapter card', () => {
  const t = compile(basicYaml).timeline!;
  const { text, warnings } = youtubeChapters(t);
  assert.equal(text, '00:00 Intro\n00:45 Sub-agents\n01:10 Sections\n');
  assert.ok(warnings.some((w) => /Sections" is 8\.\d s long/.test(w)));
  const none = youtubeChapters({ ...t, chapters: [] });
  assert.equal(none.text, '');
});

test('subtract: interval minus chapter windows', () => {
  assert.deepEqual(subtract([0, 100], [[40, 60]]), [
    [0, 40],
    [60, 100],
  ]);
  assert.deepEqual(subtract([0, 100], [[0, 30]]), [[30, 100]]);
  assert.deepEqual(subtract([10, 20], [[0, 30]]), []);
});

test('fragment: a continuation folds earlier state changes and keeps live overlays', () => {
  const scene: AppScene = {
    id: 's1',
    kind: 'app',
    from: 0,
    duration: 300,
    transitionIn: 'cut',
    transitionOut: 'cut',
    plate: { type: 'replica', app: '_fixture', data: {} },
    state: { panel: false },
    camera: { scale: 1 },
    actions: [
      { do: 'click', frame: 10, target: 'toggle', set: { panel: true } },
      { do: 'type', frame: 20, end: 40, key: 'prompt', text: 'hi' },
      { do: 'callout', frame: 90, end: 160, target: 'panel', text: 'x', side: 'right', dim: true },
      { do: 'move', frame: 95, target: 'item-1' },
      { do: 'mark', frame: 200, end: 260, target: 'item-2', style: 'ring' },
    ],
  };
  const cont = fragment(scene, 120, 180, 1) as AppScene;
  assert.deepEqual(cont.state, { panel: true, prompt: 'hi' });
  assert.deepEqual(cont.actions, [
    { do: 'callout', frame: 0, end: 40, target: 'panel', text: 'x', side: 'right', dim: true },
    { do: 'mark', frame: 80, end: 140, target: 'item-2', style: 'ring' },
  ]);
  const head = fragment(scene, 0, 100, 0) as AppScene;
  assert.deepEqual(
    head.actions.map((a) => [a.do, a.frame, 'end' in a ? a.end : null]),
    [
      ['click', 10, null],
      ['type', 20, 40],
      ['callout', 90, 100],
      ['move', 95, null],
    ],
  );
  assert.equal(scene.actions.length, 5, 'input not mutated');
});

test('fragment: a recording plate split by a chapter card keeps playing where it left off', () => {
  const scene = { id: 's1', kind: 'app', from: 0, duration: 300, transitionIn: 'cut', transitionOut: 'cut', plate: { type: 'video', src: 'media/r.mp4', size: [1920, 1080], startFrom: 30, targets: {} }, state: {}, camera: { scale: 1 }, actions: [] } as unknown as AppScene;
  const cont = fragment(scene, 120, 180, 1) as AppScene;
  assert.equal((cont.plate as { startFrom: number }).startFrom, 150);
});
