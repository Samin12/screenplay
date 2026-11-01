import { test } from 'node:test';
import assert from 'node:assert/strict';
import { F, aroll, compile, errors, warnings, w, words, y } from './fixtures/load.ts';
import { compileEdit } from '../compile.ts';
import { smoothTrack } from '../media/face.ts';
import { trackedX } from '../../src/lib/track.ts';
import { PANEL, PANEL_VIEW, TILE } from '../../src/theme/panel.ts';
import type { Element, StageScene } from '../../src/types.ts';

const panel = (body: string) => compile(`look: panel\n${body}`);

const base = y`
  chapters:
    heading: "2 Parts"
    badge: { eyebrow: Parts, intro: "The plan" }
    items:
      - { title: "Done before", icon: code }
      - { at: w41, title: "Second part", badge: "Second part in full", icon: code }
  scenes:
    - kind: stage
      at: w0
      title: Hello
    - kind: app
      at: w60
      app: _fixture
`;

test('the panel look is the default, with the house theme', () => {
  const t = compileEdit({ yaml: 'scenes:\n  - { kind: stage, at: w0, title: Hello }', words, aroll, arollVideo: true }).timeline!;
  assert.equal(t.look, 'panel');
  assert.equal(t.theme, 'velour');
});

test('the reference look is opt-in', () => {
  const ref = compile('look: reference\nscenes:\n  - { kind: stage, at: w0, title: Hi }').timeline!;
  assert.equal(ref.look, 'reference');
  assert.equal(ref.theme, 'ember-dark');
  assert.equal(ref.badges.length, 0);
  assert.ok(errors(compile('look: nope\nscenes:\n  - { kind: stage, at: w0, title: Hi }')).some((e) => /unknown look/.test(e.message)));
});

test('the tile never moves: a chapter card covers it and cuts back to the same layout', () => {
  const t = panel(base).timeline!;
  assert.deepEqual(t.webcam, [{ frame: 0, mode: 'tile' }]);
});

test('only full and hidden move the creator; other modes warn', () => {
  const r = panel(y`
    scenes:
      - { kind: stage, at: w0, title: Hi, webcam: pip-right }
      - { kind: talking, at: w41, webcam: full }
  `);
  assert.deepEqual(r.timeline!.webcam.map((k) => k.mode), ['tile', 'full']);
  assert.ok(warnings(r).some((d) => /webcam: pip-right is ignored/.test(d.message)));
});

test('stage scenes use the whole panel; hero-left warns', () => {
  const r = panel(y`
    scenes:
      - { kind: stage, at: w0, title: A, layout: hero-left }
      - { kind: stage, at: w41, title: B }
  `);
  const stages = r.timeline!.scenes.filter((s): s is StageScene => s.kind === 'stage');
  assert.deepEqual(stages.map((s) => s.layout), ['center', 'center']);
  assert.ok(warnings(r).some((d) => /hero-left needs a big webcam/.test(d.message)));
  assert.equal(warnings(r).filter((d) => /hero stages need/.test(d.message)).length, 0);
});

test('a talking scene with nothing to show warns about the empty panel', () => {
  const r = panel(y`
    scenes:
      - { kind: talking, at: w0 }
  `);
  assert.ok(warnings(r).some((d) => /leaves the panel empty/.test(d.message)));
  const full = panel(y`
    scenes:
      - { kind: talking, at: w0, webcam: full }
  `);
  assert.ok(!warnings(full).some((d) => /leaves the panel empty/.test(d.message)));
});

test('chapter cards last 2 s (house rule), not the reference 3.4 s', () => {
  const card = panel(base).timeline!.scenes.find((s) => s.kind === 'chapter')!;
  assert.equal(card.duration, F(2));
  const ref = compile(base).timeline!.scenes.find((s) => s.kind === 'chapter')!;
  assert.equal(ref.duration, F(3.4));
});

test('plugs dissolve instead of flashing white over the tile', () => {
  const r = panel(y`
    scenes:
      - { kind: stage, at: w0, title: Hi }
      - { kind: plug, at: w41, media: [ { src: media/a.png } ] }
  `);
  assert.deepEqual(r.timeline!.scenes.map((s) => s.transitionIn), ['cut', 'blur']);
});

test('step badge: intro before the first card, one per chapter, earlier parts already filled', () => {
  const t = panel(base).timeline!;
  assert.deepEqual(t.badges, [
    { frame: 0, eyebrow: 'Parts', title: 'The plan', step: 1, total: 2 },
    { frame: F(w('w41').start), eyebrow: 'Parts', title: 'Second part in full', step: 2, total: 2 },
  ]);
});

test('step badge: a plain intro when nothing came before, none without chapters', () => {
  const t = panel(y`
    chapters:
      items:
        - { at: w41, title: "One", icon: code }
    scenes:
      - { kind: stage, at: w0, title: Hi }
  `).timeline!;
  assert.deepEqual(t.badges[0], { frame: 0, eyebrow: 'Intro', title: '1 Features', step: 0, total: 1 });
  assert.deepEqual(panel('scenes:\n  - { kind: stage, at: w0, title: Hi }').timeline!.badges, []);
});

