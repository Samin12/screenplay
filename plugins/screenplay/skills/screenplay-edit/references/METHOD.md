# The method (reverse-engineered from "Anthropic Just Shipped Claude 2.0", RoboNuggets, 17:06)

This file is the rulebook distilled from a frame-level breakdown of that video (~370 beats, every
component measured).

## Samin's house look wins over the reference
His videos keep one layout, so this engine takes the reference's motion and puppeted replicas and puts
them inside his layout (`look: panel`, the default):
- **Layout:** he stays in the same tile on the right, the step badge sits above it, and everything else
  happens in the left panel. From the first frame. Two things go full screen: a chapter card at a
  chapter switch (automatic, 2 s), and a closing shot (`webcam: full`).
- **Palette:** `#121212` canvas with a slowly drifting dot grid, `#181716` panel, one terracotta accent
  `#E2774E`, Inter everywhere. These replace the orange and the serif headlines below.
- **Proof over animation:** a claim gets the real page in a browser card, with one marker on the phrase,
  landing on the word, and a source pill under it. Diagrams are for concepts with no screenshot.
  Every number on screen comes from a source; if he rounds, show the source's line and flag it.
- **Text at panel scale:** nothing under ~22 px in the final frame; crop a page to one paragraph.
- **Sequence changes:** the old element leaves before the new one enters. No empty panels, no empty
  shells, nothing static over ~4 s. Chapter elements 2 s max.
- On Samin's Mac, his full rules and why each exists: `~/.claude/skills/proof-first-video-editor/references/creator-style.md`
  and `visual-system.md`. For a real video, his proof pack (`<project> Agent/proof/`) has verified captures.

The rest of this file is the reference's motion language. Where a table below names a big webcam, a
corner tile or a cream canvas, that's the reference look; the recipes and the motion still apply.

## Why it feels premium
1. **Replicas, not recordings.** Every product shot is a pixel-clean, code-built copy of the app with
   fictional, coherent data (clients "Orchard Lane Coffee", "Saltmarsh Swim"...). The camera is
   locked; the cursor is scripted; UI state swaps are instant. Text is drawn ~1.5x real size so it
   reads on a phone.
2. **Emphasis without zooming.** The UI stays still and legible. The thing being discussed is
   *lifted* toward the viewer as a live enlarged clone (1.5–3.2x, shadow) while everything else dims
   to ~38 %, or *spotlit*, or *called out* (dot pops, white line draws, label blurs in). Whole-frame
   zoom happens about once a minute, only to make dense UI readable.
3. **One motion vocabulary.** Almost everything enters with blur-in (opacity + blur 14 px → 0,
   130–250 ms, no translate) and leaves with blur-out. Scene changes are 0.3–0.4 s blur dissolves.
   Cursor and camera share one cubic ease-in-out. Only stickers and lit chapter tiles overshoot.
4. **One accent.** Orange `#F4611C` means "look here" (callout dots, markers, lit tiles, counters,
   the progress line). Nothing decorative is orange.
5. **Word-locked timing.** The key noun's visual starts on the noun (median offset 0 ms, 75 % within
   ±150 ms). Clicks land on the verb. Typed prompts lead the voice by 1–1.5 s so they're readable as
   he paraphrases. Chapter grids enter on the first word of the chapter sentence.
6. **Constant, calm change.** A visible change every ~1.4–2.9 s; nothing static for more than ~3.5 s;
   new composition every ~5 s. But each beat is one idea.
7. **Silence as polish.** No music bed, no SFX. Voice cut tight (no pause ≥ 250 ms), −16 LUFS.
   Visuals carry the rhythm.
8. **Continuity.** One persistent webcam layer that morphs between modes (blur up, move, blur down),
   shared-element morphs between scenes, earlier chapters stay "done" on the grid.

