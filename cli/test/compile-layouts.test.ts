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
