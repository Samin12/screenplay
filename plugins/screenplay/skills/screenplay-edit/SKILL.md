---
name: screenplay-edit
description: Edit a raw talking-head recording into a premium motion-graphics tutorial with the screenplay engine, in Samin's house layout (him in a tile on the right, step badge above it, all motion graphics in the left panel) with the "Claude 2.0" (RoboNuggets) motion language - a tight cut, a chapter grid, code-built app replicas driven by a scripted cursor (clicks, typing, tooltips), callouts, lifted live clones, real proof cards, all landing on the spoken word. Use when asked to "edit like the Claude 2.0 video", "screenplay edit", "motion edit", "make it look like it's controlling the computer", "animate my recording with app replicas", or to resume/review/render a screenplay work dir.
---

# screenplay-edit

The look comes from one trick: **the "screen recordings" are not recordings.** They are React
replicas of the app, filled with fictional data, driven by a scripted cursor and an emphasis
vocabulary (callout, lift, focus, mark, zoom), every beat anchored to a word. You make editorial
decisions in one YAML file; the engine does timing, layout, animation and rendering.

**The layout is always Samin's house look** (`look: panel`, the default): he stays in a tile on the
right, a step badge sits above it, and everything happens in the left panel, consistent with his other
videos. A chapter switch is the exception: its card takes the full screen for 2 s. Only use `look: reference` (the full-frame "Claude 2.0" layouts) if he asks for it.

Engine: `$SCREENPLAY_HOME` (if unset, the repo root two levels above `$(realpath "$(which screenplay)")`).
CLI: `screenplay` (or `node $SCREENPLAY_HOME/cli/screenplay.ts`). Specs you must read before writing an edit:
`$SCREENPLAY_HOME/docs/EDIT-YAML.md` (the format) and `references/METHOD.md` (the style rules).
Replica guide: `$SCREENPLAY_HOME/docs/REPLICAS.md`.

## The loop

```bash
W=~/Borumi\ Projects/<video>-screenplay        # or any work dir; never inside a .bmprojbundle
screenplay init "$W" --camera cam.mov --mic mic.wav     # or: --borumi "<x>.bmprojbundle" [--scene N]
screenplay transcribe "$W"                    # word-level whisper (short-clip timing)
screenplay cut "$W"                           # retakes/fillers/false starts -> cuts.yaml + review.md
screenplay aroll "$W"                         # tight cut (gaps <= 0.18 s), -16 LUFS, words.out.json, face.json
screenplay brief "$W"                         # w-ids + timestamps: what you anchor to
screenplay replicas                           # available app replicas, their targets and state keys
# ... write $W/edit.yaml ...
screenplay check "$W"                         # must say 0 errors; fix warnings too
screenplay targets "$W" --scene 3             # see target names on the replica
screenplay sheet "$W" --every 2s              # review EVERY sheet image, then iterate
screenplay still "$W" --at "phrase"           # full-size check of one moment
screenplay render "$W" --preview              # 720p check; final: screenplay render "$W" -o out/final.mp4
```

### 1. Cut (do not skip the review)
- Read `review.md`; accept good proposals with `screenplay cut "$W" --accept 1,3`.
- Read the brief top to bottom like a viewer. Add `manual:` cuts in `cuts.yaml` for abandoned
  fragments, rambles and repeated points the detector missed (keep the LAST take). Re-run `aroll`.
- The brief must read as clean, tight sentences before you design anything.
- Misheard words: fix the spelling in `words.json` (same word count) and re-run `aroll`, so anchors
  and captions are right. Misspeaks: cut only if a clean version follows; otherwise keep and flag.
  Never change what he meant.
- You can't hear the result. List the joins worth a listen in your report.

### 2. Plan the beats (write `$W/plan.md` first)
For every sentence decide what the viewer SEES. Use `references/METHOD.md` → "Recipes". Targets:
a visible change every ~1.5–2.5 s, a new scene every 5–15 s, nothing static for > 6 s.
Scene choice (the panel always shows something; outside chapter cards he stays in the tile):
- **app**: the speaker describes doing something in an app ("click", "open", "type", "you'll see").
- **stage** with an `image`: **any claim, name or number gets the real page**: `url`, `source`
  (`"domain · captured Oct 16, 2026"`), `crop` to one paragraph, a marker `highlight` landing on the
  word. For Samin's videos, look in `<project> Agent/proof/` first (its `proof-index.json` has honest
  lines and `do_not_show`). Measure rects from the image and confirm with `screenplay still`.
