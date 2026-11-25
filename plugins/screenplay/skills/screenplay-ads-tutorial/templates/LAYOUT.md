# Layout: three layouts, picked by what the moment needs (<Creator>, <date>)

His words: "<paste his note on layouts, word for word>"

1. **Full-screen visual, no tile.** The thing on screen is the point: a finished piece, a storyboard, a
   comparison, a dense recreated window, his real screen, award footage, a proof capture carrying a claim.
2. **Full-screen him.** A personal point, an opinion, a story, a direct address. About 3 to 8 s, then back.
3. **Panel + tile (the default)** for explaining while visuals build.

Rules
- Switch on a sentence boundary or the anchor word. Not more often than about once every 3 s.
- A layout switch is a good place to hide a tile jump from a splice.
- The badge may hide in full-screen moments; in the panel it reads the current chapter's heading.
- Chapter cards inside your lane are the engine's (`chapters.style: path`, as PLAN.md lists them). Cards
  between lanes are the boss's, at assembly.
- Full-screen proof and press at least 85% of frame width; award clips full bleed; windows framed with the
  camera, no big white; "Recreated" stays in frame when zoomed (the engine pins the stamp top right).
- Look at every full-screen frame at 1/3 size.
- How: `layout: panel | full | him` on the scene (an engine option; a switch is a hard cut,
  `transition: morph` brings the blur back). A chip or steps strip that stays up across layouts is a
  top-level `overlays:` entry (`type: chip`, `type: steps`). A result card nearly frame wide: `fit: wide`
  on the `show:` beat. The two-render compose (`scripts/compose_layouts.py`) is only for an engine without
  `layout:`. No engine edits.
- A layout pass changes only the picture: the audio md5 must equal the previous version's.
- In your handoff, list every full-screen-visual and full-screen-him stretch (lane seconds + his words).
