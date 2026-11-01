import { test } from 'node:test';
import assert from 'node:assert/strict';
import { F, basicYaml, compile, errors, w, warnings, y } from './fixtures/load.ts';
import type { Scene, StageScene } from '../../src/types.ts';

const total = F(78.92); // aroll.json duration

test('basic edit: scene windows, chapter cards, pushing and continuation', () => {
  const r = compile(basicYaml);
  assert.equal(errors(r).length, 0, JSON.stringify(errors(r)));
  const t = r.timeline!;
  assert.equal(t.fps, 30);
  assert.equal(t.durationInFrames, total);
  const card = F(3.4);
  const ch0 = F(w('w102').start); // "the big one"
  const ch1 = F(w('w157').start); // "keep all of your chats tidy"
  assert.deepEqual(
    t.scenes.map((s) => [s.id, s.kind, s.from, s.duration]),
    [
      ['s0', 'talking', 0, F(w('w41').start)],
      ['s1', 'app', F(w('w41').start), ch0 - F(w('w41').start)],
      ['ch0', 'chapter', ch0, card],
      // scenes[2] starts inside chapter card 0 ("It's important" at 47.6 s) -> pushed to the card's end
      ['s2', 'stage', ch0 + card, F(w('w134').start) - (ch0 + card)],
      ['s3', 'talking', F(w('w134').start), F(w('w150').start) - F(w('w134').start)],
      ['s4', 'stage', F(w('w150').start), ch1 - F(w('w150').start)],
      ['ch1', 'chapter', ch1, card],
      // scenes[4] spans chapter card 1 -> it continues after the card as s4.2
      ['s4.2', 'stage', ch1 + card, total - (ch1 + card)],
    ],
  );
  // contiguous coverage of the whole video
  t.scenes.forEach((s, i) => {
    const prev = t.scenes[i - 1];
    assert.equal(s.from, prev ? prev.from + prev.duration : 0, `gap before ${s.id}`);
  });
  const last = t.scenes[t.scenes.length - 1];
  assert.equal(last.from + last.duration, t.durationInFrames);

  assert.deepEqual(t.chapters, [
    { index: 0, title: 'Sub-agents', icon: 'bot', frame: ch0 },
    { index: 1, title: 'Sections', icon: 'folder', frame: ch1 },
  ]);
  assert.deepEqual(t.chapterGrid, { heading: '2 Features', logo: true });
  const chap = t.scenes.filter((s): s is Extract<Scene, { kind: 'chapter' }> => s.kind === 'chapter');
  assert.deepEqual(chap.map((c) => c.index), [0, 1]);

  // anchors of the pushed scene that fall under the card clamp to its start, with a warning
  const s2 = t.scenes.find((s) => s.id === 's2') as StageScene;
  assert.equal(s2.title!.frame, 0);
  assert.ok(warnings(r).some((d) => d.path === 'scenes[2].title.at' && /pushed to 48\.6 s by chapter card 0\); clamped to the scene start/.test(d.message)));

  // the continuation keeps the scene's content, shifted; items said under the card land at 0
  const cont = t.scenes.find((s) => s.id === 's4.2') as StageScene;
  assert.equal(cont.title!.text, 'Sections');
  assert.equal(cont.elements.length, 1);
  const bullets = cont.elements[0] as Extract<StageScene['elements'][number], { type: 'bullets' }>;
  assert.equal(bullets.frame, 0);
  assert.equal(bullets.items[0].frame, 0);
  assert.equal(bullets.items[1].frame, F(w('w173').start) - (ch1 + card));
  // the part before the card has no elements (bullets start under the card)
  assert.equal((t.scenes.find((s) => s.id === 's4') as StageScene).elements.length, 0);
});

test('transitions: first cut, blur by default, chapter cards cut in and the next scene cuts', () => {
  const t = compile(basicYaml).timeline!;
  assert.deepEqual(
    t.scenes.map((s) => `${s.id}:${s.transitionIn}>${s.transitionOut}`),
    ['s0:cut>blur', 's1:blur>cut', 'ch0:cut>cut', 's2:cut>blur', 's3:blur>blur', 's4:blur>cut', 'ch1:cut>cut', 's4.2:cut>cut'],
  );
});

test('webcam track: kind defaults, hidden on chapter cards, one key per change', () => {
  const t = compile(basicYaml).timeline!;
  const from = (id: string) => t.scenes.find((s) => s.id === id)!.from;
  assert.deepEqual(t.webcam, [
    { frame: 0, mode: 'full' },
    // Between visible modes the tile morphs with the 0.33 s dissolve, so the key leads the scene.
    { frame: from('s1') - 10, mode: 'pip' },
    { frame: from('ch0'), mode: 'hidden' },
    { frame: from('s2'), mode: 'hero' }, // out of a chapter card (hidden): no lead
    { frame: from('s3') - 10, mode: 'full' },
    { frame: from('s4') - 10, mode: 'pip' }, // stage layout center
    { frame: from('ch1'), mode: 'hidden' },
    { frame: from('s4.2'), mode: 'pip' },
  ]);
});

test('plug scenes flash in and out; board hides the webcam; overrides win', () => {
  const r = compile(y`
    scenes:
      - kind: talking
        at: w0
      - kind: plug
        at: "My name is"
        media: [ { src: media/a.png, at: "My name is" } ]
      - kind: talking
        at: "When you open"
        webcam: pip-square
      - kind: board
        at: "Click show panel"
        nodes: [ { at: "Click show panel", element: { type: sticker, text: Hi } } ]
      - kind: stage
        at: "The rail holds"
        transition: fade
        webcam: hidden
        title: Rail
      - kind: talking
        at: "Inside it"
  `);
  assert.equal(errors(r).length, 0, JSON.stringify(errors(r)));
  const t = r.timeline!;
  assert.deepEqual(
    t.scenes.map((s) => `${s.kind}:${s.transitionIn}>${s.transitionOut}`),
    ['talking:cut>flash', 'plug:flash>flash', 'talking:flash>blur', 'board:blur>fade', 'stage:fade>blur', 'talking:blur>cut'],
  );
  assert.deepEqual(
    t.webcam.map((k) => k.mode),
    ['full', 'plug', 'pip-square', 'hidden', 'full'], // board hidden, stage override hidden (merged), then full
  );
});

