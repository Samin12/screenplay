# edit.yaml: the authoring format

The editing agent writes **one file**, `work/edit.yaml`. It says *what* happens and *on which word*.
`screenplay compile` turns it into `work/.screenplay/timeline.json` (frames, see `src/types.ts`),
which Remotion renders. The agent never writes milliseconds, frame numbers or animation code.

## Work directory

```
work/
  source.json        # {camera: "/abs/path/camera.mov", fps, width, height, duration}   (screenplay init)
  words.json         # source-time words: [{"i":0,"text":"Claude","start":0.12,"end":0.41}, ...]   (transcribe)
  cuts.yaml          # proposed cuts (screenplay cut), editable: - {from: s12, to: s30, why: retake}
  review.md          # ambiguous cut proposals for the agent to decide
  aroll.mp4          # the cut talking head, 1080p, loudness-normalised (screenplay aroll)
  aroll.json         # {duration, fps, segments: [{srcStart, srcEnd, outStart}], cuts: [outSeconds...]}
  face.json          # the head's path through aroll.mp4; the camera tile follows it (screenplay aroll / face)
  words.out.json     # output-time words after the cut: [{"id":"w0","text":"Claude","start":0.0,"end":0.29,"src":0}, ...]
  edit.yaml          # THIS FILE (the agent writes it)
  media/             # screenshots, recordings, logos used by the edit (paths in edit.yaml are relative to work/)
  .screenplay/       # build output: timeline.json, stills, sheets
```

Source-time word ids are `s<n>` (used only in cuts.yaml). Output-time word ids are `w<n>` (used in
edit.yaml, printed by `screenplay brief`).

## Anchors

Every `at:` / `until:` is an anchor:

| form | meaning |
|---|---|
| `w123` | the start of output word 123 (from `screenplay brief`) |
| `"the big one"` | the first occurrence of that phrase **inside the current scene** (case/punctuation-insensitive). `"the big one#2"` = second occurrence |
| `o:61.5` | output time in seconds |
| any of the above + ` +0.4s` / ` -1s` at the end | offset, e.g. `"type this prompt -1s"` or `w120 +0.5s` |

`at:` resolves to the **start** of the first word. `until:` resolves to the **end** of the last word of
the phrase (so a visual holds while the phrase is spoken). `hold: 2.5s` is the alternative to `until`.
Scene `at:` phrases are searched from the previous scene's start onward.

## Top level

```yaml
title: "Claude 2.0 in 17 minutes"
look: panel                  # panel (default, the house layout) | reference (the "Claude 2.0" full-frame layouts)
theme: velour                # velour (panel default) | ember-dark (reference default) | clay-light
camera:                      # how the talking head is cropped in tiles
  focus: [0.5, 0.42]         # face centre in the source frame, 0..1 (used when there is no face.json)
  zoom: 1.0                  # extra zoom for tiles
  mirror: false
  track: true                # false: hold `focus` even if the work dir has a face.json
chapters:
  heading: "11 Features"     # grid title (default: "<count> Features"); the logo tile sits after the number
  logo: true
  badge:                     # step badge above the tile (panel look)
    eyebrow: Tips            # "TIPS · 3 / 10"
    intro: "10 Opus 5.5 Tips"  # title before the first card (default: the heading)
  items:                     # each item inserts a chapter-grid card at its anchor: 2 s (panel), 3.4 s (reference)
    - { title: "Skills", icon: sparkles }          # no `at`: tile only, no card (earlier ones show as done, later ones as upcoming)
    - { at: "the big one", title: "Session rail", badge: "The Session Rail", icon: panel-right }  # `badge`: longer name for the step badge
    - { at: "keep all of your chats tidy", title: "Sections", icon: folder }
scenes: [ ... ]              # in time order; a scene lasts until the next one starts
```

`icon:` names are [lucide](https://lucide.dev/icons) names in kebab-case (`panel-right`, `folder`,
`git-branch`, `keyboard`, `sparkles`, `lightbulb`, `eye`, ...). Two extra names: `claude` (the orange
starburst tile) and `critter` (the pixel mascot).

