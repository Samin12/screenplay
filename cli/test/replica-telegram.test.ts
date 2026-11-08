import { test } from 'node:test';
import assert from 'node:assert/strict';
import { arrivals, parseLines, parseSpans, visibleCount } from '../../src/replicas/telegram/text.ts';
import { defaultData } from '../../src/replicas/telegram/defaults.ts';
import { loadManifest, matchTarget } from '../replicas.ts';

const msgs = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];

test('telegram: line numbers skip blanks, so msg-<id>-line-<k> counts lines of text', () => {
  const lines = parseLines('One\n\n• Two\nThree');
  assert.deepEqual(
    lines.map((l) => (l.blank ? null : l.n)),
    [1, null, 2, 3],
  );
  assert.deepEqual(parseLines(undefined), [{ blank: true }]);
});

test('telegram: **bold**, [label](url) and bare links', () => {
  assert.deepEqual(parseSpans('See **this**, [STRATEGY.md](https://x.y/s) and https://a.b/c.'), [
    { kind: 'text', text: 'See ' },
    { kind: 'bold', text: 'this' },
    { kind: 'text', text: ', ' },
    { kind: 'link', text: 'STRATEGY.md' },
    { kind: 'text', text: ' and ' },
    { kind: 'link', text: 'https://a.b/c.' },
  ]);
});

test('telegram: upto takes a count, a message id or null', () => {
  assert.equal(visibleCount(msgs, 2), 2);
  assert.equal(visibleCount(msgs, 99), 3);
  assert.equal(visibleCount(msgs, 'b'), 2);
  assert.equal(visibleCount(msgs, 'nope'), 3);
  assert.equal(visibleCount(msgs, null), 3);
});

test('telegram: only what the last upto or append change revealed animates', () => {
  assert.deepEqual(arrivals(msgs, [], { upto: { frame: 40, prev: 1 } }), { b: 40, c: 40 });
  assert.deepEqual(arrivals(msgs, [], { upto: { frame: 40, prev: undefined } }), {});
  assert.deepEqual(arrivals(msgs, [{ id: 'x' }, { id: 'y' }], { append: { frame: 9, prev: [{ id: 'x' }] } }), { y: 9 });
  assert.deepEqual(arrivals(msgs, [], undefined), {});
});

test('telegram: the two hook messages are in the defaults, marked illustrative', () => {
  const risk = defaultData.messages.find((m) => m.id === 'risk')!;
  assert.equal(risk.illustrative, true);
  assert.equal(risk.date, 'November 2');
  assert.equal(risk.title, 'RISK CHECK: midterms tomorrow');
  assert.equal(parseLines(risk.text).filter((l) => !l.blank).length, 4);
  const update = defaultData.messages.find((m) => m.id === 'update')!;
  assert.equal(update.illustrative, true);
  assert.equal(update.date, 'November 5');
  assert.equal(update.title, 'UPDATE: AI and chips sold off');
  assert.equal(defaultData.messages.filter((m) => m.illustrative).length, 2);
});

test('telegram: registered, with the targets and state keys the edit relies on', async () => {
  const info = (await loadManifest()).replicas.find((r) => r.id === 'telegram');
  assert.ok(info);
  const keys = Object.keys(info.targets);
  for (const name of ['msg-risk', 'msg-risk-title', 'msg-risk-line-2', 'topic-trading', 'composer', 'send', 'header', 'sidebar', 'avatar', 'phone']) assert.ok(matchTarget(name, keys), name);
  for (const key of ['view', 'sidebar', 'upto', 'typing', 'scroll', 'topic', 'composer']) assert.ok(key in info.stateDoc, key);
});
