import { test } from 'node:test';
import assert from 'node:assert/strict';
import { F, compile, errors, w, warnings, y } from './fixtures/load.ts';
import type { BoardScene, Element, PlugScene, StageScene, TalkingScene } from '../../src/types.ts';

const fr = (id: string) => F(w(id).start); // scene 0 starts at frame 0
const fe = (id: string) => F(w(id).end);
const STAGGER = Math.round(0.15 * 30);

// One talking scene (w0 .. w40) carrying the given elements; scene 1 starts at w41.
function talking(elements: string) {
  const yaml = `scenes:\n  - kind: talking\n    at: w0\n    elements:\n${elements
    .split('\n')
    .map((l) => `      ${l}`)
    .join('\n')}\n  - kind: talking\n    at: w41\n`;
  const r = compile(yaml);
  const s = r.timeline?.scenes[0] as TalkingScene | undefined;
  return { r, s, els: s?.elements ?? [], dur: F(w('w41').start) };
}
const el = <T extends Element['type']>(els: Element[], type: T) => els.find((e) => e.type === type) as Extract<Element, { type: T }>;

test('every element type compiles with item frames on their words', () => {
  const { r, els, dur } = talking(y`
    - { type: title, at: "Claude has just", until: "official tips", text: "Claude *2.0*", sub: by Anthropic, logo: claude, size: xl }
    - type: iconlist
      at: "several new features"
      until: "hidden functionalities"
      items:
        - { text: New features, icon: sparkles, at: "new features" }
        - { text: Official tips, icon: lightbulb, at: "official tips" }
        - { text: Hidden, icon: eye, at: "hidden" }
    - { type: bullets, at: w19, title: Why, items: [One, Two, { text: Three, icon: check }] }
    - { type: chips, at: w19, items: [ { text: Fast, tone: good }, { text: Cheap, tone: bad } ] }
    - type: flow
      at: "Claude has"
      direction: loop
      nodes: [ { text: Main, icon: code }, { text: Sub, icon: bot, at: "brand new" } ]
      arrows: [ { label: Prompt, tone: accent }, { label: Result, at: "desktop app" } ]
    - { type: tree, at: w0, root: { text: Master, icon: crown }, children: [ { text: Sales, at: "today" }, { text: Ads } ] }
    - type: compare
      at: w0
      columns:
        - { title: Old, icon: x, at: "There are", rows: [ { text: Slow, tone: bad, at: "hidden" } ] }
        - { title: New, highlight: true, rows: [ Fast ] }
    - { type: counter, at: w5, value: 20, suffix: "%", label: faster, decimals: 0 }
    - { type: stat, at: w5, items: [ { text: 1M, sub: tokens, at: "new desktop" } ] }
    - { type: keys, at: w9, keys: [Ctrl, Alt, Space], label: Quick chat, press: "show you" }
    - { type: table, at: w0, columns: [Plan, Price], rows: [ { label: Pro, cells: [$20] }, [Max, $100] ], highlight: { column: Price, at: "official" } }
    - type: tweet
      at: w0
      name: Dana
      handle: "@danawrites"
      avatar: media/dana.png
      text: "The new desktop app is out"
      meta: "2h"
      mark: { phrase: desktop, at: "desktop app" }
      sticker: { text: NEW, at: "today" }
      label: { text: Source, at: "going to" }
    - { type: sticker, at: w10, text: Wow, rotate: -4 }
    - { type: image, at: w0, src: media/shot.png, caption: Proof, size: [1600, 900], highlight: { x: 10, y: 20, w: 300, h: 40, at: "Claude Club" } }
    - { type: prompt, at: w12, text: "Audit my files", label: Prompt, cps: 30 }
    - { type: grid, at: w0, count: 20, label: Sessions, lit: [ { index: 3, at: "several" }, 5 ] }
    - { type: quote, at: w0, text: "Keep your context clean", by: Anthropic, mark: { phrase: context clean, at: w20 } }
    - { type: lower, at: "my name is", hold: 3s, title: Samin Yasar, sub: Claude Club }
    - { type: cta, at: w30, text: In the description, sub: free, icon: arrow-down }
  `);
  assert.equal(errors(r).length, 0, JSON.stringify(errors(r), null, 1));
  assert.deepEqual(el(els, 'title'), { type: 'title', frame: fr('w0'), end: fe('w18'), text: 'Claude *2.0*', sub: 'by Anthropic', logo: 'claude', size: 'xl' });

  const il = el(els, 'iconlist');
  assert.deepEqual([il.frame, il.end], [fr('w21'), fe('w31')]);
  // "official tips" is searched from the element's start: the 2nd occurrence (w26), not w17
  assert.deepEqual(il.items.map((i) => [i.text, i.frame, i.icon]), [
    ['New features', fr('w22'), 'sparkles'],
    ['Official tips', fr('w26'), 'lightbulb'],
    ['Hidden', fr('w30'), 'eye'],
  ]);

  const bl = el(els, 'bullets');
  assert.equal(bl.title, 'Why');
  assert.equal(bl.end, dur); // default: until the scene ends
  assert.deepEqual(bl.items.map((i) => i.frame), [fr('w19'), fr('w19') + STAGGER, fr('w19') + 2 * STAGGER]);
  assert.equal(bl.items[2].icon, 'check');

  assert.deepEqual(el(els, 'chips').items.map((i) => i.tone), ['good', 'bad']);

  const fl = el(els, 'flow');
  assert.equal(fl.direction, 'loop');
  assert.deepEqual(fl.nodes.map((n) => n.frame), [fr('w0'), fr('w5')]);
  assert.deepEqual(fl.arrows, [
    { label: 'Prompt', tone: 'accent', frame: fr('w5') }, // default: lands with the node it points to
    { label: 'Result', tone: undefined, frame: fr('w7') },
  ]);

  const tr = el(els, 'tree');
  assert.deepEqual(tr.root, { text: 'Master', frame: fr('w0'), icon: 'crown' });
  assert.deepEqual(tr.children.map((c) => c.frame), [fr('w10'), fr('w0') + 2 * STAGGER]);

  const cp = el(els, 'compare');
  assert.deepEqual(cp.columns.map((c) => [c.title, c.frame, c.highlight]), [
    ['Old', fr('w19'), undefined],
    ['New', fr('w0') + STAGGER, true],
  ]);
  assert.deepEqual(cp.columns[0].rows, [{ text: 'Slow', frame: fr('w30'), tone: 'bad' }]);
  assert.deepEqual(cp.columns[1].rows, [{ text: 'Fast', frame: fr('w0') + STAGGER }]);

  assert.deepEqual(el(els, 'counter'), { type: 'counter', frame: fr('w5'), end: dur, value: 20, prefix: undefined, suffix: '%', label: 'faster', decimals: 0 });
  assert.deepEqual(el(els, 'stat').items, [{ text: '1M', frame: fr('w6'), sub: 'tokens' }]);
  assert.equal(el(els, 'keys').press, fr('w14'));
  const tb = el(els, 'table');
  assert.deepEqual(tb.rows, [
    { label: 'Pro', cells: ['$20'] },
    { label: 'Max', cells: ['$100'] },
  ]);
  assert.deepEqual(tb.highlight, { column: 1, frame: fr('w17') });

  const tw = el(els, 'tweet');
  assert.deepEqual(tw.mark, { phrase: 'desktop', frame: fr('w7') });
  assert.deepEqual(tw.sticker, { text: 'NEW', frame: fr('w10') });
  assert.deepEqual(tw.label, { text: 'Source', frame: fr('w12') });
  assert.equal(tw.avatar, 'media/dana.png');

  assert.equal(el(els, 'sticker').rotate, -4);
  const im = el(els, 'image');
  assert.deepEqual(im.highlight, { x: 10, y: 20, w: 300, h: 40, frame: fr('w39') });
  assert.deepEqual(im.size, [1600, 900]);
  assert.equal(el(els, 'prompt').cps, 30);
  const gr = el(els, 'grid');
  assert.equal(gr.columns, 6);
  assert.deepEqual(gr.lit, [
    { index: 3, frame: fr('w21') },
    { index: 5, frame: fr('w0') + STAGGER },
  ]);
  assert.deepEqual(el(els, 'quote').mark, { phrase: 'context clean', frame: fr('w20') });
  const lw = el(els, 'lower');
  assert.deepEqual([lw.frame, lw.end], [fr('w32'), fr('w32') + 90]);
  assert.equal(el(els, 'cta').icon, 'arrow-down');

  // meta: media, icons, headline texts
  assert.deepEqual(r.meta.media.map((m) => m.src).sort(), ['media/dana.png', 'media/shot.png']);
  assert.ok(r.meta.icons.some((i) => i.name === 'arrow-down' && i.path === 'scenes[0].elements[18].icon'));
  assert.ok(r.meta.texts.some((t) => t.headline && t.text === 'Claude *2.0*'));
});