## The panel look (default)

The house layout, the same in every section so viewers always know where to look: the creator in a
fixed tile on the right, the step badge above the tile, and **everything else in the left panel**, on a
dark drifting dot-grid canvas. Scenes never move the creator and never cover the tile. The one planned
break is a chapter switch: the card takes the full screen, then cuts back.

- `webcam:` only takes `full` (blur-morph to full frame, e.g. a closing shot with a device in hand) or
  `hidden`. Other modes are ignored with a warning.
- Stage scenes use the whole panel, `layout` is ignored. A headline alone sits in the middle.
- `talking` scenes draw their elements in the panel. With no elements they warn: the panel must never
  be empty. With `webcam: full` they behave as in the reference look.
- Replicas fill the panel and reflow into it. Coordinates like `lift ... to: [x, y]` are in the panel's
  viewport, 1400×990 (`src/theme/panel.ts`).
- Screen plates at another aspect (a 16:9 recording) sit on the panel as a framed card.
- Chapter cards take the full screen for 2 s on the bare canvas, over the tile and badge, with hard cuts
  in and out (no white flash). Speech carries on underneath. The badge shows the new chapter when the
  layout comes back.

## Scenes

Every scene has `kind` and `at`. Optional on every scene: `transition:` (`blur | cut | flash | fade`, how
this scene enters), and `webcam:` (above; in the reference look `full | pip | pip-right | pip-square |
hero | plug | hidden`, with `pip-right` for scenes that point at a left sidebar).

Reference-look defaults: `talking` → webcam `full`; `app` → `pip`; `stage` with layout `hero-left` → `hero`,
`center` → `pip`; `plug` → `plug`; `board` and chapter cards → `hidden`, and `plug` scenes `flash` in and
out. In both looks scene changes default to `blur` (0.33 s blur dissolve), chapter cards `cut`, and the
first scene is always `cut`.

### `kind: talking`: the talking head, with optional overlays (full frame in the reference look)

```yaml
- kind: talking
  at: w0
  dim: 0.7                   # how much the head darkens under overlays (default 0.7)
  elements:                  # stage elements (below), drawn over the head
    - { type: title, at: "Claude has just", until: "official tips", text: "Claude 2.0", sub: "by Anthropic", logo: claude, size: xl }
    - type: iconlist
      at: "several new features"
      until: "hidden functionalities"
      items:
        - { text: New features, icon: sparkles, at: "new features" }
        - { text: Official tips, icon: lightbulb, at: "official tips" }
        - { text: Hidden functionalities, icon: eye, at: "hidden" }
    - { type: lower, at: "my name is", hold: 3s, title: "Samin Yasar", sub: "Claude Club" }
```

### `kind: app`: a replica (or a real screenshot/recording) driven by a scripted cursor

```yaml
- kind: app
  at: "when you open the new Claude desktop app"
  app: claude-desktop        # replica id (screenplay replicas lists them, their targets and state keys)
  data: { ... }              # this video's fictional content, merged over the replica defaults
  state: { tab: code, rail: false }
  camera: { scale: 1.15, target: sidebar }   # initial framing; scale 1 = whole window
  beats:
    - { at: "switch to that tab", click: tab-code, set: { tab: code } }
    - { at: "show session rail", click: rail-toggle, tooltip: "Show session rail", set: { rail: true } }
    - { at: "set of cards", callout: rail, text: "Session rail", side: left, until: "environment card" }
    - { at: "environment card", lift: env-card, until: "Inside it" }
    - { at: "remote control button", click: remote-toggle, set: { remote: true }, ring: true }
    - { at: "this prompt on the screen -1s", type: composer, key: prompt, text: "Audit my memory files...", lift: true }
    - { at: "cards", explode: [env-card, context-card, connectors-card, outputs-card], labels: [Environment, Context, Connectors, Outputs], hold: 3s }
    - { at: "the composer", zoom: composer, scale: 1.35, until: "every time" }
    - { at: "pin it to the top", focus: pinned, hold: 2s }
    - { at: "this one", mark: row-3, style: ring }          # ring | marker | underline
    - { at: "side chats", title: "Side chats", hold: 2s }   # serif title over the dimmed app
    - { at: "press control", show: { type: keys, keys: [Ctrl, Alt, Space] }, hold: 2.5s }
    - { at: "go to settings", set: { view: settings } }    # hard state change, no cursor
    - { at: "hover", move: env-card, tooltip: "..." }
    - { at: "scroll down", tween: scroll, to: 420, until: "the results" }  # smooth numeric state change
```

