# The story cut: paper edit before any visual is locked

He watched the first Level 1 render and said the edit was good but parts were "not flowing logically" (full
quote in [his-taste.md](his-taste.md), Story and flow). So the order of his sentences is decided on paper
first. This overrides "keep his order".

The base rule is in `screenplay-edit` (`references/taste.md`, "Story cut before visuals"). This file adds
how it was done across lanes.

## Paper edit

1. Write the lane's transcript out as a script.
2. Order it for a viewer: what it is → why it matters → how (steps in order) → tip → result.
3. Move sentences he said out of order. Splice the clean half of one take onto the clean half of another.
4. Drop asides, hedges, false starts, tag questions, filler openers, superlatives that add nothing, and
   repeated points (keep the best one).
5. Save `paper.md` in the lane: one row per piece, with the raw source seconds and a note where a piece
   moved, was spliced or was dropped, and why.

A lane that needs no reordering still gets a `paper.md` that says so, and still gets the drops.

## Limits

- Never change what he means. Never splice words into a claim he did not make.
- A line that moves takes its visual with it.
- A line that contradicts the real result is dropped at the paper edit. Example: a spoken length for a
  video that the real file does not have. The screen shows the file's length.
- If a drop makes the neighbouring word sound clipped, undo it and note "tried and undone".

## Reordering with the engine

`screenplay cut` and `aroll` keep source order. To reorder:

1. Build a re-ordered source with ffmpeg: trim the camera and the mic into pieces in the new order and
   concat them into `reordered/camera.mp4` and `reordered/mic.wav`. Video cuts on frames, audio cuts at the
   same times with 8 ms fades.
2. `screenplay init` a fresh lane dir beside the old one on those files (`lanes/S10` → `lanes/S10r`). Keep
   the old lane.
3. Transcribe, cut, aroll as usual.
4. `paper.md` records the map from reordered time back to raw time.
5. Tell the boss the new lane path in the handoff.

An extra take filmed out of order (a tip he recorded after the fact) is joined into the lane it belongs to
the same way. The boss decides where it lands; here it went inside Level 2 because Level 3 refers to it as
already introduced.

## Joins

- Cut on word boundaries in measured quiet. Look at the RMS, not the transcript.
- Match the room tone: no dead-zero gaps, a short crossfade.
- Verify every join with whisper on the real audio.
- A splice that jumps his head position lands where the panel is busy or on a layout switch, never on a
  quiet beat with eyes on him.
- List the joins worth a listen in the handoff, with output times.

## One point once

If the hook says it and a later chapter says it again in nearly the same words, one of them goes. In this
edit the hook and the four-step overview both opened with the same sentence. The first fix cut the repeated
line. Then he dropped the whole four-step chapter. The log records the drop, not his reason; the editor's
reading is that each level already walks the steps.

When a chapter is dropped:
- Remove its segment from the assembly config. Keep the old config under a new name.
- Rebuild the chapter cards and the chapter list (indices shift).
- Search the remaining audio for references to it ("as I showed in the four steps") and list them. Two
  orphaned references were still in the final review of this edit.
- Give the idea a small visual where it is still mentioned (a steps strip on "four simple steps").

## Review

Every reviewer does a listen-only pass first: extract the audio, run whisper, read it as a script, and ask
the listening model whether it flows by ear. Repeated points, dangling "so" / "and" / "but", a step
explained before the thing it depends on, leftover hedges. These go at the top of the review under
"Flow (listen only)".
