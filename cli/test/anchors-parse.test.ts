import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AnchorError, normalizeTokens, parseAnchor, parseDuration, parseOffset } from '../anchors.ts';

test('normalizeTokens: case, punctuation, apostrophes, accents, ampersand', () => {
  assert.deepEqual(normalizeTokens("It's  the BIG one!"), ['its', 'the', 'big', 'one']);
  assert.deepEqual(normalizeTokens('don’t'), ['dont']);
  assert.deepEqual(normalizeTokens('sub-agents, café & co.'), ['sub', 'agents', 'cafe', 'and', 'co']);
  assert.deepEqual(normalizeTokens('...'), []);
});

test('parseAnchor: word ids', () => {
  assert.deepEqual(parseAnchor('w123'), { kind: 'word', raw: 'w123', index: 123, offset: 0 });
  assert.equal((parseAnchor('W7') as { index: number }).index, 7);
});

test('parseAnchor: output time and frames', () => {
  const a = parseAnchor('o:61.5');
  assert.equal(a.kind, 'time');
  assert.equal((a as { seconds: number }).seconds, 61.5);
  assert.equal((parseAnchor('o:1:01.5') as { seconds: number }).seconds, 61.5);
  assert.equal((parseAnchor('o:.5') as { seconds: number }).seconds, 0.5);
  const f = parseAnchor('f:1845');
  assert.equal(f.kind, 'frame');
  assert.equal((f as { frame: number }).frame, 1845);
});

test('parseAnchor: trailing offsets on every form', () => {
  assert.equal(parseAnchor('w120 +0.5s').offset, 0.5);
  assert.equal(parseAnchor('o:10 -1s').offset, -1);
  assert.equal(parseAnchor('type this prompt -1s').offset, -1);
  assert.equal(parseAnchor('"the big one" +250ms').offset, 0.25);
  const p = parseAnchor('type this prompt -1s');
  assert.equal(p.kind, 'phrase');
  assert.deepEqual((p as { tokens: string[] }).tokens, ['type', 'this', 'prompt']);
  // a dash inside the phrase is not an offset
  assert.equal(parseAnchor('one-way order').offset, 0);
  assert.deepEqual(parseOffset('foo +.4s'), { rest: 'foo', offset: 0.4 });
});

test('parseAnchor: phrases, quotes and occurrences', () => {
  const a = parseAnchor('"the big one#2"');
  assert.equal(a.kind, 'phrase');
  assert.equal((a as { occurrence: number }).occurrence, 2);
  assert.equal((a as { phrase: string }).phrase, 'the big one');
  assert.equal((parseAnchor('"the big one"#3') as { occurrence: number }).occurrence, 3);
  assert.equal((parseAnchor("'single quoted'") as { phrase: string }).phrase, 'single quoted');
  assert.equal((parseAnchor('unquoted phrase') as { occurrence: number }).occurrence, 1);
  const b = parseAnchor('"the big one#2" -0.3s');
  assert.equal(b.offset, -0.3);
  assert.equal((b as { occurrence: number }).occurrence, 2);
});

test('parseAnchor: errors are actionable', () => {
  assert.throws(() => parseAnchor(12), (e: Error) => e instanceof AnchorError && /use o:12/.test(e.message));
  assert.throws(() => parseAnchor(''), AnchorError);
  assert.throws(() => parseAnchor('o:abc'), /bad time anchor/);
  assert.throws(() => parseAnchor('"?!"'), /has no words/);
  assert.throws(() => parseAnchor('foo#0'), /must be 1 or more/);
});

test('parseDuration', () => {
  assert.equal(parseDuration('2.5s'), 2.5);
  assert.equal(parseDuration(3), 3);
  assert.equal(parseDuration('500ms'), 0.5);
  assert.equal(parseDuration('4'), 4);
  assert.throws(() => parseDuration('soon'), /duration like 2.5s/);
  assert.throws(() => parseDuration(-1), AnchorError);
});