One verb per beat: `click`, `move`, `type`, `set`, `tween`, `callout`, `lift`, `explode`, `focus`, `zoom`,
`mark`, `title`, `show`. The verb's value is the **target name** (or the payload for `title`/`show`/`set`).

| verb | extra fields | default hold | what it does |
|---|---|---|---|
| `click: t` | `set`, `tooltip`, `ring` | instant | cursor glides in (arrives 0.25 s early), presses on the word, then `set` applies |
| `move: t` | `tooltip` | instant | cursor glides to t and rests (hover state) |
| `type: t` | `key` (state key), `text`, `cps` (40), `lift` | until typed | cursor clicks t, text types into `state[key]` |
| `set: {..}` | | instant | hard UI state swap |
| `tween: key` | `to`, `from` | 1.2 s | eases a numeric state key (scroll positions: `scroll` on t3-code and browser, `chatScroll` and `sidebarScroll` on claude-desktop); targets re-measure when it ends |
| `callout: t` | `text`, `sub`, `side` (left/right/top/bottom, default right), `dim` (true) | 3 s | dot pops, line draws, label blurs in; rest of UI dims |
| `lift: t` | `scale`, `to: [x, y]` | 2.5 s | live enlarged clone flies toward the centre, UI dims to 38 % |
| `explode: [t..]` | `labels: [..]` | 3 s | several elements lift into a labelled row |
| `focus: t` | | 2.5 s | spotlight: everything but t dims |
| `zoom: t` | `scale` (1.35) | 3 s | camera pushes in, then returns at `until` |
| `mark: t` | `style` | 2 s | accent ring / marker / underline on t |
| `title: "Text"` | `sub` | 2.5 s | serif title over the dimmed app |
| `show: {element}` | | 2.5 s | any stage element over the dimmed app |

For a real screenshot or recording instead of a replica:

```yaml
- kind: app
  at: "here's the settings page"
  screen: media/settings.png     # or .mp4/.mov (add start: 12.5 to start the recording at 12.5 s)
  size: [2880, 1800]             # pixel size of the media
  tone: light                    # for light pages: markers and callouts switch to dark-on-light (default dark)
  targets:                       # named rectangles in media pixels: [x, y, w, h]
    remote-toggle: [2410, 512, 96, 54]
    connectors: [1980, 900, 820, 420]
  beats: [ ...same verbs, except set/type... ]
```

### `kind: stage`: concepts and proof, in the panel (reference look: big webcam left, diagram right)

```yaml
- kind: stage
  at: "it's important to differentiate"
  layout: hero-left           # reference look only: hero-left (default) | center (no big webcam)
  title: { text: Subagents, at: "sub-agents" }      # or just: title: Subagents (lands at scene start)
  elements:
    - type: flow
      at: "a one-way order"
      nodes: [ { text: Main session, icon: code }, { text: Subagent, icon: bot, at: "sub-agent" } ]
      arrows: [ { label: Prompt, tone: accent }, { label: Result, tone: good } ]
```

### `kind: plug`: sponsor/community plug (a palette break in the reference look, real pages in the panel look)

```yaml
- kind: plug
  at: "And by the way"
  media:
    - { src: media/skool-about.png, at: "And by the way" }
    - { src: media/skool-wins.png, at: "recent wins", scroll: [0, 1600], until: "pinned comment" }
```

### `kind: board`: world-canvas fly-through (cold opens)