- **stage** with a diagram (`flow`, `tree`, `compare`): concepts with no screenshot.
- **talking** with `webcam: full`: the closing moment only, e.g. a device in his hand.
- **chapter** cards: one per feature/tip/step (`chapters.items`; earlier parts as tile-only items), plus
  `chapters.badge` for the step badge. Each takes the full screen for 2 s, then cuts back. Titles 2-4
  words so they fit a grid tile.
- **board**: optional cold-open fly-through of 3–5 teaser nodes.
- **plug**: sponsor/community plug with real screenshots.

Timing traps:
- A chapter card covers the whole screen for the first 2 s of speech after its anchor, him included.
  Don't plan a key visual on those words: start the chapter sentence earlier, or let the card play under a lead-in phrase.
- Two elements that overlap (within 0.4 s) split the panel into rows and both shrink. To hand over,
  give the first one an `until` that ends before the next `at`.
- A scene that stays on one UI for more than ~6 s needs life: a real video playing in the UI, a
  smooth `tween: scroll`, messages revealed with `upto`, or the next callout.

### 3. Replicas
- Use an existing replica when the app matches (`claude-desktop`, `terminal`, `browser`). Fill
  `data` with coherent, story-consistent **fictional** content (client names, sessions, files).
  Never show real emails, keys, customer data or private paths.
- A product the video is about (T3 Code, Cursor, a website...) gets its **own** replica built from
  real screenshots (`docs/REPLICAS.md` §5): do not relabel another app's replica as it.
- Run `screenplay targets` and use only target names that exist.
- Real recordings as plates (`screen:` + `start:`) play in real time while the A-roll is cut, so
  they drift off the voice. For a stretch longer than a few seconds, splice the recording per
  beat with ffmpeg first, or use a still. Check real frames for private data (emails, paths,
  notifications), and set `tone: light` for light pages so markers and callouts stay readable.

### 4. Write edit.yaml, then check
- Anchor each beat to the word that names the thing: nouns on the noun, clicks on the verb,
  typing ~1 s before he paraphrases the prompt (`"phrase -1s"`).
- One verb per beat. Prefer lift/focus/callout over zoom; zoom only for dense or tiny UI.
- `lift ... to: [x, y]` is in the panel's viewport, 1400×990. Dense UIs: `camera: {scale: 1.2-1.4, target: <area>}`.
- `screenplay check` until 0 errors. Treat "starts while ... is still up" and "on screen for only"
  warnings as real problems.

### 5. Review like an editor (mandatory)
- `screenplay sheet "$W" --every 2s`, open **every** sheet image. For each shot ask: is the thing
  he is saying visible and readable on a phone? Is his head inside the tile? Is the panel ever empty,
  or a card shown before its content? Does every on-screen word match the voice? Is any crop cutting
  text mid-word?
- `screenplay still` full-size on every app beat. Fix, re-check, re-sheet. Two rounds minimum.
- `screenplay render "$W" --preview`, then check real motion: the first 30 s and every scene change,
  with the `watch` skill if you have it, or dense frames (`ffmpeg -ss T -t 2 -vf fps=10`) if not.

### 6. Deliver
`screenplay render "$W" -o "$W/out/<name>.mp4"` writes the video, `.chapters.txt` (paste into the
YouTube description) and `.srt`. Report: duration, cut stats, chapters, joins to listen to, every liberty you took with real footage or text, anything you are unsure of.
Never upload or publish. (Samin's setup: work dirs live next to the Borumi projects in
`~/Borumi Projects/`; finished exports go to `~/SaminOS/10 YouTube/Projects/<video>/Exports/`.)

### 7. Learn from feedback
When Samin comments on an edit ("too fast", "show the real UI", "bigger text"), fix it, then add a
one-line rule to `references/taste.md` so the next edit starts there. Read `taste.md` before step 2.

## Hard rules
- Everything on screen is true: replicas show real features of the real product; numbers and
  claims shown are the ones he says. If he misspeaks, show the correct thing and flag it.
- One accent colour (terracotta in the house theme) = "look here". Universal entrance is blur-in; no slides, no bounces
  except stickers and lit chapter tiles. No music and no SFX unless asked (the reference has none).
- No em dashes in on-screen text; headlines under 7 words; `*word*` marks the accent word.
- Never write frame numbers or animation code in edit.yaml. If the vocabulary lacks something,
  add a component to the engine (src/stage/elements, src/replicas) instead of hacking around it.