test('the first scene always starts at 0:00 and cuts in', () => {
  const r = compile(y`
    scenes:
      - kind: talking
        at: "There are several"
        transition: blur
      - kind: talking
        at: "My name is"
  `);
  const t = r.timeline!;
  assert.equal(t.scenes[0].from, 0);
  assert.equal(t.scenes[0].transitionIn, 'cut');
  assert.ok(warnings(r).some((d) => /first scene starts at 8\.4 s; it is extended back to 0:00/.test(d.message)));
});

test('scene `at` is searched from the previous scene onward; out-of-order scenes are errors', () => {
  // "official tips" occurs at w17 and w26; the second scene starts after w19, so it must pick w26
  const r = compile(y`
    scenes:
      - kind: talking
        at: w0
      - kind: talking
        at: "There are"
      - kind: talking
        at: "official tips"
  `);
  assert.equal(r.timeline!.scenes[2].from, F(w('w26').start));
  const bad = compile(y`
    scenes:
      - kind: talking
        at: w0
      - kind: talking
        at: "My name is"
      - kind: talking
        at: w20
  `);
  assert.equal(bad.timeline, null);
  assert.match(errors(bad)[0].message, /starts at 8\.8 s, not after scenes\[1\] \(15\.1 s\); scenes must be in time order/);
  assert.equal(errors(bad)[0].path, 'scenes[2].at');
});

test('chapter cards: overlapping cards are pushed, swallowed scenes are dropped with a warning', () => {
  const r = compile(y`
    chapters:
      items:
        - { at: "My name is", title: One, icon: bot }
        - { at: "Claude Club", title: Two, icon: folder }
    scenes:
      - kind: talking
        at: w0
      - kind: talking
        at: "name is Samin"
      - kind: stage
        at: "and this is"
        title: X
      - kind: talking
        at: "Click show panel"
  `);
  assert.equal(errors(r).length, 0, JSON.stringify(errors(r)));
  const t = r.timeline!;
  const c0 = F(w('w32').start);
  assert.deepEqual(
    t.chapters.map((c) => c.frame),
    [c0, c0 + F(3.4)],
  );
  assert.ok(warnings(r).some((d) => d.path === 'chapters.items[1].at' && /inside the previous chapter card; pushed to its end/.test(d.message)));
  // scenes[1] and scenes[2] both start inside card 0 -> scenes[1] never shows
  assert.ok(warnings(r).some((d) => d.path === 'scenes[1].at' && /never shows/.test(d.message)));
  assert.deepEqual(
    t.scenes.map((s) => s.id),
    ['s0', 'ch0', 'ch1', 's2', 's3'],
  );
  assert.equal(t.scenes[3].from, c0 + 2 * F(3.4));
  assert.equal(t.chapterGrid.heading, '2 Features');
});

test('aroll: cuts in frames; missing aroll.mp4 -> aroll null with a warning; fps from aroll.json', () => {
  const yaml = 'scenes:\n  - { kind: talking, at: w0 }\n';
  const ok = compile(yaml);
  assert.deepEqual(ok.timeline!.aroll, { src: 'aroll.mp4', durationInFrames: total, cuts: [600, 1239] });
  const missing = compile(yaml, { arollVideo: false });
  assert.equal(missing.timeline!.aroll, null);
  assert.ok(warnings(missing).some((d) => /aroll\.mp4 not found/.test(d.message)));
  const noJson = compile(yaml, { aroll: null });
  assert.equal(noJson.timeline!.durationInFrames, Math.round((w('w174').end + 0.5) * 30));
  const fps25 = compile(yaml, { aroll: { duration: 10, fps: 25, cuts: [4] } });
  assert.equal(fps25.timeline!.fps, 25);
  assert.equal(fps25.timeline!.durationInFrames, 250);
  assert.deepEqual(fps25.timeline!.aroll!.cuts, [100]);
});

test('top level: theme, camera, chapter grid defaults and validation', () => {
  const r = compile(y`
    theme: clay-light
    camera: { focus: [0.4, 0.3], zoom: 1.2, mirror: true }
    chapters:
      logo: false
      items: [ { at: "the big one", title: Rail, icon: panel-right } ]
    scenes: [ { kind: talking, at: w0 } ]
  `);
  const t = r.timeline!;
  assert.equal(t.theme, 'clay-light');
  assert.deepEqual(t.camera, { focus: [0.4, 0.3], zoom: 1.2, mirror: true });
  assert.deepEqual(t.chapterGrid, { heading: '1 Features', logo: false });
  const bad = compile(y`
    theme: neon
    camera: { focus: [2, 0] }
    scenes: [ { kind: talking, at: w0, webcam: giant, transition: swirl } ]
  `);
  const msgs = errors(bad).map((d) => `${d.path}: ${d.message}`);
  assert.ok(msgs.some((m) => /^theme: unknown theme "neon"/.test(m)));
  assert.ok(msgs.some((m) => /^camera\.focus: focus must be \[x, y\]/.test(m)));
  assert.ok(msgs.some((m) => /^scenes\[0\]\.webcam: unknown webcam mode "giant"/.test(m)));
  assert.ok(msgs.some((m) => /^scenes\[0\]\.transition: unknown transition "swirl"/.test(m)));
});