test('element warnings and errors', () => {
  const { r } = talking(y`
    - type: iconlist
      at: "several new features"
      items: [ { text: Early, at: "Claude has" } ]
    - { type: chips, at: w0, items: [ { text: X, tone: purple } ] }
    - { type: banner, at: w0, text: hi }
    - { type: title, at: w0 }
    - { type: tweet, at: w0, name: a, handle: b, text: "hello", mark: { phrase: goodbye } }
    - { type: table, at: w0, columns: [A], rows: [], highlight: { column: Z } }
  `);
  const e = errors(r).map((d) => `${d.path}: ${d.message}`);
  assert.ok(e.some((m) => m.startsWith('scenes[0].elements[2].type: unknown element type "banner"; use one of: title, iconlist,')), e.join('\n'));
  assert.ok(e.includes('scenes[0].elements[3].text: title needs `text`'));
  assert.ok(e.some((m) => m.startsWith('scenes[0].elements[5].highlight.column: no column named "Z"')));
  const wr = warnings(r).map((d) => `${d.path}: ${d.message}`);
  // "Claude has" is not after the element's start: found earlier in the scene, so it clamps
  assert.ok(wr.some((m) => m.startsWith("scenes[0].elements[0].items[0].at: item lands") && m.includes("clamped to the element's start")), wr.join('\n'));
  assert.ok(wr.some((m) => m.startsWith('scenes[0].elements[1].items[0].tone: unknown tone "purple"')));
  assert.ok(wr.some((m) => m.startsWith('scenes[0].elements[4].mark.phrase: "goodbye" does not appear in the tweet text')));
});

