import { test } from 'node:test';
import assert from 'node:assert/strict';
import { F, appScene, basicYaml, compile, errors, w, y } from './fixtures/load.ts';
import { formatDiag } from '../compile.ts';
import { lint, lucide } from '../check.ts';
import { matchTarget, suggestTargets, targetPattern, type ReplicaInfo } from '../replicas.ts';

const fixtureReplica: ReplicaInfo = {
  id: '_fixture',
  title: 'Test fixture app',
  size: [1920, 1080],
  tone: 'dark',
  targets: { 'item-N': 'row', toggle: 'btn', composer: 'box', panel: 'panel', 'card-N': 'card', 'session-<id>': 'a session row' },
  stateDoc: { panel: 'bool', active: 'n', prompt: 's' },
  defaults: { data: {}, state: { panel: false, active: 1, prompt: '' } },
};

test('errors carry YAML path + line, with the closest phrase', () => {
  const yaml = appScene(['{ at: "show rail", click: toggle }']);
  const r = compile(yaml);
  assert.equal(r.timeline, null);
  const e = errors(r)[0];
  assert.equal(e.path, 'scenes[1].beats[0].at');
  assert.equal(e.line, 8);
  assert.match(e.message, /^phrase "show rail" not found in scene \(18\.8–78\.9 s\); closest: "show panel" at w58/);
  const line = formatDiag(e).replace(/\x1b\[[0-9;]*m/g, '');
  assert.match(line, /^ {2}error scenes\[1\]\.beats\[0\]\.at \(line 8\): phrase "show rail"/);
});

test('YAML syntax errors are reported with their line, no timeline', () => {
  const r = compile('scenes:\n  - kind: talking\n    at: [w0\n');
  assert.equal(r.timeline, null);
  assert.match(errors(r)[0].message, /^YAML: /);
  assert.equal(typeof errors(r)[0].line, 'number');
  const dup = compile('scenes:\n  - kind: talking\n    kind: app\n');
  assert.match(errors(dup)[0].message, /YAML: .*unique/i);
});

test('structural errors: no scenes, unknown kind, missing at, app without app/screen', () => {
  assert.match(errors(compile('title: x\n'))[0].message, /needs a non-empty `scenes:` list/);
  const r = compile(y`
    scenes:
      - { kind: talking, at: w0 }
      - { kind: movie, at: w10 }
      - { kind: talking }
      - { kind: app, at: w50 }
  `);
  const e = errors(r).map((d) => `${d.path}: ${d.message}`);
  assert.ok(e.includes('scenes[1].kind: unknown scene kind "movie"; use one of: talking, app, stage, plug, board'));
  assert.ok(e.includes('scenes[2].at: scene needs `at:` (where it starts)'));
  assert.ok(e.some((m) => m.startsWith('scenes[3]: app scene needs `app: <replica id>`')));
});

test('target patterns: item-N, session-<id>, block-<n>-card-<k>', () => {
  assert.ok(targetPattern('item-N').test('item-12'));
  assert.ok(!targetPattern('item-N').test('item-x'));
  assert.ok(targetPattern('session-<id>').test('session-sales-page'));
  assert.ok(targetPattern('block-<n>-card-<k>').test('block-2-card-3'));
  assert.equal(matchTarget('card-2', Object.keys(fixtureReplica.targets)), 'card-N');
  assert.equal(matchTarget('toggle', Object.keys(fixtureReplica.targets)), 'toggle');
  assert.equal(matchTarget('togle', Object.keys(fixtureReplica.targets)), null);
  assert.deepEqual(suggestTargets('togle', Object.keys(fixtureReplica.targets)), ['toggle']);
  assert.deepEqual(suggestTargets('itm-3', Object.keys(fixtureReplica.targets))[0], 'item-N');
});

test('check: unknown replica / targets / state keys', () => {
  const r = compile(appScene(['{ at: "show panel", click: togle }', '{ at: "cards", lift: card-2 }', '{ at: "folder", focus: session-weekly }', '{ at: "Inside it", set: { colour: red } }'], ['camera: { target: composr }']));
  const d = lint(r.meta, r.timeline, { manifest: [fixtureReplica] });
  const e = d.filter((x) => x.level === 'error').map((x) => `${x.path}: ${x.message}`);
  assert.deepEqual(e, [
    'scenes[1].camera.target: unknown target "composr" for replica _fixture; did you mean composer? (`screenplay replicas _fixture` lists all 6)',
    'scenes[1].beats[0].click: unknown target "togle" for replica _fixture; did you mean toggle? (`screenplay replicas _fixture` lists all 6)',
  ]);
  assert.ok(d.some((x) => x.level === 'warn' && x.path === 'scenes[1].beats[3].set' && /state key "colour" is not documented/.test(x.message)));
  const other = compile(appScene(['{ at: "show panel", click: toggle }']).replace('app: _fixture', 'app: claude-desktp'));
  const e2 = lint(other.meta, other.timeline, { manifest: [fixtureReplica] }).filter((x) => x.level === 'error');
  assert.equal(e2.length, 1);
  assert.match(e2[0].message, /unknown replica "claude-desktp"; known: _fixture/);
});

test('check: screen plate targets, missing media', () => {
  const r = compile(['scenes:', '  - kind: app', '    at: w0', '    screen: media/settings.png', '    size: [2880, 1800]', '    targets: { remote-toggle: [1, 2, 3, 4] }', '    beats: [ { at: w5, click: remote-togle } ]'].join('\n'));
  const d = lint(r.meta, r.timeline, { manifest: [], fileExists: () => false });
  const e = d.filter((x) => x.level === 'error').map((x) => `${x.path}: ${x.message}`);
  assert.ok(e.includes('scenes[0].beats[0].click: unknown target "remote-togle" on this screen plate; did you mean remote-toggle? (defined in scenes[0].targets: remote-toggle)'), e.join('\n'));
  assert.ok(e.includes('scenes[0].screen: media file not found: media/settings.png (paths are relative to the work dir)'));
});

test('check: unknown lucide icons warn with suggestions', async () => {
  const r = compile(y`
    chapters:
      items: [ { at: "the big one", title: Rail, icon: panel-rigth } ]
    scenes:
      - kind: talking
        at: w0
        elements: [ { type: iconlist, items: [ { text: A, icon: sparkles }, { text: B, icon: light-bulb } ] } ]
  `);
  const d = lint(r.meta, r.timeline, { lucide: await lucide() });
  const msgs = d.map((x) => `${x.path}: ${x.message}`);
  assert.ok(msgs.some((m) => m.startsWith('chapters.items[0].icon: unknown lucide icon "panel-rigth"') && m.includes('panel-right')), msgs.join('\n'));
  assert.ok(msgs.some((m) => m.startsWith('scenes[0].elements[0].items[1].icon: unknown lucide icon "light-bulb"') && m.includes('lightbulb')));
  assert.ok(!msgs.some((m) => m.includes('"sparkles"')));
});

test('check: em dashes are errors, long headlines warn', () => {
  const r = compile(y`
    scenes:
      - kind: talking
        at: w0
        elements:
          - { type: title, text: "Claude desktop is the best app you will ever use" }
          - { type: lower, at: w30, title: "Samin — Claude Club" }
  `);
  const d = lint(r.meta, r.timeline, {});
  assert.ok(d.some((x) => x.level === 'error' && x.path === 'scenes[0].elements[1].title' && /em dash/.test(x.message)));
  assert.ok(d.some((x) => x.level === 'warn' && x.path === 'scenes[0].elements[0].text' && /headline has 10 words \(keep it to 7\)/.test(x.message)));
});

test('check: short visuals, still stretches (with times), overlapping callouts on one target', () => {
  const r = compile(appScene(['{ at: "set of cards", callout: panel, text: Rail, hold: 3s }', '{ at: "environment card", lift: panel, hold: 2s }', '{ at: "pick a folder", mark: item-3, hold: 0.5s }']));
  const d = lint(r.meta, r.timeline, {});
  const msgs = d.map((x) => `${x.level} ${x.path}: ${x.message}`);
  assert.ok(msgs.some((m) => m.startsWith('warn scenes[1].beats[2]: mark item-3 is on screen for only 0.50 s (min 1.2 s)')), msgs.join('\n'));
  assert.ok(msgs.some((m) => m.startsWith('warn scenes[1].beats[1]: lift panel overlaps scenes[1].beats[0] (callout panel) on panel for')));
  // different targets: one spotlight at a time
  const two = compile(appScene(['{ at: "set of cards", callout: panel, text: Rail, until: "environment card" }', '{ at: "environment card", lift: card-1 }']));
  const t2 = lint(two.meta, two.timeline, {}).map((x) => `${x.path}: ${x.message}`);
  assert.ok(t2.some((m) => m.startsWith('scenes[1].beats[1]: lift card-1 starts while callout panel (scenes[1].beats[0]) is still up (1.1 s overlap)')), t2.join('\n'));
  // the talking scene has nothing for 18.8 s; the app scene is quiet after the mark until the end
  assert.ok(msgs.some((m) => /^warn scenes\[0\]: no visual change for 18\.5 s \(0:00\.0–0:18\.5, in s0 talking\)/.test(m)), msgs.join('\n'));
  assert.ok(msgs.some((m) => /^warn scenes\[1\]: no visual change for \d+\.\d s \(0:39\.\d–1:18\.9, in s1 app _fixture\)/.test(m)));
  // the basic fixture has the 7.8 s opening (before the title) and nothing else
  const b = compile(basicYaml);
  const still = lint(b.meta, b.timeline, {}).filter((x) => /no visual change/.test(x.message));
  assert.equal(still.length, 1);
  assert.match(still[0].message, /7\.8 s \(0:00\.2–0:07\.9/);
  void F;
  void w;
});
