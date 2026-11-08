import { test } from 'node:test';
import assert from 'node:assert/strict';
import { F, compile, errors, w, warnings } from './fixtures/load.ts';
import { lint } from '../check.ts';
import type { Element, TalkingScene } from '../../src/types.ts';

type Story = Extract<Element, { type: 'story' }>;
const fr = (id: string) => F(w(id).start); // scene 0 starts at frame 0
const fe = (id: string) => F(w(id).end);
const indent = (s: string, n: number) =>
  s
    .replace(/^\n/, '')
    .split('\n')
    .map((l) => ' '.repeat(n) + l)
    .join('\n');

// A talking scene (w0 .. w40) holding one story; scene 1 starts at w41.
function story(body: string) {
  const yaml = `scenes:\n  - kind: talking\n    at: w0\n    elements:\n      - type: story\n${indent(body, 8)}\n  - kind: talking\n    at: w41\n    elements: [ { type: title, text: Next } ]\n`;
  const r = compile(yaml);
  const s = r.timeline?.scenes[0] as TalkingScene | undefined;
  return { r, el: s?.elements[0] as Story | undefined };
}
const msgs = (r: ReturnType<typeof compile>, level: 'error' | 'warn') => (level === 'error' ? errors(r) : warnings(r)).map((d) => `${d.path}: ${d.message}`);

test('story: actors and beats land on their words', () => {
  const { r, el } = story(`
title: The *taxi*
actors:
  - { id: cab, kind: taxi, x: 300, y: 600, value: 2.5 }
  - { id: you, kind: person, x: 700, y: 600, label: You, at: "brand new" }
  - { id: tag, kind: badge, text: Hi }
  - { id: line, kind: arrow, from: cab, to: you }
beats:
  - { at: "desktop app", move: cab, to: you, offset: [-200, 0], until: "show you" }
  - { at: "official tips", count: cab, to: 48.6, ease: linear }
  - { at: "There are", say: you, text: Hi }
  - { at: "several new", say: you, text: Again }
  - { at: "hidden", connect: you, to: cab, label: Back }
  - { at: "My name", follow: cab, scale: 1.5 }
  - { at: "Claude Club", dim: [cab, you], hold: 1s }
`);
  assert.deepEqual(msgs(r, 'error'), []);
  assert.ok(el);
  assert.equal(el.title, 'The *taxi*');
  const actor = (id: string) => el.actors.find((a) => a.id === id)!;
  assert.equal(actor('you').hidden, true); // its own `at` makes it wait for its word
  assert.equal(actor('cab').hidden, undefined);
  assert.deepEqual([actor('tag').x, actor('tag').y], [700, 520]); // auto layout
  const beat = (d: string, n = 0) => el.beats.filter((b) => b.do === d)[n] as Record<string, unknown>;
  assert.deepEqual(beat('enter'), { do: 'enter', frame: fr('w5'), actor: 'you' });
  assert.deepEqual(beat('move'), { do: 'move', frame: fr('w7'), dur: fe('w15') - fr('w7'), actor: 'cab', to: 'you', offset: [-200, 0] });
  assert.deepEqual(beat('count'), { do: 'count', frame: fr('w17'), dur: 36, actor: 'cab', to: 48.6, ease: 'linear' });
  // a bubble with no until/hold gives way to the next one on the same actor
  assert.equal(beat('say').dur, fr('w21') - fr('w19'));
  assert.equal(beat('say', 1).dur, 75);
  // connect is lowered to a hidden arrow actor that enters on its word
  assert.deepEqual(actor('connect-1'), { id: 'connect-1', kind: 'arrow', x: 0, y: 0, hidden: true, from: 'you', to: 'cab', label: 'Back' });
  assert.deepEqual(beat('enter', 1), { do: 'enter', frame: fr('w30'), actor: 'connect-1' });
  assert.deepEqual(beat('follow'), { do: 'follow', frame: fr('w32'), actor: 'cab', scale: 1.5 });
  assert.deepEqual(beat('dim'), { do: 'dim', frame: fr('w39'), dur: 30, keep: ['cab', 'you'] });
  // beats are sorted and visible to the sheet as item events
  assert.deepEqual(el.beats.map((b) => b.frame), [...el.beats.map((b) => b.frame)].sort((a, b) => a - b));
  assert.ok(r.meta.events.some((e) => e.label === 'story item "move cab"'));
});

test('story: unknown kinds, ids, verbs and anchors are errors with the fix', () => {
  const { r } = story(`
actors:
  - { id: cab, kind: limo, x: 1, y: 1 }
  - { id: you, kind: person, x: 700, y: 600 }
  - { id: you, kind: person }
  - { id: a, kind: arrow, from: you, to: nobody }
beats:
  - { at: "desktop app", move: yuo, to: [1, 2] }
  - { at: "no such phrase here", enter: you }
  - { at: w5, say: you, text: Hi, exit: you }
  - { at: w6, fly: you }
`);
  const e = msgs(r, 'error');
  const has = (re: RegExp) => assert.ok(e.some((m) => re.test(m)), `missing ${re} in\n${e.join('\n')}`);
  has(/^scenes\[0\]\.elements\[0\]\.actors\[0\]\.kind: unknown actor kind "limo"; use one of: icon, person, car, taxi/);
  has(/actors\[2\]\.id: duplicate actor id "you"/);
  has(/actors\[3\]\.to: no actor "nobody"; actors: you, a/);
  has(/beats\[0\]\.move: no actor "yuo" \(did you mean "you"\?\)/);
  has(/beats\[1\]\.at: phrase "no such phrase here" not found/);
  has(/beats\[2\]: one verb per beat, found exit \+ say/);
  has(/beats\[3\]: beat has no verb; use one of: enter, exit, move, say/);
  assert.equal(r.timeline, null);
});

test('story: a beat on an actor that is off stage warns', () => {
  const { r } = story(`
actors:
  - { id: you, kind: person, x: 700, y: 600, at: "official tips" }
beats:
  - { at: "brand new", say: you, text: Hi }
  - { at: "official tips#2", exit: you }
  - { at: "hidden", pulse: you }
`);
  assert.deepEqual(msgs(r, 'error'), []);
  const wn = msgs(r, 'warn').filter((m) => m.includes('off stage'));
  assert.equal(wn.length, 2, wn.join('\n'));
  assert.match(wn[0], /beats\[0\]: say on "you" lands while it is off stage/);
  assert.match(wn[1], /beats\[2\]: pulse on "you" lands while it is off stage/);
});

test('story: a long move counts as visual change for pacing', () => {
  const run = (until: string) => {
    const r = compile(`scenes:
  - kind: stage
    at: w0
    layout: center
    elements:
      - type: story
        actors: [ { id: cab, kind: car, x: 100, y: 500 } ]
        beats: [ { at: w1, move: cab, to: [1200, 500], ${until} } ]
  - { kind: talking, at: w41, elements: [ { type: title, text: Next } ] }
`);
    assert.deepEqual(msgs(r, 'error'), []);
    return lint(r.meta, r.timeline, {}).filter((d) => d.path === 'scenes[0]' && /no visual change/.test(d.message));
  };
  assert.equal(run('until: w40').length, 0);
  assert.equal(run('hold: 1s').length, 1);
});
