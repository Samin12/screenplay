import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { detectCuts, lcs } from '../media/detect.ts';
import type { Proposal, Word } from '../media/types.ts';

/** Words from a script: "|" marks a pause (0.6 s), everything else is spoken at 0.3 s per word. */
function say(script: string): Word[] {
  const out: Word[] = [];
  let t = 0;
  for (const tok of script.split(/\s+/).filter(Boolean)) {
    if (tok === '|') {
      t += 0.6;
      continue;
    }
    out.push({ i: out.length, text: tok, start: t, end: t + 0.25 });
    t += 0.3;
  }
  return out;
}

const text = (w: Word[], p: Proposal) => w.slice(p.from, p.to + 1).map((x) => x.text).join(' ');
const confident = (w: Word[], ps: Proposal[]) => ps.filter((p) => p.confident).map((p) => text(w, p));
const ambiguous = (w: Word[], ps: Proposal[]) => ps.filter((p) => !p.confident).map((p) => text(w, p));

describe('fillers', () => {
  it('cuts um / uh', () => {
    const w = say('So um I think, uh, we should go.');
    assert.deepEqual(confident(w, detectCuts(w)), ['um', 'uh,']);
  });
  it('cuts "you know" between commas, keeps "you know what"', () => {
    const w = say('And even, you know, people do it. You know what I mean.');
    assert.deepEqual(confident(w, detectCuts(w)), ['you know,']);
  });
});

describe('stutters', () => {
  it('cuts the first of a doubled word', () => {
    const w = say('I I think the the plan works.');
    assert.deepEqual(confident(w, detectCuts(w)), ['I', 'the']);
  });
  it('leaves legit doubles for review', () => {
    const w = say('I know that that is true.');
    const ps = detectCuts(w);
    assert.deepEqual(confident(w, ps), []);
    assert.deepEqual(ambiguous(w, ps), ['that']);
  });
  it('cuts a cut-off fragment of the next word', () => {
    const w = say('He has lit- literally built it.');
    assert.deepEqual(confident(w, detectCuts(w)), ['lit-']);
  });
  it('cuts a repeated phrase', () => {
    const w = say('Like, someone has literally- someone has literally built Photoshop.');
    assert.deepEqual(confident(w, detectCuts(w)), ['someone has literally-']);
  });
});

describe('false starts', () => {
  it('cuts a one-word fragment that opens a clause', () => {
    const w = say("It's insane. So, what- | any software you use, maybe you pay for it.");
    assert.deepEqual(confident(w, detectCuts(w)), ['what-']);
  });
  it('only proposes a dashed word in mid-clause (whisper hears clipped words too)', () => {
    const w = say("I'll let this | guy- | spin out the video.");
    const ps = detectCuts(w);
    assert.deepEqual(confident(w, ps), []);
    assert.deepEqual(ambiguous(w, ps), ['guy-']);
  });
});

describe('retakes', () => {
  it('keeps the last attempt of a restarted sentence', () => {
    const w = say('needs my attention. | And setting this up is super easy. First thing you want to do is, like I did, | and setting this up is super easy. What you want to do is have T3 code.');
    assert.deepEqual(confident(w, detectCuts(w)), ['And setting this up is super easy. First thing you want to do is, like I did,']);
  });

  it('collapses a chain of attempts to the last one (and the connectives leading into them)', () => {
    const w = say(
      "using the real-time live kit or even I can live- | I can leave an example of my- | And I'll even leave an example of my, | I'll even leave an example of my orchestrator below so you can have fun.",
    );
    const ps = detectCuts(w);
    assert.deepEqual(confident(w, ps), ["or even I can live- I can leave an example of my- And I'll even leave an example of my,"]);
    const kept = w.filter((x) => !ps.some((p) => p.confident && x.i >= p.from && x.i <= p.to)).map((x) => x.text).join(' ');
    assert.equal(kept, "using the real-time live kit I'll even leave an example of my orchestrator below so you can have fun.");
  });

  it('removes a fully repeated passage even when the restart is more than 20 s after it began', () => {
    const line = 'Okay, thanks for watching, guys. These are really great tips, but if you want to take this much further, make sure to watch this video right here.';
    const w = say(`What I want you to say is be like, | ${line} | | | | Say it again. | | | ${line}`);
    for (const x of w) if (x.i > 30) Object.assign(x, { start: x.start + 10, end: x.end + 10 }); // a slow middle
    const ps = detectCuts(w);
    const kept = w.filter((x) => !ps.some((p) => p.confident && x.i >= p.from && x.i <= p.to)).map((x) => x.text).join(' ');
    assert.equal(kept, `What I want you to say is be like, ${line}`);
  });

  it('takes a hesitating "or even" along with the abandoned attempt', () => {
    const w = say("the real-time live kit, or even | I can live- | I can leave an example of my orchestrator below.");
    const ps = detectCuts(w);
    assert.deepEqual(confident(w, ps), ['or even I can live-']);
  });

  it('keeps a connective that flows straight into the kept sentence', () => {
    const w = say('We shipped it, and | then we- | then we celebrated.');
    const kept = w.filter((x) => !detectCuts(w).some((p) => p.confident && x.i >= p.from && x.i <= p.to)).map((x) => x.text).join(' ');
    assert.equal(kept, 'We shipped it, and then we celebrated.');
  });

  it('sends parallel structure to review instead of cutting it', () => {
    const w = say('You can do this, | you can do that, and it works.');
    const ps = detectCuts(w);
    assert.deepEqual(confident(w, ps), []);
    assert.deepEqual(ambiguous(w, ps), ['You can do this,']);
  });

  it('does not treat a repeated noun phrase as a retake', () => {
    const w = say('This one is to set up an orchestrator agent. And what an orchestrator agent is, it manages your workers.');
    assert.deepEqual(detectCuts(w), []);
  });

  it('ignores repeats further apart than the window', () => {
    const w = say('And setting this up is super easy, we said.');
    const later = say('And setting this up is super easy again.').map((x, k) => ({ ...x, i: w.length + k, start: x.start + 60, end: x.end + 60 }));
    assert.deepEqual(detectCuts([...w, ...later]), []);
  });
});

describe('lcs', () => {
  it('matches similar words and reports the first pair', () => {
    const r = lcs(['i', 'can', 'live'], ['i', 'can', 'leave', 'an', 'example']);
    assert.equal(r.m, 3);
    assert.deepEqual(r.first, [0, 0]);
    assert.equal(r.lastA, 2);
  });
});
