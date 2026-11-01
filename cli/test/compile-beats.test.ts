import { test } from 'node:test';
import assert from 'node:assert/strict';
import { F, appScene, compile, errors, w, warnings } from './fixtures/load.ts';
import { sceneStateAt } from '../compile.ts';
import type { Action, AppScene } from '../../src/types.ts';

const BASE = F(w('w41').start); // the app scene starts on "When"
const at = (id: string) => F(w(id).start) - BASE;
const end = (id: string) => F(w(id).end) - BASE;

function app(beats: string[], extra: string[] = []) {
  const r = compile(appScene(beats, extra));
  return { r, scene: r.timeline?.scenes.find((s) => s.kind === 'app') as AppScene | undefined };
}
const one = (beat: string, extra: string[] = []) => {
  const { r, scene } = app([beat], extra);
  assert.equal(errors(r).length, 0, JSON.stringify(errors(r)));
  return scene!.actions[0];
};

test('app scene: replica plate, data, state, camera', () => {
  const { r, scene } = app(['{ at: "show panel", click: toggle }'], ['data: { title: Reports }', 'state: { panel: false }', 'camera: { scale: 1.15, target: composer }']);
  assert.equal(errors(r).length, 0);
  assert.deepEqual(scene!.plate, { type: 'replica', app: '_fixture', data: { title: 'Reports' } });
  assert.deepEqual(scene!.state, { panel: false });
  assert.deepEqual(scene!.camera, { scale: 1.15, target: 'composer' });
  assert.equal(scene!.from, BASE);
});

test('click: frame = word start, set/tooltip/ring carried', () => {
  assert.deepEqual(one('{ at: "show panel", click: toggle, tooltip: "Show panel", set: { panel: true }, ring: true }'), {
    do: 'click',
    frame: at('w58'),
    target: 'toggle',
    tooltip: 'Show panel',
    set: { panel: true },
    ring: true,
  });
});

test('move: instant, tooltip', () => {
  assert.deepEqual(one('{ at: w53, move: item-2, tooltip: Reports }'), { do: 'move', frame: at('w53'), target: 'item-2', tooltip: 'Reports' });
});

test('type: end = frame + len/cps, default cps 40, lift flag, offsets', () => {
  const a = one('{ at: "this prompt -0.5s", type: composer, key: prompt, text: "Audit my memory files", lift: true }');
  const f = F(w('w93').start - 0.5) - BASE;
  assert.deepEqual(a, { do: 'type', frame: f, end: f + Math.round((21 / 40) * 30), key: 'prompt', text: 'Audit my memory files', target: 'composer', lift: true });
  const slow = one('{ at: "this prompt", type: composer, key: prompt, text: "Audit my memory files", cps: 10 }') as Extract<Action, { do: 'type' }>;
  assert.equal(slow.end - slow.frame, Math.round(2.1 * 30));
});

test('set: hard state swap', () => {
  assert.deepEqual(one('{ at: "Inside it", set: { panel: true, active: 2 } }'), { do: 'set', frame: at('w84'), set: { panel: true, active: 2 } });
});

test('callout: default 3 s, side right, dim on; until = end of the last word', () => {
  assert.deepEqual(one('{ at: "set of cards", callout: panel, text: "Session rail" }'), {
    do: 'callout',
    frame: at('w69'),
    end: at('w69') + 90,
    target: 'panel',
    text: 'Session rail',
    side: 'right',
    dim: true,
  });
  const u = one('{ at: "set of cards", callout: panel, text: Rail, sub: "the right side", side: left, dim: false, until: "environment card" }');
  assert.deepEqual(u, { do: 'callout', frame: at('w69'), end: end('w75'), target: 'panel', text: 'Rail', sub: 'the right side', side: 'left', dim: false });
  const h = one('{ at: "set of cards", callout: panel, text: Rail, hold: 1.5s }') as Extract<Action, { do: 'callout' }>;
  assert.equal(h.end - h.frame, 45);
});

test('lift: default 2.5 s, scale and to', () => {
  assert.deepEqual(one('{ at: "environment card", lift: card-1, scale: 1.6, to: [960, 500] }'), { do: 'lift', frame: at('w74'), end: at('w74') + 75, target: 'card-1', scale: 1.6, to: [960, 500] });
});

test('explode: default 3 s, labels', () => {
  assert.deepEqual(one('{ at: "cards", explode: [card-1, card-2, card-3], labels: [Environment, Context, Connectors] }'), {
    do: 'explode',
    frame: at('w71'),
    end: at('w71') + 90,
    targets: ['card-1', 'card-2', 'card-3'],
    labels: ['Environment', 'Context', 'Connectors'],
  });
});