## Layouts of the reference look (the only three)
| layout | webcam | use | share of runtime |
|---|---|---|---|
| App scene | small tile bottom-left (267×414, r 44) or `pip-right` | doing things in a product | ~55–75 % |
| Stage (hero) | big squircle left (820×820), diagram in the right column | concepts, why, comparisons, numbers | ~15–30 % |
| Talking full-frame | full | hook, credentials, personal story, sign-off | ~5 % |
Plus: chapter grid cards (webcam hidden, ~3.4 s), cold-open board fly-through, cream plug segment.

## Recipes: what he says → what we show
| speech | beat |
|---|---|
| "Click X / open X / switch to X" | `click: X` (+ `set:` the resulting state), tooltip if it's an icon |
| "this panel / this card / the X here" | `callout: X` with a 1–3 word label, or `lift: X` if it has detail worth reading |
| "it shows A, B, C and D" (parts of one UI) | `explode: [a, b, c, d]` with labels, or successive `lift`s |
| "type / ask Claude to ..." / a prompt | `type:` into the composer with `lift: true`, starting `-1s` |
| "go to settings and turn on X" | `click` nav, `set: {view: settings}`, `click: toggle-x` with `set` |
| an analogy ("it's like a taxi meter", "think of a law firm") | stage `story`: act it out with props and people, every move on its word (below) |
| a concept with two sides | stage `compare` (good/bad pills) or `flow` (prompt → result arrows) |
| one thing managing many | stage `tree` (root + children popping on each noun) |
| a list of features/benefits | `bullets` or `chips`, each item on its word |
| a number ("1 million tokens", "$23B") | `counter` or `stat`, on the number word |
| a keyboard shortcut | `keys` (press on the key words) over the app or stage |
| a quote / announcement / tweet | `tweet` with `mark` on the key phrase + `sticker` with the 2-word takeaway |
| proof of a claim (a real page) | `image` with `highlight` + `source` |
| "which plans get it" | `table` with `highlight` on the column |
| a new chapter/feature/tip | `chapters.items` entry (grid card), webcam hidden |
| sponsor / community plug | `plug` scene with real screenshots, plain cuts on sentence starts |
| sign-off | talking full-frame + `cta` |

## Analogy → story
When he reaches for an analogy ("it's like a taxi meter", "think of a law firm"), the viewer should
**see the story happen**, not read it. Build a `story` element (docs/EDIT-YAML.md, "Stories"):
1. **Cast it.** One actor per thing in the analogy: people (`person`, `wear: tie | headset`), places
   (`building`, `office`, `tower`), things (`taxi`, `car`, `plane`, `document`, `stack`, `phone`,
   `monitor`, `notebook`, `drawer`), and the number that matters (`counter`, `meter`, the taxi's own
   meter). Map the analogy to the real thing in the `title` or a `label`/`role` ("Partner" / "Opus").
2. **Block it.** Lay them out on the 1400×990 stage like a stage play: who stands where, the ground
   line under feet and wheels, room above heads for speech bubbles. A beat every 1–2 s.
3. **Direct it on his words.** Each actor enters on the word that names it (`at:`), moves on the verb
   ("hands the stack" → `move`), talks on the line (`say`), counts on the number (`count`), and the
   punchline gets the emphasis (`highlight`, `pulse`, `sticker`, a `follow` push-in). The accent is
   the one thing the analogy is about (the meter, the expensive partner, the free line).
4. **Check stills** at the key beats: is the story readable with the sound off?

