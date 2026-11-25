# Brief for every lane writer

You edit ONE lane of <Creator>'s video "<title>" with the screenplay engine. `W` = `<work dir>`. Your lane
is named in your task: a complete screenplay work dir at `W/lanes/<lane>/`, already initialised and
transcribed. You own it end to end: cut, A-roll, edit.yaml, review, render.

## Read first, all of it
1. `W/PLAN.md` (the rules, the boss's cut decisions for your lane, the chapter scheme, the truth rules, the
   assets). `W/FACTS.md`. `W/STORY-CUT.md`, `W/PROOF-FIRST.md`, `W/LAYOUT.md`.
2. The method: the `screenplay-edit` and `screenplay-demo-edit` skills, this skill's `references/`,
   `$SCREENPLAY_HOME/docs/EDIT-YAML.md` (section "Tutorial edits") and `docs/REPLICAS.md`. The engine's
   working example `$SCREENPLAY_HOME/examples/ads-tutorial-mini/edit.yaml`. `W/ENGINE-NOTES.md` if it exists.
3. A finished lane to learn the idiom from: `<path the boss names>`.
4. The real assets for your lane in `P`: read the README, open the images, pull frames from the videos.

## Do this
1. **Paper edit** (`STORY-CUT.md`) → `paper.md`. Reorder with a re-ordered source if needed.
2. **Cut.** `screenplay cut`, read `review.md`, add `manual:` cuts for the boss's decisions. Fix misheard
   product names in `words.json` (same word count). `aroll`, `face`, `brief > brief.txt`. Verify every cut
   with whisper on `aroll.mp4`; no dead silence over 0.7 s.
3. **Plan.** `plan.md`: time / his words / what the viewer sees / scene kind, for every sentence. Ask of
   every sentence: what would he be DOING on his computer here?
4. **Write `edit.yaml`.** Anchors are word ids or phrases. Typing starts about 1 s before he paraphrases
   the prompt. Copy media into `media/`; re-encode clips to h264, 30 fps, 1 s GOP. Use the engine's own
   options, with the snippets in this skill's `templates/yaml/`: `layout: panel | full | him` per scene (a
   switch is a hard cut), `chapters.style: path` with the full chapter list from PLAN.md, top-level
   `overlays:` for a `chip` or a `steps` strip, `data.stamp: Recreated` on every recreated window (the
   engine pins it when you zoom), `fit: wide` on a `show:` beat that should fill the frame.
5. **Check.** `screenplay check` → 0 errors; fix the warnings.
6. **Review like an editor, twice.** `screenplay sheet --every 2s`, open every sheet. Full-size stills of
   every window, proof card and number. Readable at 1/3 size? Panel ever empty? Every word and number
   matches the source? List every stretch of 3 s with no change and fix it.
7. **Render.** Preview first, check motion at every scene change, then the final `out/<lane>-v1.mp4`.
   Never end your turn while a render is running.
8. **Write `HANDOFF.md`**: files; raw → cut length; cuts worth a listen; chapter anchors with output times;
   any split point (seconds, last frame before, first frame after); every full-screen stretch; everything
   recreated or illustrative; every truth flag and what you showed; unproven claims; credits spent; what
   you would fix with another hour.

## Hard rules
- Everything on screen is true and comes from `P`, `W/FACTS.md` or `W/proof/`. Recreated UI says
  "Recreated" for as long as it is up; staged demos say "Recreated · example"; inventions say "Illustration".
- No em dashes on screen. Headlines under 7 words. Real names spelled right. Never the community price.
- Chapter cards inside your lane are the engine's (`chapters.style: path`); the boss adds the cards
  between lanes at assembly. Turn on `chapters.breather` only if PLAN.md says so, and say in the handoff
  that you did: that lane's segment then needs `"breathers": false` in the assembly config, or it gets two
  breathers.
- Only touch `W/lanes/<your lane>/` and your own temp folder. Never engine code, other lanes, PLAN.md,
  FACTS.md or `P`. Never delete files, scratch included (version names). Never write to any Borumi project.
  Do not start other agents. Never publish or upload.
- Stuck on an engine limit: build the beat another honest way and say so in the handoff.

## Reply (under 300 words)
Paths of the preview, the final and HANDOFF.md; raw → cut length; scene count; every liberty; every truth
flag; open issues; 3 still paths (your best and your weakest moment).
