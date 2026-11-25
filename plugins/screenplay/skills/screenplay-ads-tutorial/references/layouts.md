# Three layouts

The house layout (panel on the left, him in a tile on the right) is the default, not a law. His words are
in [his-taste.md](his-taste.md) (Layout): full screen for the thing when his face adds nothing, full screen
for him when he is just talking. This is the camera moving "in and out" that he said he liked.

## The three

| Layout | Use it when | Examples |
|---|---|---|
| **Full-screen visual** (no tile) | the thing on screen is the point | a finished ad or clip, a storyboard, a side-by-side comparison, a dense recreated window where the typed text needs every pixel, his real screen, award footage, a proof capture that carries a claim |
| **Full-screen him** | a personal point, a strong opinion, a story, a direct address | the hook's promise, "this is why I like this way more", the personal part of a plug, the lead-in to each level. Short: about 3 to 8 s, then back |
| **Panel + tile** (default) | he explains while visuals build | everything else. The badge is read here |

## Switching rules

- Switch on a sentence boundary or on the anchor word. Never mid-word.
- Not more often than about once every 3 s.
- A layout switch is a good place to hide a tile jump from a splice.
- The heading badge may hide during full-screen moments. When the panel comes back it must read the
  current chapter's heading.
- Chapter cards inside a lane are the engine's (`chapters.style: path`). Cards between lanes are added by
  the boss at assembly ([chapter-cards.md](chapter-cards.md)).
- Come back to the panel when he gives an instruction or sets up a tip, so the badge is seen.
- In the handoff, list every full-screen-visual stretch and every full-screen-him stretch with lane seconds
  and his words.

## Framing rules

- After the change, look at each full-screen frame at 1/3 size.
- Proof captures and press: at least 85% of the frame width. Award clips: full bleed.
- Recreated windows: framed by the camera on the prompt, the reply or the tool call. No big white.
- A zoomed window keeps "Recreated" in frame: the engine pins the stamp top right when the camera pushes
  in past it (see [recreated-windows.md](recreated-windows.md)).
- A visual that cannot fill 85% of the frame stays in the panel.
- The first frame after a switch is finished: no blur-in from an empty canvas, no white flash.

## How: the engine option

This is an engine option now (`docs/EDIT-YAML.md`, "Three layouts, per scene"). Every scene takes
`layout: panel | full | him`. Template: `../templates/yaml/layouts-three.yaml`. A working edit that uses
all three: `examples/ads-tutorial-mini/edit.yaml` in the engine repo.

| Key | What it does |
|---|---|
| `layout: panel` (default) | the visual in the left panel, him in the tile, the badge above |
| `layout: full` | the visual fills the frame; no tile, no badge. Works on `app`, `stage`, `talking`, `plug`, `board` |
| `layout: him` | him full frame, on a `talking` scene (the same as `webcam: full`) |
| `transition: morph` | on a scene: the old 0.33 s blur dissolve in place of the hard cut |
| `ui: 1.25` | on a `full` replica scene: how much bigger the window's UI draws (0.75 to 2, default 1.25) |

- **A layout switch is a hard cut**, any pair, on the scene's first frame. The head jumps, the badge goes
  and comes back on that frame, and an element that starts with the scene is drawn complete on the cut
  frame. No `transition: cut` is needed at a switch, and there is no dark dip to work around.
- Two scenes in the **same** layout still change with a blur. For two full-screen clips back to back
  (the hook), put `transition: cut` on the second.
- A plain `webcam: full` scene still blur-morphs unless it has `cut: hard`. Use `layout: him`.
- The badge hides in `full` and `him` and comes back in `panel` with the current chapter's heading.

Things that stay up across layouts are top-level `overlays:`, not scene elements. They hide only under a
chapter card:

- `type: chip` with `text` (`*..*` is orange), `eyebrow`, `corner` (`top-left` default, `top-right`,
  `bottom-left`, `bottom-right`), and `at` / `until` / `hold`. Template: `../templates/yaml/level-chip.yaml`.
- `type: steps` with `items: [{text, at, icon}]`, `place: top | bottom`, `band: true` (its own band on top,
  so it never covers a title bar or the stamp; start and end it on scene boundaries). Template:
  `../templates/yaml/steps-strip.yaml`.

A result card over a window that should be nearly frame wide: `fit: wide` on the `show:` beat.

## How: the fallback (two renders, composed)

`scripts/compose_layouts.py` is a fallback for an engine version without `layout:`. It is how the edit was
made before the option existed, and it still works for any engine version.

1. **Panel render**: the lane's `edit.yaml`, `look: panel`.
2. **Full render**: a copy of the lane (`full/`, APFS clones of the A-roll, words, face, media) with
   `look: reference`, `webcam: hidden` on app scenes, so each scene is the whole 1920×1080 frame.
3. **Compose** with ffmpeg: take each full-screen stretch from the full render and the rest from the panel
   render, switching on word frames read from `words.out.json` (rounded to the 30 fps grid, like the
   engine's anchors). Audio is copied untouched from the panel render.
   `scripts/compose_layouts.py --panel <render> --reference <render> --panel-ranges START-END ... -o <out>`
   does this. The ranges are **frames** (END exclusive, `round(seconds * fps)`), and with the default
   `--base reference` they are the stretches where the **panel** shows; `--base panel` flips that.
   `--ranges-json` takes the same list as a file; `--assert-same-audio` refuses a pair whose audio differs.
4. Add `transition: cut` in the panel edit on scenes that start right at a switch, so the panel does not
   begin dissolving under the full render.
5. Verify: audio md5 equal to the previous version, chapter frames unchanged, length unchanged.

In the full render:
- The reference look draws proof cards at about 60% width and replica windows mostly empty. Build proof
  captures as full-frame plates (same file, same crop, enlarged to 84 to 96% width, address bar and
  "captured" line drawn on the plate) and keep the engine's `mark` beats for the highlights.
- Frame replica windows with `zoom`, `camera` and bigger `lift`.
- Draw a small "Recreated" pill in the compose step while a window is zoomed past its own stamp (the
  engine's pinned stamp does this for you in a current engine).
- A steps strip can sit in a band above a scaled full-frame picture (in a current engine: a `steps`
  overlay with `band: true`).

A layout pass changes only the picture. Say so in the handoff and prove it with the audio md5.