test('focus 2.5 s, zoom 3 s (scale 1.35 default, or a rect), mark 2 s (ring default)', () => {
  assert.deepEqual(one('{ at: "pick a folder", focus: item-3 }'), { do: 'focus', frame: at('w88'), end: at('w88') + 75, target: 'item-3' });
  assert.deepEqual(one('{ at: "the screen", zoom: composer }'), { do: 'zoom', frame: at('w96'), end: at('w96') + 90, target: 'composer', scale: 1.35 });
  assert.deepEqual(one('{ at: "the screen", zoom: [0, 0, 960, 540], scale: 2 }'), { do: 'zoom', frame: at('w96'), end: at('w96') + 90, rect: { x: 0, y: 0, w: 960, h: 540 }, scale: 2 });
  assert.deepEqual(one('{ at: "pick a folder", mark: item-3 }'), { do: 'mark', frame: at('w88'), end: at('w88') + 60, target: 'item-3', style: 'ring' });
  assert.equal((one('{ at: "pick a folder", mark: item-3, style: underline }') as { style: string }).style, 'underline');
});

test('title 2.5 s with sub; show: a stage element held for the beat', () => {
  assert.deepEqual(one('{ at: "Now type", title: "Side chats", sub: "new" }'), { do: 'title', frame: at('w91'), end: at('w91') + 75, text: 'Side chats', sub: 'new' });
  const s = one('{ at: "Now type", show: { type: keys, keys: [Ctrl, K], label: Search }, hold: 2s }');
  assert.deepEqual(s, {
    do: 'show',
    frame: at('w91'),
    end: at('w91') + 60,
    element: { type: 'keys', frame: at('w91'), end: at('w91') + 60, keys: ['Ctrl', 'K'], label: 'Search', press: at('w91') },
  });
  const d = one('{ at: "Now type", show: { type: sticker, text: New } }') as Extract<Action, { do: 'show' }>;
  assert.equal(d.end - d.frame, 75);
});

test('actions are sorted; ends clamp to the scene; beats before the scene clamp with a warning', () => {
  const { r, scene } = app(['{ at: "pick a folder", click: item-3 }', '{ at: "show panel", click: toggle }', '{ at: "two clicks", callout: panel, text: X, hold: 30s }', '{ at: "My name is", click: item-1 }']);
  assert.deepEqual(
    scene!.actions.map((a) => a.do + ':' + ('target' in a ? a.target : '')),
    ['click:item-1', 'click:toggle', 'click:item-3', 'callout:panel'],
  );
  assert.equal(scene!.actions[0].frame, 0);
  const co = scene!.actions[3] as Extract<Action, { do: 'callout' }>;
  assert.equal(co.end, scene!.duration);
  assert.ok(warnings(r).some((d) => d.path === 'scenes[1].beats[2].hold' && /past the scene end; clamped/.test(d.message)));
  assert.ok(warnings(r).some((d) => d.path === 'scenes[1].beats[3].at' && /not found in scene/.test(d.message)));
  assert.ok(warnings(r).some((d) => d.path === 'scenes[1].beats[3].at' && /before the scene starts; clamped/.test(d.message)));
});

test('beat errors: no verb, two verbs, missing at/key/text, bad values', () => {
  const { r } = app([
    '{ at: w60, tooltip: hi }',
    '{ at: w60, click: toggle, callout: panel }',
    '{ click: toggle }',
    '{ at: w60, type: composer, text: hi }',
    '{ at: w60, lift: true }',
    '{ at: w60, mark: item-1, style: wavy }',
    '{ at: w60, click: toggle, color: red }',
    '{ at: w60, move: toggle, until: w70 }',
  ]);
  const e = errors(r).map((d) => `${d.path}: ${d.message}`);
  assert.ok(e.includes('scenes[1].beats[0]: beat has no verb; use one of: click, move, type, set, tween, callout, lift, explode, focus, zoom, mark, title, show'), e.join('\n'));
  assert.ok(e.includes('scenes[1].beats[1]: one verb per beat, found click + callout; split it into 2 beats with the same `at`'));
  assert.ok(e.includes('scenes[1].beats[2].at: beat needs `at:` (the word it lands on)'));
  assert.ok(e.some((m) => m.startsWith('scenes[1].beats[3].key: type needs `key:`')));
  assert.ok(e.some((m) => m.startsWith('scenes[1].beats[4].lift: lift needs a target name')));
  assert.ok(e.some((m) => m.startsWith('scenes[1].beats[5].style: style must be ring, marker or underline')));
  const wr = warnings(r).map((d) => `${d.path}: ${d.message}`);
  assert.ok(wr.some((m) => m.startsWith('scenes[1].beats[6].color: unknown field "color" for a click beat')));
  assert.ok(wr.some((m) => m.startsWith('scenes[1].beats[7].until: `move` is instant; until/hold ignored')));
  assert.equal(r.timeline, null);
  // every error carries its YAML line
  assert.ok(errors(r).every((d) => typeof d.line === 'number'));
});

