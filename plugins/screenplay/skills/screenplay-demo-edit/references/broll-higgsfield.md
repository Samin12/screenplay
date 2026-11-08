# Higgsfield B-roll for analogies

Every analogy he tells is acted out by a short pixel-art clip with one recurring protagonist (a young man in a
navy blazer, plus a small cream-and-orange robot when an AI acts). The base recipe (style line, commands, costs)
is in `../screenplay-edit/references/concept-visuals.md` §3. This is how the Hermes Trader set of 22 clips was made.

## Pipeline
1. **List the analogies** from `brief.txt`: slug, his exact line, the punch word where the change must land.
2. **Character sheets first** (nano_banana_pro): one sheet per recurring character (front, three-quarter, back on
   a plain background). Every keyframe prompt then says "exactly the character from the character sheet reference"
   and passes the sheet (and a previous good frame) as `refs`. That keeps him the same person in every clip.
3. **Keyframes** (nano_banana_pro, 16:9, 2k): the scene BEFORE the change. For a reveal, also an end frame
   ("Redraw this exact image, keep ... change only ...") and animate start → end.
4. **Clips** (seedance_2_0, 5 s, 720p, no audio): the prompt describes the motion and puts the change at a stated
   second ("At about 2.5 seconds ..."). Mostly still camera, faint push-in. Run `higgsfield generate cost` first.
5. Keep every prompt in `media/broll/src/prompts.json` (`keyframes` and `videos`, each with `prompt`/`beat`, `refs`,
   `start`/`end`) and rejects in `src/rejected/`.
6. Re-encode for the engine: h264, 30 fps, 1 s GOP, no audio. Make a contact sheet per clip and look at it.
7. Write `media/broll/INDEX.md`: slug, file, duration, what's in it, **reveal second**, his spoken line. Part
   writers start the clip `reveal` seconds before the punch word.

## Index rows (examples)

| Slug | What's in it | Reveal | Spoken line |
|---|---|---|---|
| bot-night | asleep in a dark bedroom, phone on the nightstand, trading app on a monitor | 2.0 s phone lights, 2.8 s orders fill | "act on them while you're at work or asleep" |
| news-late | split frame: watching TV news / a dark penthouse | 2.4 s penthouse lights up, man already toasting | "long before you hear about it on the news" |
| broll-apartment | protagonist with a key below an apartment tower | 2.7 s the tower becomes a data center | "like renting an apartment in a huge building" |
| friday-review | small robot at a corkboard of receipts | 2.5 s writes the rule card | "every Friday, Hermes reviews its trades" |

## Rules
- One clip per analogy, used once (the lint flags a slug used 3+ times).
- No logos, no readable text in the generation (models misspell); real names go in the engine's captions.
- B-roll is for analogies and "imagine" moments in talking parts, never over a moving screen.
- Reuse clips across videos when the analogy repeats (the `broll-*` set came from an earlier edit).
