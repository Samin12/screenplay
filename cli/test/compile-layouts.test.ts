// The additions for tutorial edits: `chapters.style: path`, per-scene layouts, overlays. The first
// test pins the rule they all follow: an edit that uses none of them compiles byte for byte as before.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { FIXTURES, aroll, basicYaml, compile, errors, w, warnings, words, y, F } from './fixtures/load.ts';
import { compileEdit } from '../compile.ts';
import { youtubeChapters } from '../captions.ts';
import { chapterHeading, chapterHeadingParts, chapterRows } from '../../src/lib/chapters.ts';

const panel = (body: string, opts = {}) => compile(`look: panel\n${body}`, opts);
const golden = (name: string) => fs.readFileSync(path.join(FIXTURES, `golden-${name}.timeline.json`), 'utf8');

test('an edit without the new options compiles to the same bytes as before (golden from 8e6660b)', () => {
  const ref = compileEdit({ yaml: /^look:/m.test(basicYaml) ? basicYaml : `${basicYaml}\nlook: reference\n`, words, aroll, arollVideo: true });
  assert.equal(JSON.stringify({ timeline: ref.timeline }), golden('reference'));
  const pan = compileEdit({ yaml: basicYaml.replace(/^look:.*$/m, ''), words, aroll, arollVideo: true });
  assert.equal(JSON.stringify({ timeline: pan.timeline }), golden('panel'));
});

// ---------- chapters.style: path ----------

const pathYaml = y`
  chapters:
    style: path
    heading: "Mini course"
    items:
      - { title: "Intro", group: intro }
      - { at: w20, label: "Level 1", title: "The basics", group: l1 }
      - { at: w41, label: "Tip 7", title: "One folder, sorted" }
      - { at: w80, label: "Level 2", title: "Add motion", group: l2 }
      - { label: "Tip 8", title: "Later on" }
  scenes:
    - { kind: stage, at: w0, title: Hello }
`;

test('chapters.style: path is opt-in, and labels and groups reach the timeline', () => {
  const t = panel(pathYaml).timeline!;
  assert.equal(t.chapterGrid.style, 'path');
  assert.deepEqual(t.chapters.map((c) => [c.label, c.group]), [[undefined, 'intro'], ['Level 1', 'l1'], ['Tip 7', undefined], ['Level 2', 'l2'], ['Tip 8', undefined]]);
  assert.deepEqual(chapterRows(t.chapters), [[0], [1, 2], [3, 4]]);
  // no icon needed on a path card
  assert.ok(!warnings(panel(pathYaml)).some((d) => /no `icon`/.test(d.message)));
  // grid stays the default, with no `style` key at all
  const grid = panel(pathYaml.replace('  style: path\n', '')).timeline!;
  assert.ok(!('style' in grid.chapterGrid));
  assert.ok(errors(panel(pathYaml.replace('style: path', 'style: spiral'))).some((e) => /unknown chapter style/.test(e.message)));
});

test('the card title and the chapters file are one string, timed at the card start', () => {
  const t = panel(pathYaml).timeline!;
  const tip = t.chapters[2];
  assert.equal(chapterHeading(tip), 'Tip 7: One folder, sorted');
  const parts = chapterHeadingParts(tip);
  assert.equal(`${parts.label} ${parts.rest}`, 'Tip 7: One folder, sorted');
  const { text } = youtubeChapters(t);
  const lines = text.trim().split('\n');
  assert.deepEqual(lines.map((l) => l.replace(/^\S+ /, '')), ['Intro', 'Level 1: The basics', 'Tip 7: One folder, sorted', 'Level 2: Add motion']);
  const card = t.scenes.find((s) => s.kind === 'chapter' && s.index === 2)!;
  assert.equal(card.from, F(w('w41').start));
  assert.equal(tip.frame, card.from);
  // a labelled chapter names itself on the step badge: no "· 3 / 5" count
  const badge = t.badges.find((b) => b.frame === card.from)!;
  assert.deepEqual([badge.eyebrow, badge.title, badge.plain], ['Tip 7', 'One folder, sorted', true]);
});

test('tile-only items still insert no card on a path card', () => {
  const t = panel(pathYaml).timeline!;
  assert.equal(t.chapters[0].frame, -1);
  assert.equal(t.chapters[4].frame, -1);
  assert.equal(t.scenes.filter((s) => s.kind === 'chapter').length, 3);
});

// ---------- layout: panel | full | him ----------

const layYaml = y`
  scenes:
    - { kind: talking, at: w0, layout: him }
    - { kind: stage, at: w20, title: "In the panel" }
    - { kind: app, at: w41, app: _fixture, layout: full }
    - { kind: stage, at: w80, layout: full, title: "A full card" }
    - { kind: talking, at: w120, layout: him }
    - { kind: stage, at: w160, title: "Back" }
`;

