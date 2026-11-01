import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { briefLines, sentences } from '../media/brief.ts';
import { formatCutsYaml, parseAccept, parseCutsYaml } from '../media/cutsfile.ts';
import { normWord } from '../media/text.ts';
import { mergeChunkWords } from '../media/transcribe.ts';
import type { OutWord, Word } from '../media/types.ts';
import { normaliseWords, parrotsPrompt, parseWhisperJson } from '../media/words.ts';

const tok = (text: string, from: number, to: number) => ({ text, offsets: { from, to }, p: 0.9 });

describe('parseWhisperJson', () => {
  it('merges sub-word tokens, attaches punctuation and drops specials', () => {
    const json = {
      transcription: [
        {
          text: ' Adobe grosses $23 billion.',
          offsets: { from: 0, to: 2000 },
          tokens: [tok('[_BEG_]', 0, 0), tok(' Adobe', 0, 300), tok(' gross', 300, 600), tok('es', 600, 800), tok(' $', 800, 850), tok('23', 850, 1000), tok(' billion', 1000, 1500), tok('.', 1500, 1900), tok('[_TT_100]', 2000, 2000)],
        },
        { text: ' [BLANK_AUDIO]', offsets: { from: 2000, to: 4000 }, tokens: [tok(' [', 2000, 2100), tok('BL', 2100, 2200), tok('ANK', 2200, 2300), tok('_AUDIO', 2300, 2400), tok(']', 2400, 2500)] },
      ],
    };
    assert.deepEqual(parseWhisperJson(json, 10), [
      { i: 0, text: 'Adobe', start: 10, end: 10.3 },
      { i: 1, text: 'grosses', start: 10.3, end: 10.8 },
      { i: 2, text: '$23', start: 10.8, end: 11 },
      { i: 3, text: 'billion.', start: 11, end: 11.5 },
    ]);
  });

  it('splits a word glued on after clause punctuation and strips quotes', () => {
    const json = { transcription: [{ text: '', offsets: { from: 0, to: 1000 }, tokens: [tok(' like', 0, 200), tok(',"', 200, 250), tok('Okay', 250, 500), tok(',', 500, 520)] }] };
    assert.deepEqual(
      parseWhisperJson(json).map((w) => w.text),
      ['like,', 'Okay,'],
    );
  });

  it('drops segments that parrot the prompt', () => {
    const prompt = 'Um, so, uh, I- I mean, like, you know, we- we were, uh, thinking. Hmm, okay.';
    assert.equal(parrotsPrompt('And, uh, I mean, like, we were, uh, thinking.', prompt), true);
    assert.equal(parrotsPrompt('And even, you know, people do it.', prompt), false);
    const json = { transcription: [{ text: ' And, uh, we were, uh, thinking.', offsets: { from: 0, to: 1000 }, tokens: [tok(' And', 0, 100), tok(' uh', 100, 200)] }] };
    assert.deepEqual(parseWhisperJson(json, 0, { prompt }), []);
  });
});

describe('normaliseWords', () => {
  it('accepts {words:[...]}, ms fields and multi-word entries', () => {
    const w = normaliseWords({ words: [{ text: 'thank you', start_ms: 1000, end_ms: 1600 }, { word: '.', start: 1.6, end: 1.7 }, { text: 'Bye', start: 2, end: 2.3 }] });
    assert.deepEqual(w, [
      { i: 0, text: 'thank', start: 1, end: 1.3 },
      { i: 1, text: 'you.', start: 1.3, end: 1.6 },
      { i: 2, text: 'Bye', start: 2, end: 2.3 },
    ]);
  });
  it('fixes overlaps and sorts', () => {
    const w = normaliseWords([
      { text: 'b', start: 1.0, end: 1.5 },
      { text: 'a', start: 0.5, end: 1.2 },
    ]);
    assert.deepEqual(w.map((x) => x.text), ['a', 'b']);
    assert.ok(w[0].end <= w[1].start);
  });
});

describe('mergeChunkWords', () => {
  it('concatenates chunks in time order and renumbers', () => {
    const a: Word[] = [{ i: 0, text: 'one', start: 0, end: 0.5 }];
    const b: Word[] = [
      { i: 0, text: 'dup', start: 0.2, end: 0.4 },
      { i: 1, text: 'two', start: 1, end: 1.4 },
    ];
    assert.deepEqual(mergeChunkWords([a, b]), [
      { i: 0, text: 'one', start: 0, end: 0.5 },
      { i: 1, text: 'two', start: 1, end: 1.4 },
    ]);
  });
});

describe('text', () => {
  it('normalises words for comparison', () => {
    assert.equal(normWord('“Literally-'), 'literally');
    assert.equal(normWord('I’ll,'), "i'll");
    assert.equal(normWord('10,000.'), '10,000');
  });
});

describe('cuts.yaml', () => {
  const words: Word[] = Array.from({ length: 10 }, (_, i) => ({ i, text: `w${i}`, start: i, end: i + 0.5 }));
  it('round-trips and keeps manual, accepted and keep lists', () => {
    const src = 'maxGap: 0.2\ncuts:\n  - {from: s1, to: s2, why: retake}\naccepted: [{from: s4, to: s4, why: "stutter (review #1)"}]\nmanual:\n  - {from: 6, to: s7, why: off topic}\nkeep: [{from: s2, to: s2}]\n';
    const c = parseCutsYaml(src);
    assert.equal(c.maxGap, 0.2);
    assert.deepEqual(c.manual, [{ from: 6, to: 7, why: 'off topic' }]);
    const again = parseCutsYaml(formatCutsYaml(c, words));
    assert.deepEqual(again, c);
  });
  it('reads a bare list as manual cuts', () => {
    assert.deepEqual(parseCutsYaml('- {from: s3, to: s5, why: retake}\n').manual, [{ from: 3, to: 5, why: 'retake' }]);
  });
  it('parses --accept lists and ranges', () => {
    assert.deepEqual(parseAccept('1, 3,5-7'), [1, 3, 5, 6, 7]);
    assert.throws(() => parseAccept('x'));
  });
});

describe('brief', () => {
  const ow = (texts: string[]): OutWord[] => texts.map((text, k) => ({ id: `w${k}`, text, start: k * 0.4, end: k * 0.4 + 0.3, src: k }));
  it('prints one sentence per line with the first word id and time', () => {
    assert.deepEqual(briefLines(ow(['Hello', 'there.', 'and', 'setting', 'this', 'up.'])), ['w0 [00:00.0] Hello there.', 'w2 [00:00.8] And setting this up.']);
  });
  it('breaks very long sentences at a comma', () => {
    const long = ow([...Array.from({ length: 20 }, (_, k) => `a${k}`), 'b,', ...Array.from({ length: 20 }, (_, k) => `c${k}`), 'end.']);
    assert.ok(sentences(long).length >= 2);
  });
});
