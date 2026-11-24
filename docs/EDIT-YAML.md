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
    introEyebrow: "Level 2"  # replaces the word "INTRO" above that title (default: Intro). With `badge` set and no item anchored (`at`), this intro badge stays up for the whole video
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
| `tween: key` | `to`, `from` | 1.2 s | eases a numeric state key (scroll positions: `scroll` on t3-code, browser and telegram, `chatScroll` and `sidebarScroll` on claude-desktop); targets re-measure when it ends |
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
  screen: media/settings.png     # or .mp4/.mov (add start: 12.5 to start the recording at 12.5 s, or start: auto, below)
  size: [2880, 1800]             # pixel size of the media
  tone: light                    # for light pages: markers and callouts switch to dark-on-light (default dark)
  targets:                       # named rectangles in media pixels: [x, y, w, h]
    remote-toggle: [2410, 512, 96, 54]
    connectors: [1980, 900, 820, 420]
  blur:                          # optional privacy blurs, media pixels (frosted, carried into zooms and lifts)
    - [0, 300, 560, 1900]                                   # the whole scene
    - { rect: [2196, 398, 230, 52], at: "hit this button", until: "last 30 days" }   # or hold: 2s
  beats: [ ...same verbs, except set/type/tween... ]
```

**The real screen, synced to the voice.** When the creator is showing his screen, show the whole
recording playing in sync, not a cropped screenshot with a slow zoom. Re-time the screen recording to
output time first (one frame per output frame, the same cut as `aroll.json`: for each segment, the
screen frames for `[srcStart, srcEnd]`), then use it with `start: auto`:

```yaml
- kind: app
  at: "if you just hit this button"
  screen: media/screen-out.mp4   # the screen recording re-timed to the cut (output time)
  size: [3612, 2648]             # the RECORDING's pixels: targets and blurs stay in them even if the
                                 # re-timed file is a lighter encode (it is stretched to `size`)
  start: auto                    # seek to this scene's own output start: frame T shows the screen at word T
  tone: light
  targets: { usage-popup: [1990, 60, 640, 2240], total: [2040, 120, 300, 240] }
  beats:
    - { at: "spent this much money", callout: total, text: "30-day spend", side: left, until: "most of it" }
    - { at: "my Grok", mark: usage-popup, style: ring, hold: 2s }
```

`start: auto` = `start: <the scene's output start>`; it follows the scene if a chapter card pushes or
splits it, and re-timing after a cut change needs no edit.yaml change. The plate fills the panel as
the whole window (scale 1 = the full screen; a plate at another aspect sits on the panel as a framed
card, flush to its height), and `callout`, `mark`, `focus`, `zoom`, `lift` and `explode` all work on
the moving recording (targets are fixed rects, so point them at things that hold still while they
show). Use a short-GOP encode (a keyframe every 30 frames) so `<OffthreadVideo>` seeks fast.

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
| `story` | `title`, `actors: [{id, kind, x, y, ...}]`, `beats: [{at, <verb>: id, ...}]`: an analogy acted out by illustrated props, people and numbers (below) |

In text fields, `*word*` draws that word in the accent colour.

### Stories (`type: story`): analogies as little animated scenes

