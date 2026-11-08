# Assembling the working edit in Borumi

He reviews and finishes in Borumi, so the render goes back into a Borumi project: one scene per chapter, a card
scene before each chapter, sound effects as separate clips he can nudge, and retake cuts. Everything is done with
the Borumi MCP through the local bridge, in one transaction per run, verified before commit.

## The bridge
- Borumi's MCP runs as `borumi mcp`; the bridge (`~/.borumi-edit/skill/scripts/bridge/bmcpd.py`) serves it on
  `127.0.0.1:47811`: `POST /call {"tool": ..., "args": {...}}` → `{text, isError}`.
- Every edit: `begin_project_edit {project_id}` → `tx_id`; each write passes the current `timeline_hash`
  (from `get_scenes`); `commit_project_edit {tx_id, change_summary}` or `abort_project_edit`.
- Read state with `get_scenes` (start/end/segment_count per scene) and `get_timeline {range, detail: "segments"}`
  (layers with kinds `screen`, `system_sound`, `sound_effect`; a segment's media id is `media.media_id`).
- `import_media` may return an `import_id`; poll `get_media_import_status` until `completed`.

## §1 Split a render by chapter (so he can see it)
Create the project, import the render, `create_scenes` one per chapter (`NN <title>`), then per scene: add one
`take` of the whole file at the scene start (`video_kind: screen`, `audio_kind: system_sound`) and ripple-trim it
to the chapter range. An empty scene pads to 3000 ms; adding a take at its start replaces the padding. Re-running
for a new version = swap each scene's take for the same range of the new render.

## §2 Chapter breaks (his "breathing room")
The engine renders each chapter card for 2 s full screen with his speech already playing under it. To add a 1 s
breather without a visual restart, a card scene is: **the render's card build [C, C+1 s] with no audio, then that
last frame frozen for 1 s while the render's audio [C, C+1 s] plays**, and the chapter scene continues from
C+1 s. Picture and audio stay in sync; his click sound lands at the card scene's start.
- `C` = the exact card frame from `.screenplay/timeline.json` (`timeline.chapters[].frame / 30`), not the rounded
  chapters.txt time (the card builds from a near-black frame; a still of it looks broken).
- `scripts/make_cards.py` writes `cards/card-NN.mp4` + `cards.json`.
- Project time after the cards: `proj(r) = r + G × count(C_k ≤ r)` with `G` = 1000 ms. Cuts and SFX given in render
  ms are mapped with it; a cut may not cross a card.

## §3 Sound effects
Separate `sound_effect` segments, never baked into the render:
- whoosh (Borumi built-in) on hook scene changes, placed 120 ms early, -6 dB;
- pop (Borumi built-in) on title cards and level titles, -3 dB;
- his chapter click (`create-chapter-transitions`, `chapter-transition-quiet.wav`) at each card scene, 0 dB.
`add_segments` with `{"type": "sound_effect", "placement": {"at_ms"}, "content": {"media_id"},
"properties": {"volume_filter": dB}}`. Read them back and compare positions (±2 ms).

## §4 Cuts (retakes, filler "but"s, logins)
- Find candidates by reading the transcript top to bottom: false starts, a sentence restarted, filler openers
  ("But,", "But, and", "Okay, so", "Well,", "But anyways,", "And then And then"), and anything to hide (a login).
- **Do not trust Borumi's per-media transcript for edges.** It invents repeats that he never said (twice in Hermes
  Trader the "repeat" was his only take) and drifts 0.1-0.3 s. For every candidate, export the mix
  (`export_audio`), run whisper on a few seconds around it, and look at the RMS energy to place the edges in the
  silence before/after the word.
- Apply cuts **last to first** with `trim_timeline {ranges: [[a, b]], ripple: true, target: {type: "layers",
  layer_ids: ["screen_1", "system_sound_1", "sound_effect_1"]}}` (include the SFX layer or the effects don't
  move). Check the duration drops by exactly the cut each time.
- After commit: export the mix again and run `scripts/verify_cuts.py` on every join. Each join must read as one
  clean sentence.

## §5 The rebuild script
`scripts/borumi_assemble.py <config.json> [--dry]` does §2-§4 in one transaction: imports the intro render and the
main render, refills the chapter scenes by scene id (so re-running on an already-rebuilt project works), creates or
refills the card scenes, deletes and re-adds every sound effect, applies the cuts, verifies scene order, card
positions, SFX count and total duration, then commits (`--dry` aborts after the checks). Re-run it after every new
render or cut list; it never touches anything outside the project.

## §6 Previews
`export_video` / `export_audio` a range, poll `get_export_status`, frame-check with ffmpeg, then embed the mp4s in
the reply. Minimum: the first ~70 s and one chapter break.
