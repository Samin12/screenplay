# Story cut: the rule for every part (<Creator>, <date>)

His words: "<paste his note on flow, word for word>"

Do this BEFORE the visuals are locked. It overrides "keep his order".

1. **Paper edit first.** Write the part's transcript out as a script and decide the order a viewer needs:
   what it is → why it matters → how (steps in order) → tip → result. Move sentences. Splice clean halves of
   takes. Drop asides, hedges, false starts, tag questions, filler openers, superlatives that add nothing
   and repeated points (keep the best one). Save `paper.md` in the lane: the new order, one row per piece,
   raw source seconds, a note where a piece moved, was spliced or dropped.
2. **Limits.** Never change what he means. Never splice words into a claim he did not make. A line that
   moves takes its visual with it.
3. **One point once.** If another part already says it, tell the boss which one should keep it.
4. **Joins.** Word boundaries in measured quiet (RMS, not the transcript). Matched room tone, a short
   crossfade, no dead-zero gap. Every join verified with whisper. A splice that jumps his head lands where
   the screen is busy. List the joins worth a listen.
5. **Reordering.** Build `reordered/camera.mp4` + `reordered/mic.wav` with ffmpeg (video on frames, audio
   at the same times with 8 ms fades), `screenplay init` a fresh lane dir beside the old one
   (`lanes/<lane>r`), keep the old lane. `paper.md` maps back to raw time.
6. **Example of the problem in this video:** <one paragraph: the order he said it in, the order a viewer
   needs>.
7. Reviewers do a separate listen-only pass.
