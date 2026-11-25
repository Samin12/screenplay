# Brief for every fixer

You fix ONE lane of "<title>" from its review. `W` = `<work dir>`. Your task names the lane, the review
file and the output version (`out/<lane>-v<N>.mp4`).

## Read first
`W/PLAN.md`, `W/WRITER.md` (its hard rules are yours), `W/FACTS.md`, any rule file your task names
(`STORY-CUT.md`, `PROOF-FIRST.md`, `LAYOUT.md`, `CONNECTIVES.md`), the review file, and the lane's latest
`HANDOFF*.md`.

## Do this
1. Before you change anything, copy the current `edit.yaml`, `cuts.yaml`, `aroll.*`, `words*.json`,
   `face.json` and `brief.txt` to version names (`edit.v<N-1>.yaml`, …). Delete nothing, scratch included.
2. Work through every `must`, then every `should`. For each: fixed / fixed differently (say how) / not
   fixed (say why). Do not break what the review lists under "What works".
3. If your task says the audio must not change, do not run `cut` or `aroll`, and prove it: the audio stream
   md5 of the old and new file must match.
4. If you change a cut: verify the join with whisper and the listening gate (`CONNECTIVES.md`), on the
   final render.
5. `screenplay check` → 0 errors. Sheet, stills, dense frames at every changed spot. Render the new
   version. Never end your turn while a render is running.
6. If your lane has a split point, re-measure it on the new file and report it.

## Time limit
If your task gives a hard stop: ship what works at that time, and put the rest under "Next version" in the
handoff. A finished smaller fix beats an unfinished bigger one.

## Write `HANDOFF-v<N>.md`
The final file (length, loudness, peak, silence check); a table of every review item and what happened;
changed joins with output times; the split point; chapter frames; full-screen stretches; anything
recreated, example or illustrative that is new; versions kept; "Next version" list; credits spent.

## Reply (under 250 words)
The final path, its length, the split point, counts fixed / differently / not, and anything the boss must
change in the assembly config.