When he explains with an analogy (a taxi meter, a law firm, a call center), don't put the words on
screen: **act it out**. A story is a small stage (1400×990, the panel's viewport) with **actors** on it
and **beats** that move them, each on a spoken word. Write it like stage directions; the engine does
the drawing, the timing and the motion (blur-in entrances, one terracotta accent, cubic ease-in-out,
only stickers bounce). It usually fills a whole `stage` scene.

```yaml
- kind: stage
  at: "Think of your session"
  elements:
    - type: story
      title: "Your session is a *taxi meter*"      # optional; fades while the camera is pushed in
      actors:                                     # x, y = centre of the drawing, story px (0..1400, 0..990)
        - { id: road, kind: path, from: [40, 742], to: [1360, 742] }
        - { id: cab, kind: taxi, x: 300, y: 572, value: 2.5 }          # meter starts at $2.50
        - { id: you, kind: person, x: 650, y: 586, label: You, color: accent }
        - { id: jam, kind: car, x: 1130, y: 660, scale: 0.8, at: "sitting in traffic" }   # waits for its word
        - { id: traffic, kind: badge, x: 1130, y: 450, text: "Stuck in traffic", icon: clock, at: "sitting in traffic" }
        - { id: office, kind: building, x: 1225, y: 528, label: Done, at: "By the end" }
        - { id: wow, kind: sticker, x: 1010, y: 330, text: "Way bigger!", at: "way bigger" }
      beats:
        - { at: "The moment you get in", move: you, to: cab, offset: [60, 0], hold: 0.7s }
        - { at: "get in", exit: you }
        - { at: "meter starts running", count: cab, to: 48.6, ease: linear, until: "than you expected" }
        - { at: "Every message", move: cab, to: [700, 572], until: "keeps charging" }
        - { at: "message you send", say: cab, text: "Fix this bug" }
        - { at: "keeps charging", say: cab, text: "One more thing", hold: 1.4s }
        - { at: "By the end", exit: traffic }
        - { at: "By the end", move: jam, by: [700, 0], hold: 0.8s }
        - { at: "of the ride", move: cab, to: [850, 572], hold: 1s }
        - { at: "the fare", follow: cab, scale: 1.5 }
        - { at: "way bigger", pulse: cab }
```

**Actors.** Every actor has `id` and `kind`; most have `x, y`. Common fields: `label` (34 px, under the
drawing), `role` (a smaller second line), `color` (`accent good bad info warn muted` or `#hex`; the
body of a person or car, the tint of an icon or badge), `scale`, `rotate`, `flip` (face left), `at`
(the word it appears on; without `at` it is there when the story appears), `enter: pop`. Actors
without `x` share the width evenly; without `y` they stand at 520. Later actors draw on top.

| kind | what it draws | own fields |
|---|---|---|
| `person` | a friendly figure (head and shoulders), shirt in `color` | `wear: tie \| headset \| glasses` |
| `car`, `taxi` | side view, wheels turn as it moves; the taxi has a TAXI sign and a fare meter | taxi: `value`, `prefix` ($), `decimals` (2), `suffix` |
| `plane`, `tower` | airliner (tail in `color`), control tower with a blinking light | |
| `building`, `office` | tall building with lit windows; office with a sign | office: `text` (the sign) |
| `document` | a page (more sheets behind it when `pages` > 1) with a page-count tag | `pages`, `title` (on the page) |
| `stack` | a pile of paper that grows and shrinks with its count | `count` (number in the tag), `text` ("docs") |
| `monitor`, `phone` | a screen showing `text`, a lucide `icon`, or placeholder UI | `text`, `icon` |
| `notebook`, `drawer`, `headset` | spiral notebook; an open drawer full of gadgets; a headset | notebook `title`; drawer `icons: [..]`, `open` |
| `icon` | a lucide icon (or `claude`) on a rounded tile | `icon`, `size` (150), `tile: false` |
| `text` | a line of text (`*word*` = accent) | `text`, `size` (48), `w` (wrap width) |
| `box`, `card` | a card: icon + title, and `lines` as bullets | `title` or `text`, `lines`, `icon`, `w` |
| `counter` | a big accent number | `value`, `prefix`, `suffix`, `decimals`, `size` |
| `meter` | a bar (default) or `style: dial` gauge, in % | `value` (0..100), `style`, `w` |
| `image` | a picture from the work dir | `src`, `w`, `h` |
| `arrow`, `path` | a line between two actors (or `[x, y]` points) that draws on; paths are dashed, no head | `from`, `to`, `label`, `curve` (-1..1), `dashed` |
| `bubble` | a speech bubble that stays on an actor | `on`, `text`, `style: speech \| thought`, `side` |
| `badge`, `sticker` | a pill (pops in); the rotated accent sticker | `text`, badge `icon`, sticker `size` |

**Beats.** One verb per beat; the verb's value is the actor id. `at` is any anchor (phrases are found
from the story's start, `w123`, `o:12.5`, `±1s`); a beat without `at` happens as the story appears.
`until` / `hold` set how long it lasts.

| beat | extra fields | default length | what happens |
|---|---|---|---|
| `enter: id` | `style: blur \| pop`, `pos: [x, y]` | | blurs (or pops) in, at `pos` if given; arrows draw on |
| `exit: id` | | | blurs out |
| `move: id` | `to: [x, y]` or `to: <actor>` (+ `offset: [dx, dy]`), or `by: [dx, dy]` | 0.9 s | glides there, cubic ease-in-out; cars turn their wheels |
| `say: id` | `text`, `style: thought`, `side` | 2.5 s, or until its next `say` | a speech bubble above the actor (or `side: left/right/bottom`) |
| `count: id` | `to`, `ease: linear \| smooth` | 1.2 s | counter, taxi meter or stack counts to `to` (`linear` for a meter that keeps running) |
| `fill: id` | `to` (0..100) | 1 s | a meter fills to `to` % |
| `connect: a` | `to: b`, `label`, `curve`, `dashed`, `color` | until the end | an arrow from a to b draws on (and leaves at `until`) |
| `draw: id` | | | an `arrow` / `path` actor draws on (same as `enter`) |
| `highlight: id` | | 2 s | accent ring and glow around the actor and its label |
| `pulse: id` / `shake: id` | | 0.6 s / 0.5 s | a quick swell with a ring / a quick no-no shake |
| `swap: id` | any of `text label role title lines icon color pages count value open` | | changes those fields (a new label, a busy line turns red) |
| `follow: id` | `scale` (1.6), or `follow: [x, y, w, h]`, or `follow: all` | until the next `follow` (or `until`) | the camera pushes in on the actor (tracking it if it moves) or region; `all` = the whole stage |
| `dim: id` or `dim: [ids]` | | 2.5 s | everything else dims to ~30 % |

Tips: design on the 1400×990 grid (props draw ~1.35× their nominal size: a person is ~230×310, a
taxi ~445×340); put the ground under the wheels and feet, with labels below it; keep actors that appear
during a `follow` near its target (the push-in crops the rest); one idea per beat, a beat every 1–2 s.


## Rules the checker enforces

- Every anchor resolves; phrases must be found inside their scene (warning if only found elsewhere).
- Every `app` target exists in the replica (or in `targets:` for screen plates).
- No visual shorter than 1.2 s (warning) and no stretch longer than 6 s without a visual change (warning).
- Hero stages shorter than 3 s (warning, reference look): the webcam morph eats them.
- Talking scenes with nothing to show (warning, panel look): an empty panel.
- No em dashes in on-screen text. Headlines under ~7 words.
- Media files exist.
- Stories: unknown actor kinds, duplicate ids and beats or arrows that name a missing actor are errors; a beat
  on an actor that is off stage is a warning. A story counts as changing on each beat and while something
  in it moves, counts or fills.