test('screen plates: image targets -> Rects, video start -> startFrom; set/type rejected', () => {
  const img = compile(
    [
      'scenes:',
      '  - kind: app',
      '    at: w0',
      '    screen: ./media/settings.png',
      '    size: [2880, 1800]',
      '    targets: { remote-toggle: [2410, 512, 96, 54], connectors: { x: 1980, y: 900, w: 820, h: 420 } }',
      '    beats:',
      '      - { at: "show panel", click: remote-toggle }',
      '      - { at: "Inside it", set: { a: 1 } }',
    ].join('\n'),
  );
  assert.ok(errors(img).some((d) => d.path === 'scenes[0].beats[1].set' && /needs a replica/.test(d.message)));
  const ok = compile(['scenes:', '  - kind: app', '    at: w0', '    screen: media/settings.png', '    size: [2880, 1800]', '    targets: { remote-toggle: [2410, 512, 96, 54] }'].join('\n'));
  const s = ok.timeline!.scenes[0] as AppScene;
  assert.deepEqual(s.plate, { type: 'image', src: 'media/settings.png', size: [2880, 1800], targets: { 'remote-toggle': { x: 2410, y: 512, w: 96, h: 54 } } });
  assert.deepEqual(ok.meta.media.map((m) => m.src), ['media/settings.png']);
  const vid = compile(['scenes:', '  - kind: app', '    at: w0', '    screen: media/rec.mov', '    size: [1920, 1080]', '    start: 12.5'].join('\n'));
  assert.deepEqual((vid.timeline!.scenes[0] as AppScene).plate, { type: 'video', src: 'media/rec.mov', size: [1920, 1080], startFrom: 375, targets: {} });
  // size missing: probed if possible, else an error
  const probed = compile(['scenes:', '  - kind: app', '    at: w0', '    screen: media/a.png'].join('\n'), { probeSize: () => [1000, 500] });
  assert.deepEqual(((probed.timeline!.scenes[0] as AppScene).plate as { size: number[] }).size, [1000, 500]);
  const nosize = compile(['scenes:', '  - kind: app', '    at: w0', '    screen: media/a.png'].join('\n'));
  assert.ok(errors(nosize).some((d) => /screen plates need `size/.test(d.message)));
  const abs = compile(['scenes:', '  - kind: app', '    at: w0', '    screen: /Users/x/a.png', '    size: [10, 10]'].join('\n'));
  assert.ok(errors(abs).some((d) => /must be inside the work dir/.test(d.message)));
});

test('sceneStateAt: yaml state + set/click/type effects up to a frame', () => {
  const { scene } = app(['{ at: "show panel", click: toggle, set: { panel: true } }', '{ at: "pick a folder", click: item-3, set: { active: 3 } }', '{ at: "this prompt", type: composer, key: prompt, text: "abcd" }'], ['state: { panel: false }']);
  const s = scene!;
  assert.deepEqual(sceneStateAt(s, 0), { panel: false });
  assert.deepEqual(sceneStateAt(s, at('w58')), { panel: true });
  assert.deepEqual(sceneStateAt(s, at('w88')), { panel: true, active: 3 });
  const ty = s.actions[2] as Extract<Action, { do: 'type' }>;
  assert.equal(sceneStateAt(s, ty.end).prompt, 'abcd');
});

test('meta records targets and state keys for the checker', () => {
  const { r } = app(['{ at: "show panel", click: toggle, set: { panel: true } }', '{ at: "cards", explode: [card-1, card-2] }', '{ at: "this prompt", type: composer, key: prompt, text: x }'], ['camera: { target: composer }']);
  assert.deepEqual(
    r.meta.targets.map((t) => `${t.path}=${t.name}@${t.app}`),
    ['scenes[1].camera.target=composer@_fixture', 'scenes[1].beats[0].click=toggle@_fixture', 'scenes[1].beats[1].explode[0]=card-1@_fixture', 'scenes[1].beats[1].explode[1]=card-2@_fixture', 'scenes[1].beats[2].type=composer@_fixture'],
  );
  assert.deepEqual(
    r.meta.stateKeys.map((k) => k.key),
    ['panel', 'prompt'],
  );
});

test('tween: animates a numeric state key over its hold, needs `to`, replica only', () => {
  assert.deepEqual(one('{ at: "show panel", tween: scroll, to: 420, until: "show panel" }'), {
    do: 'tween',
    frame: at('w58'),
    end: end('w59'),
    key: 'scroll',
    to: 420,
  });
  const { r } = app(['{ at: "show panel", tween: scroll }']);
  assert.ok(errors(r).some((d) => d.path === 'scenes[1].beats[0].to'));
});

test('sceneStateAt: tween eases from the current value to `to`', () => {
  const { scene } = app(['{ at: "show panel", tween: scroll, to: 400, hold: 1s }'], ['state: { scroll: 100 }']);
  const a = scene!.actions[0] as Extract<Action, { do: 'tween' }>;
  assert.equal(sceneStateAt(scene!, a.frame).scroll, 100);
  assert.equal(sceneStateAt(scene!, a.end).scroll, 400);
  const mid = sceneStateAt(scene!, a.frame + Math.floor((a.end - a.frame) / 2)).scroll as number;
  assert.ok(mid > 100 && mid < 400, String(mid));
});
