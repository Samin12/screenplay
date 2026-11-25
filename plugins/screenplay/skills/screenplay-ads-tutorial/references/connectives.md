# The connectives pass

Tight cuts remove the small words that hold sentences together. He heard it on the first master (his note
is quoted in [his-taste.md](his-taste.md), Story and flow). This pass puts them back, using only words he
said.

## Order of preference

1. **Restore his own word.** Most missing connectives were said and then removed by an earlier cut ("So,",
   "And", "Now,", a quiet "Step four,"). Un-cut it. In this edit 12 of the 17 rows were restores, 2 were splices, 2 were
   left and 1 became a pickup.
2. **Splice from the same session.** Same mic, same room, best of all the same scene. Cut the word in
   measured quiet, match level and room tone, 10 ms crossfades.
3. **Leave it.** If a chapter card and breather sit between the two sentences, the card resets the
   sentence and no connective is needed.
4. **Pickup list.** If it still sounds stitched, do not force it. Write the line for him to record.

Never TTS. Never a cloned voice. A connective must not change his meaning or invent a cause ("because") he
did not imply.

## Finding candidates

- The boss reads the master's transcript top to bottom and lists every join where two sentences butt
  together.
- A listen-only reviewer does the same by ear on the master and writes its own list. Fixers fold in the
  rows for their lane.
- Also listed: a chopped ending (a tip that stops mid-thought and runs into the next section) and a
  dangling connective that should be removed.

## The gate

Every restored or spliced word is checked twice:

1. **Whisper** on the finished audio reads the sentence as intended.
2. **Gemini**, given the audio, is asked "does this sound like one natural sentence?" three times. Keep the
   change only if at least 2 of 3 say natural. (The editors cannot hear; whisper reads words, the listening
   model judges the join.)

Run the gate on the **final render**, not only on a short clip. One splice scored 3 of 3 on a 6 s clip and
0 of 3 on the finished file.

## Why a paired comparison was needed

Gemini's absolute verdict is noisy. It called his untouched original "edited" at three of four
spots: it flags his natural breaths. So:

- Always score a **control**: the untouched audio at the same spot. Read the splice's score against it.
- When the absolute scores are low for both, run a **paired test**: play before and after, ask which one
  sounds more natural, four runs. One splice scored 1 of 3 on the absolute test, the untouched version
  scored 0 to 1 of 3, and the paired test preferred the splice 4 of 4.
- A result like that is reported as "his ear decides", with a short before/after clip for him.

## Breaths at trim joins

His mic has a real pause of about 0.3 s after most phrases. A cut that eats into that pause and butt-joins
the next word is what sounds jarring. Make the join in the source audio, keep his own pause whole, crossfade
10 ms, leave no dead-zero gap.

## Smooth flow beats the trim rule

A pointer phrase ("like this one") looks like filler on paper. If every trimmed variant still reads as an
edit and the untouched take reads natural, **put the phrase back**. In the hook, two of four trimmed phrases
were restored for this reason.

## CONNECTIVES.md format

One row per join. The example row is fictional.

| # | Lane | Master time | Before | After | Source of the word | Verdict |
|---|---|---|---|---|---|---|
| 1 | L2 | 7:41 | "…connect the tool. ‖ You open a new chat." | "…connect the tool. **Then** you open a new chat." | his own "Then," at that spot, removed by the auto-cut | restored |

Verdicts: `restored` (un-cut his original word), `spliced` (his word from elsewhere in the session, with the
source seconds and the gate scores), `left` (with the reason), `pickup`.

## Pickup list format

At the bottom of `CONNECTIVES.md`:

```
## Pickup list (lines for him to record, same mic and setup)
1. <chapter>, <lane time>, after "<the words before>": record: "<the whole sentence, with the new word>"
   (what was tried and how it scored)
```

Give him the whole sentence in one breath, not the single word. Report the pickup lines in the final
hand-back.

## After the pass

Write the changed joins with their master times to `out/master-<v>.joins.txt` and hand that list to the
next whole-video reviewer. In this edit all 17 were rated natural.