test('layouts are per scene; a switch is a hard cut with complete first and last frames', () => {
  const r = panel(layYaml);
  assert.deepEqual(errors(r), []);
  const t = r.timeline!;
  assert.deepEqual(t.scenes.map((s) => s.lay), ['him', undefined, 'full', 'full', 'him', undefined]);
  // every layout switch cuts; full -> full keeps the normal blur
  assert.deepEqual(t.scenes.map((s) => s.transitionIn), ['cut', 'cut', 'cut', 'blur', 'cut', 'cut']);
  assert.deepEqual(t.scenes.map((s) => [!!s.snapIn, !!s.snapOut]), [[false, true], [true, true], [true, false], [false, true], [true, true], [true, false]]);
  // him: the head jumps to full frame and back on the cut frame; a full visual never moves the tile
  assert.deepEqual(t.webcam, [
    { frame: 0, mode: 'full', cut: true },
    { frame: F(w('w20').start), mode: 'tile', cut: true },
    { frame: F(w('w120').start), mode: 'full', cut: true },
    { frame: F(w('w160').start), mode: 'tile', cut: true },
  ]);
  assert.ok(!warnings(r).some((d) => /leaves the panel empty/.test(d.message)));
});

test('transition: morph brings the blur dissolve and the webcam morph back', () => {
  const t = panel(layYaml.replace('at: w120, layout: him', 'at: w120, layout: him, transition: morph')).timeline!;
  assert.equal(t.scenes[4].transitionIn, 'blur');
  const key = t.webcam.find((k) => k.mode === 'full' && k.frame > 0)!;
  assert.ok(!key.cut);
  assert.ok(key.frame < F(w('w120').start)); // the morph leads the dissolve, as before
});

test('`cut: hard` on a plain webcam: full scene hard-cuts too; without it nothing changes', () => {
  const old = y`
    scenes:
      - { kind: stage, at: w0, title: Hi }
      - { kind: talking, at: w41, webcam: full }
  `;
  const before = panel(old).timeline!;
  assert.equal(before.scenes[1].transitionIn, 'blur');
  assert.ok(!before.webcam[1].cut && !('lay' in before.scenes[1]) && !('snapIn' in before.scenes[1]));
  const hard = panel(old.replace('webcam: full', 'webcam: full, cut: hard')).timeline!;
  assert.equal(hard.scenes[1].transitionIn, 'cut');
  assert.deepEqual(hard.webcam[1], { frame: F(w('w41').start), mode: 'full', cut: true });
});

test('stage keeps hero-left / center on the same key; bad layouts are reported', () => {
  const ref = compile('look: reference\nscenes:\n  - { kind: stage, at: w0, title: Hi, layout: center }').timeline!;
  assert.equal((ref.scenes[0] as { layout: string }).layout, 'center');
  assert.ok(errors(panel('scenes:\n  - { kind: app, at: w0, app: _fixture, layout: him }')).some((e) => /goes on a talking scene/.test(e.message)));
  assert.ok(warnings(panel('scenes:\n  - { kind: app, at: w0, app: _fixture, layout: sideways }')).some((d) => /unknown layout/.test(d.message)));
  // reference look: the layouts map onto the webcam modes it already has
  const r2 = compile('look: reference\nscenes:\n  - { kind: app, at: w0, app: _fixture, layout: full }\n  - { kind: talking, at: w41, layout: him }').timeline!;
  assert.deepEqual(r2.webcam.map((k) => k.mode), ['hidden', 'full']);
  assert.ok(r2.scenes.every((s) => !('lay' in s)));
});

test('a chapter card inside a him scene cuts out and back without a morph', () => {
  const t = panel(y`
    chapters:
      items:
        - { at: w41, title: "One", icon: code }
    scenes:
      - { kind: talking, at: w0, layout: him }
  `).timeline!;
  assert.deepEqual(t.webcam.map((k) => [k.mode, !!k.cut]), [['full', true], ['tile', true], ['full', true]]);
});

test('ui scales a full-layout replica and is rejected elsewhere', () => {
  const t = panel('scenes:\n  - { kind: app, at: w0, app: _fixture, layout: full, ui: 1.4 }').timeline!;
  assert.equal((t.scenes[0] as { ui?: number }).ui, 1.4);
  assert.ok(warnings(panel('scenes:\n  - { kind: app, at: w0, app: _fixture, ui: 1.4 }')).some((d) => /only applies to a replica in `layout: full`/.test(d.message)));
});