```yaml
- kind: board
  at: "a master session"
  line: true                  # orange progress line drawn along the path as the camera travels
  nodes:
    - { at: "a master session", element: { type: tree, root: { text: Master session }, children: [ {text: Sales page}, {text: Emails}, {text: Ads} ] } }
    - { at: "build mods", element: { type: image, src: media/mod.png, caption: "Mods" } }
    - { at: "Google Docs", element: { type: tweet, name: ..., handle: ..., text: ... } }
```

Nodes are laid out automatically on a large canvas; the camera flies to each node on its `at`.

## Stage elements

Usable in `talking.elements`, `stage.elements`, `board.nodes[].element` and app `show:`. Every element
takes `at`, and `until` or `hold` (default: until the end of the scene; inside `show:` it is the beat's hold).
Items inside take their own `at` so each one lands on its word.

| type | fields |
|---|---|
| `title` | `text`, `sub`, `logo` (`claude` or an image path), `size` (`xl`/`l`/`m`) |
| `iconlist` | `items: [{text, icon, at}]`: big icon-tile rows (intro "what you'll get") |
| `bullets` | `title`, `items: [{text, at, icon?}]`: checklist rows that tick as they're said |
| `chips` | `items: [{text, icon, at, tone}]`: pills that pop in a row; `tone: good|bad` makes a status pill with a ✓/✗ badge |
| `flow` | `nodes: [{text, icon, at}]`, `arrows: [{label, tone, at}]` (accent = outgoing, `good` = returning), `direction: row|loop` |
| `tree` | `root: {text, icon}`, `children: [{text, icon, at}]`: orchestrator fan-out with bezier connectors |
| `compare` | `columns: [{title, icon, at, highlight, highlightAt, rows: [{text, tone: good|bad, at}]}]`; `highlightAt` lands the column highlight on a word |
| `counter` | `value`, `prefix`, `suffix`, `decimals`, `label`: counts up |
| `stat` | `items: [{text: "1M", sub: "tokens", at}]` |
| `keys` | `keys: [Ctrl, Alt, Space]`, `label`, `press` (anchor; default the element's at) |
| `table` | `columns: [..]`, `rows: [{label, cells: [..]}]`, `highlight: {column, at}` (0-based). Cells: `✓`/`yes` tick, `✗`/`no` cross, `Beta`/`Not yet` badges, `\n` sub-line |
| `tweet` | `name`, `handle`, `avatar`, `text`, `meta`, `mark: {phrase, at}`, `sticker: {text, at}`, `label: {text, at}` |
| `sticker` | `text`, `rotate` |
| `image` | The proof card. `src` (image or video; video plays muted from `start` seconds when it lands), `url` (browser bar with the real address), `crop: [x, y, w, h]` (media px: show one paragraph, enlarged), `caption`, `source` (`"domain · captured Oct 16, 2026"`), `size: [w,h]` (read from the file if omitted), `highlight: {x, y, w, h, at, style}` or a list, each mark on its own word, in media px. `style`: `marker` (panel default), `box`, `ring` (also dims the rest; reference default) |
| `prompt` | `text`, `label`, `cps`: a prompt card that types on |
| `grid` | `count`, `columns`, `lit: [{index, at}]`, `label`: e.g. "20 most recently active" (a leading number renders big) |
| `quote` | `text`, `by`, `mark: {phrase, at}` |
| `lower` | `title`, `sub`: lower third (talking scenes) |
| `cta` | `text`, `sub`, `icon`: "In the description below" style call to action |

In text fields, `*word*` draws that word in the accent colour.

## Rules the checker enforces

- Every anchor resolves; phrases must be found inside their scene (warning if only found elsewhere).
- Every `app` target exists in the replica (or in `targets:` for screen plates).
- No visual shorter than 1.2 s (warning) and no stretch longer than 6 s without a visual change (warning).
- Hero stages shorter than 3 s (warning, reference look): the webcam morph eats them.
- Talking scenes with nothing to show (warning, panel look): an empty panel.
- No em dashes in on-screen text. Headlines under ~7 words.
- Media files exist.