test('proof image: url, crop, one mark per word, probed size', () => {
  const r = panel(y`
    scenes:
      - kind: stage
        at: w0
        elements:
          - type: image
            at: w0
            src: media/proof.png
            url: example.com/page
            crop: [10, 20, 300, 100]
            source: "example.com · captured Oct 16, 2026"
            highlight:
              - { x: 20, y: 30, w: 50, h: 10, at: w2 }
              - { x: 20, y: 50, w: 50, h: 10, at: w3, style: box }
            size: [800, 600]
  `);
  assert.equal(errors(r).length, 0, JSON.stringify(errors(r)));
  const im = (r.timeline!.scenes[0] as StageScene).elements[0] as Extract<Element, { type: 'image' }>;
  assert.equal(im.url, 'example.com/page');
  assert.deepEqual(im.crop, { x: 10, y: 20, w: 300, h: 100 });
  assert.equal(im.highlights?.length, 2);
  assert.equal(im.highlights?.[1].style, 'box');
  assert.ok(im.highlights![0].frame < im.highlights![1].frame);
});

test('proof image: size comes from the file when not given; a crop needs one', () => {
  const yaml = 'scenes:\n  - { kind: stage, at: w0, elements: [ { type: image, at: w0, src: media/p.png, crop: [0, 0, 10, 10] } ] }';
  const ok = compile(`look: panel\n${yaml}`, { probeSize: () => [800, 600] });
  assert.equal(errors(ok).length, 0);
  assert.deepEqual(((ok.timeline!.scenes[0] as StageScene).elements[0] as { size?: number[] }).size, [800, 600]);
  assert.ok(errors(compile(`look: panel\n${yaml}`)).some((e) => /crop needs/.test(e.message)));
});

test('camera.track comes from face.json unless switched off', () => {
  const face = { fps: 5, x: [0.5, 0.6] };
  const yaml = 'scenes:\n  - { kind: stage, at: w0, title: Hi }';
  assert.deepEqual(compile(`look: panel\n${yaml}`, { face }).timeline!.camera.track, face);
  assert.equal(compile(`look: panel\ncamera: { track: false }\n${yaml}`, { face }).timeline!.camera.track, undefined);
  assert.equal(compile(`look: panel\n${yaml}`).timeline!.camera.track, undefined);
});

test('face track: small moves hold still, big moves follow', () => {
  const still = smoothTrack(Array.from({ length: 30 }, (_, i) => 0.5 + (i % 2 ? 0.01 : -0.01)), []);
  assert.ok(Math.max(...still) - Math.min(...still) < 0.005, String(still));
  const moved = smoothTrack([...Array(20).fill(0.4), ...Array(20).fill(0.6)], []);
  assert.ok(moved[0] < 0.42);
  assert.ok(moved[39] > 0.56);
});

test('face track: gaps are filled and the path may jump only at a cut', () => {
  const raw = [...Array(10).fill(0.3), null, null, ...Array(8).fill(0.3), ...Array(20).fill(0.7)];
  const x = smoothTrack(raw, [4]);
  assert.equal(x.length, raw.length);
  assert.ok(x.every((v) => Number.isFinite(v)));
  assert.ok(Math.abs(x[19] - 0.3) < 0.01, `before the cut ${x[19]}`);
  assert.ok(Math.abs(x[20] - 0.7) < 0.04, `after the cut ${x[20]}`);
  assert.deepEqual(smoothTrack([null, null], []), [0.5, 0.5]);
});

test('tracked crop glides between samples but never across a jump cut', () => {
  const track = { fps: 5, x: [0.3, 0.3, 0.7, 0.7] };
  assert.equal(trackedX(track, 0, 30, []), 0.3);
  assert.ok(Math.abs(trackedX(track, 9, 30, []) - 0.5) < 1e-9);
  assert.equal(trackedX(track, 8, 30, [9]), 0.3);
  assert.equal(trackedX(track, 9, 30, [9]), 0.7);
  assert.equal(trackedX(track, 9999, 30, []), 0.7);
});

test('house geometry: panel and tile match the Borumi standard look and never overlap', () => {
  assert.deepEqual([Math.round(PANEL.x), Math.round(PANEL.y), Math.round(PANEL.x + PANEL.w), Math.round(PANEL.y + PANEL.h)], [19, 19, 1493, 1061]);
  assert.deepEqual([Math.round(TILE.x), Math.round(TILE.y), Math.round(TILE.x + TILE.w), Math.round(TILE.y + TILE.h)], [1530, 230, 1883, 850]);
  assert.ok(PANEL.x + PANEL.w < TILE.x);
  assert.ok(Math.abs(PANEL_VIEW[0] / PANEL_VIEW[1] - PANEL.w / PANEL.h) < 0.002);
});