**Taxi meter that keeps charging** (cost keeps running even when nothing happens):
```yaml
- type: story
  title: "Your session is a *taxi meter*"
  actors:
    - { id: road, kind: path, from: [40, 742], to: [1360, 742] }
    - { id: cab, kind: taxi, x: 300, y: 572, value: 2.5 }
    - { id: jam, kind: car, x: 1130, y: 660, scale: 0.8, at: "sitting in traffic" }
  beats:
    - { at: "meter starts running", count: cab, to: 48.6, ease: linear, until: "than you expected" }
    - { at: "Every message", move: cab, to: [700, 572], until: "keeps charging" }
    - { at: "message you send", say: cab, text: "Fix this bug" }
    - { at: "the fare", follow: cab, scale: 1.5 }
```
**Law firm partner and interns** (expensive model delegates to cheap ones):
```yaml
- type: story
  title: "Opus is the *partner*, Haiku the interns"
  actors:
    - { id: partner, kind: person, x: 290, y: 470, wear: tie, color: accent, label: Partner, at: "senior partner" }
    - { id: docs, kind: stack, x: 640, y: 540, count: 200, text: docs, at: "every single document" }
    - { id: i1, kind: person, x: 930, y: 430, scale: 0.75, at: "the interns", enter: pop }
    - { id: i2, kind: person, x: 1100, y: 430, scale: 0.75, label: Interns, role: Haiku, at: "the interns", enter: pop }
    - { id: memo, kind: document, x: 1100, y: 800, pages: 1, title: Summary, at: "send back" }
  beats:
    - { at: "hands the boring stack", move: docs, to: [1100, 810], until: "to the interns" }
    - { at: "the interns", connect: partner, to: i1, label: Delegate, curve: -0.2, until: "send back" }
    - { at: "They read it all", count: docs, to: 0, until: "send back" }
    - { at: "send back", exit: docs }
    - { at: "one page summary", move: memo, to: [560, 700] }
    - { at: "makes the call", say: partner, text: "Approved." }
```
**Call center rolling to the next free line** (fallback across accounts or models):
```yaml
- type: story
  title: "A busy line *rolls over*"
  actors:
    - { id: caller, kind: phone, x: 190, y: 540, label: Caller }
    - { id: a1, kind: person, x: 650, y: 560, wear: headset, label: "Line 1" }
    - { id: a2, kind: person, x: 930, y: 560, wear: headset, label: "Line 2" }
    - { id: call, kind: icon, icon: phone-call, x: 190, y: 250, size: 110, color: accent, at: "When one agent's line" }
  beats:
    - { at: "When one agent's line", move: call, to: a1, offset: [0, -260], until: "is busy" }
    - { at: "is busy", swap: a1, role: Busy, color: bad }
    - { at: "rolls over", move: call, to: a2, offset: [0, -260] }
    - { at: "rolls over", swap: a2, role: Free, color: good }
    - { at: "Nobody hangs up", connect: caller, to: a2, label: Connected, curve: -0.6 }
    - { at: "always gets an answer", say: a2, text: "How can I help?" }
```
Full versions (with every beat) render from `examples/tests/story-analogies.json`; every prop is in
`examples/tests/story-props.json`.

## Cursor grammar
- Appears only when an action is narrated; pops in near the first target; leaves ~1 s after the
  last action of a group.
- Straight line, cubic ease-in-out, ≈ 0.35 s + distance / 1200 px·s⁻¹; arrives 0.25 s before the
  click; the click lands on the verb. No click ripple: the target's own pressed/active state is the
  feedback (use `ring: true` only for a special emphasis).
- Tooltips appear 330 ms after hover, vanish on click. Parked cursor drifts slightly, never freezes.

## Chapter grid
Enters on the first word of the chapter sentence; current tile flips (~270 ms) ≈0.45 s in and lands
lit (orange border + glow + 1.06x); done chapters stay flipped and dim; future tiles show serif
numerals; card lasts ~3.4 s and plays under the first words of the new section; hard cuts in/out.

## Text
Headlines are 1–4 words, serif, ~120 px on stage; labels Outfit SemiBold 44–50 px; never more than
~7 words on screen in one element; no em dashes; one accent word per headline at most.

## What NOT to do (AI-slop tells)
Generic line-art infographics where a real UI would be clearer; things sliding in from the edges;
bouncing everything; several accent colours; captions burned in; music under talking; visuals that
paraphrase instead of show; a cursor wandering with no narrated action; UI text too small to read
on a phone; the webcam tile covering what you point at.