test('stage: title string lands at scene start; object title with at/until/sub; layout default hero-left', () => {
  const r = compile(y`
    scenes:
      - kind: stage
        at: w0
        title: Subagents
      - kind: stage
        at: "There are"
        layout: center
        title: { text: Features, sub: three of them, at: "several", until: "official tips" }
        elements:
          - { type: chips, at: "new features", hold: 2s, items: [A] }
      - kind: talking
        at: w41
  `);
  assert.equal(errors(r).length, 0, JSON.stringify(errors(r)));
  const [a, b] = r.timeline!.scenes as StageScene[];
  assert.equal(a.layout, 'hero-left');
  assert.deepEqual(a.title, { text: 'Subagents', frame: 0, end: a.duration });
  assert.equal(b.layout, 'center');
  const base = F(w('w19').start);
  assert.deepEqual(b.title, { text: 'Features', frame: F(w('w21').start) - base, end: F(w('w27').end) - base, sub: 'three of them' });
  assert.deepEqual([b.elements[0].frame, b.elements[0].end], [F(w('w22').start) - base, F(w('w22').start) - base + 60]);
});

test('plug: media frames, type by extension, scroll window', () => {
  const r = compile(y`
    scenes:
      - kind: talking
        at: w0
      - kind: plug
        at: "My name is"
        media:
          - { src: media/skool-about.png, at: "Samin" }
          - { src: media/skool-wins.png, at: "this is", scroll: [0, 1600], until: "Claude Club" }
          - { src: media/clip.mp4, at: "Club" }
      - kind: talking
        at: w41
  `);
  assert.equal(errors(r).length, 0, JSON.stringify(errors(r)));
  const p = r.timeline!.scenes[1] as PlugScene;
  const base = F(w('w32').start);
  assert.deepEqual(p.media, [
    { frame: 0, src: 'media/skool-about.png', type: 'image' }, // the first page is up when the plug starts
    { frame: F(w('w37').start) - base, src: 'media/skool-wins.png', type: 'image', scroll: { from: 0, to: 1600, start: F(w('w37').start) - base + 9, end: F(w('w40').end) - base } },
    { frame: F(w('w40').start) - base, src: 'media/clip.mp4', type: 'video' },
  ]);
  const bad = compile('scenes:\n  - { kind: plug, at: w0, media: [ { src: a.png }, { src: b.png } ] }\n');
  assert.ok(errors(bad).some((d) => d.path === 'scenes[0].media[1].at'));
});

test('board: node frames, auto layout, elements, line flag', () => {
  const r = compile(y`
    scenes:
      - kind: board
        at: w0
        line: true
        nodes:
          - { at: "a master", element: { type: tree, root: { text: Master session }, children: [ { text: Sales page, at: "today" } ] } }
          - { at: "brand new", element: { type: tweet, name: A, handle: "@a", text: hi } }
      - kind: talking
        at: w41
  `);
  assert.ok(warnings(r).some((d) => d.path === 'scenes[0].nodes[0].at' && /not found in scene/.test(d.message)) || errors(r).some((d) => d.path === 'scenes[0].nodes[0].at'));
  const ok = compile(y`
    scenes:
      - kind: board
        at: w0
        line: true
        nodes:
          - { at: w0, element: { type: tree, root: { text: Master session }, children: [ { text: Sales page, at: "today" } ] } }
          - { at: "brand new", element: { type: sticker, text: hi } }
      - kind: talking
        at: w41
  `);
  assert.equal(errors(ok).length, 0, JSON.stringify(errors(ok)));
  const b = ok.timeline!.scenes[0] as BoardScene;
  assert.equal(b.line, true);
  assert.deepEqual(b.nodes.map((n) => [n.id, n.frame, n.x, n.scale]), [
    ['n0', F(w('w0').start), 0, 1],
    ['n1', F(w('w5').start), 1500, 1],
  ]);
  assert.equal(b.nodes[1].element.frame, F(w('w5').start));
  assert.equal((b.nodes[0].element as Extract<Element, { type: 'tree' }>).children[0].frame, F(w('w10').start));
  assert.deepEqual(
    ok.timeline!.webcam.map((k) => k.mode),
    ['hidden', 'full'],
  );
});
