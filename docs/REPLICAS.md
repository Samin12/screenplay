# Replicas: code-built copies of apps

The "screen recordings" in a screenplay video are not recordings. They are **replicas**: React
components that redraw an app's UI with fictional data, at a fixed design size. Because every
pixel is code, the edit can click, type, open menus, lift a card out of the window, dim everything
else and zoom, all landing on the exact word, and the data is always clean and on-brand.

Library: `src/replicas/` (registry in `src/replicas/index.ts`).

| id | what | design size |
|---|---|---|
| `claude-desktop` | Claude desktop app, dark, macOS chrome (or Windows) | 1920x1080 |
| `terminal` | Claude Code CLI in a macOS Terminal window | 1920x1080 |
| `browser` | Chrome-like window: screenshot or simple page blocks | 1920x1080 |
| `_fixture` | minimal example used by tests | 1920x1080 |

---

## 1. The contract

`src/app/replica.ts`:

```ts
type ReplicaProps = { data; state; ui: { hover?, pressed?, caret?, frame, fps } };
type ReplicaDef = {
  id, title, size: [w, h], tone: 'dark' | 'light',
  component,                       // React.FC<ReplicaProps>
  defaults: { data, state },       // rich fictional defaults
  targets: { name: 'what it is' }, // every pointable element (docs for the editing agent)
  stateDoc: { key: 'values' },     // every state key
};
```

Rules (Remotion renders frames out of order, in several tabs):

1. **Pure function of `(data, state, ui)`.** No `useState`, `useEffect`, timers, CSS
   transitions/animations, `Date.now()` or randomness. Anything that moves (spinners, carets) reads
   `ui.frame`. `caretOn(ui, key)` gives the shared blink.
2. **`data`** = the content of this video (sessions, messages, files). **`state`** = what clicks
   change (panel open, toggle on, active tab, typed text). The engine merges `plate.data` over
   `defaults.data` (shallow; our replicas also merge one level deeper for nested objects, see
   `mergeData` in `_shared/kit.tsx`), and scene `state` + `set:` actions over `defaults.state`.
3. **Every element the narration might point at carries `data-target="name"`.** Names are the
   replica's public API. List them in `targets`; patterns use `<id>`, `<slug>`, `<n>`.
   - `<slug>` = label lower-cased, non-alphanumerics to `-` ("Memory files" -> `memory-files`).
   - `<n>` is 1-based.
   - First match wins if a name repeats.
4. **Interactive styling** comes from `ui`: `isHover(ui, t)`, `isPressed(ui, t)` (or the `fill()`
   helper in `_shared/kit.tsx`). The cursor sets hover on arrival and pressed for ~5 frames on click.

### How the engine uses targets

- `src/app/Measure.tsx` renders the replica invisibly **once per state boundary** (frame 0 and every
  `click`/`set` that changes state) and measures every `[data-target]` in design pixels. Typing is
  measured with its final text, so a lifted composer is sized for the whole prompt.
- A target that only exists in a later state (a menu item) falls back to the nearest boundary that
  has it, so the cursor can travel to it as it opens.
- **cursor** goes to the target's centre (slightly down-right). **callout** anchors on a side
  midpoint. **focus/callout dim** cuts a rounded hole of the rect. **zoom** centres the camera on the
  rect. **lift/explode** clone a rectangular crop of the plate at that rect and fly it to centre.

Consequences for replica authors:

- A target's box should **hug what it names**. A full-width line can't be magnified (the clone is
  wider than the frame). Put the target on an inner `inline-flex` box (see terminal lines).
- A target must be **inside the plate** to lift cleanly (the clone crops the plate; anything off
  the 1920x1080 canvas is black). Clamp popovers to the window, keep default content on screen.
- Clones are rectangles of the whole plate: lifting a non-rectangular union (menu + submenu) shows
  the app in the empty corner. Lift the parts separately.
- Overlays (menus, modals) must render at window level with explicit coordinates computed from
  layout constants (see `sidebarRowTops` in `claude-desktop/Sidebar.tsx`), never measured.

---

## 2. `claude-desktop`

Files: `src/replicas/claude-desktop/` (`tokens.ts` palette + grid, `defaults.ts` fictional data,
`types.ts` schemas, `TitleBar`, `Sidebar`, `Chat`, `Rail`, `Menus`, `ClaudeDesktop`, `index.ts`).

UI at ~1.5x real size: body 23 px Inter, row pitch 58, sidebar 364, title bar 60, rail 492, chat
column max 1288. Palette sampled from the reference: main `#181818`, sidebar `#1f1f1f`, selected row
`#3d3d3d`, bubble `#2a2a2a`, composer `#303030`, menus `#262626`, card hairline `#272727`, toggle
blue `#4d79d3`, Claude orange `#d97757` (logo, send button, Remote Control icon only).

### data

| key | shape |
|---|---|
| `chrome` | `'mac'` (traffic lights, default) or `'windows'` (hamburger + min/max/close; shortcuts spelled `Ctrl+`) |
| `user` | `{name, plan, initial}`: footer "Samin · Max" |
| `nav` | `[{label, icon}]` lucide names; default New / Search / Artifacts / Scheduled / Customize |
| `pinned` | `[Session]` |
| `sections` | `[{name, sessions: [Session]}]` |
| Session | `{id, title, status?: 'working' (spinner) \| 'done' (grey dot) \| 'unread' (blue dot) \| 'waiting' (warning), icon?: 'code'\|'chat'\|'none', children?: [Session], collapsed?}`; children indent under the parent with a tree guide |
| `messages` | chat shown for the active session (unless `chats` has an entry for it) |
| `chats` | `{ '<session id>': [Message] }` |
| Message | `{role: 'user'\|'assistant', text}` (text supports `` `code` ``, `**bold**`, `*dim*`); `{kind: 'activity', text, open?, items?}` "Read 6 files, ran 3 commands ›"; `{kind: 'steps', items: [{text, status: done\|active\|pending\|failed, sub?: {name, status}}]}`; `{kind: 'sessions', text: 'Started 2 sessions', open, items: [{title, status}]}`; `{kind: 'notice', text, icon?}`; `{kind: 'table', columns: [3], rows: [{cells: [3], bar?: 0..1, on?: bool, tone?: muted\|warn\|good\|bad}], footer?: [label, value]}` (skill-doctor card); `{kind: 'checklist', title, items: [{text, sub?, status: ok\|warn\|bad, note?}]}`; `{kind: 'thinking', text?}` |
| `model`, `effort`, `mode` | "Opus 5.5" "High", "Auto" under the composer |
| `placeholder`, `greeting` | composer placeholder (code tab), empty-state greeting |
| `environment` | `{location, folder, drive}` |
| `context` | `{pct, used, total, rows: [{label, size, pct, color?, dotted?}]}` (first 4 rows unless `state.contextFull`) |
| `connectors` | `[{name, letter, status}]` ("Authenticate" draws amber) |
| `outputs` | `[{name, meta, icon}]` |
| `commands` | `[{name, desc}]` slash-command catalogue |
| `menu`, `moreMenu` | menu items: `'-'` separator, `{label, key?, sub?: [..], danger?}` |
| `settings` | `{nav: [..], pages: {'Claude Code': [{label, desc?}]}}` |
| `ribbon`, `agents` | usage ribbon and Agents panel content |
| `windowTitle` | title bar text when `state.active` is not a known session |

### state

| key | values |
|---|---|
| `tab` | `'code'` (default) \| `'chat'` |
| `active` | session id (selected row, window title, chat). `null` = empty chat with greeting |
| `rail` | session rail open |
| `remote` | Remote Control switch |
| `prompt` | composer text; type with `key: prompt` |
| `menu` | `null` \| `{for: '<session id>' \| 'tool-more', hover?: 'Move to section', items?, placement?: below\|above\|right}`. Opens below the row, flips above if it would not fit, clamps to the window. `hover` opens that item's submenu |
| `view` | `'chat'` \| `'settings'` (modal) |
| `settingsPage`, `toggles` | settings page, `{ '<slug of label>': true }` |
| `slash`, `slashHover` | `['output-style', 'doctor', '-', 'insights']` popover above the composer; highlighted name |
| `append` | messages appended to the chat (after "send": `set: {prompt: '', append: [{role: user, text: ...}]}`) |
| `upto` | show only the first N messages (reveal step by step) |
| `sidebar`, `sidebarScroll` | sidebar visible; scroll the session list by px |
| `contextFull` | all Context rows |
| `ribbon` | usage ribbon above the composer |
| `panel` | `'agents'`: Agents side panel |

### targets

Title bar: `title`, `sidebar-toggle`, `back`, `forward`, `tab-chat`, `tab-code`, `rail-toggle`,
`tool-terminal`, `tool-diff`, `tool-preview`, `tool-files`, `tool-more` (`app-menu` on Windows).
Sidebar: `sidebar`, `nav`, `nav-<slug>`, `pinned`, `section-pinned`, `section-<slug>`,
`group-<slug>` (whole section), `session-<id>`, `more-<id>` ("..." on a row), `user`, `debug`.
Chat: `main`, `chat`, `messages`, `msg-<n>`, `step-<n>`, `subsession-<n>`, `table-row-<n>`,
`table-toggle-<n>`, `check-<n>`, `greeting`, `composer`, `attach`, `send` (mic when empty, orange
arrow with text), `mode-picker`, `model-picker`, `context-ring`, `slash`, `slash-<slug>`, `ribbon`,
`ribbon-week`, `ribbon-window`, `ribbon-cache`.
Rail: `rail`, `env-card`, `env-location`, `env-save`, `env-folder`, `env-remote`, `remote-toggle`,
`context-card`, `context-used`, `context-bar`, `context-<slug>`, `connectors-card`,
`connector-<slug>`, `outputs-card`, `output-<n>`.
Overlays: `menu`, `menu-item-<slug>`, `submenu`, `submenu-item-<slug>`, `settings`,
`settings-nav-<slug>`, `setting-<slug>`, `toggle-<slug>`, `agents`, `agents-stats`, `agent-<n>`.

```yaml
- kind: app
  at: "open the session rail"
  app: claude-desktop
  state: { rail: false }
  beats:
    - { at: "show", click: rail-toggle, tooltip: "Show session rail", set: { rail: true } }
    - { at: "set of cards", explode: [env-card, context-card, connectors-card, outputs-card], labels: [Environment, Context, Connectors, Outputs] }
    - { at: "remote", click: remote-toggle, set: { remote: true }, ring: true }
    - { at: "right click", click: more-orchard, set: { menu: { for: orchard } } }
    - { at: "move it", set: { menu: { for: orchard, hover: "Move to section" } } }
    - { at: "type slash", set: { slash: [output-style, doctor, skill-doctor], slashHover: doctor, prompt: "/" } }
```

### Video inside a replica

Replicas may play real footage (a video player in the UI). The engine renders one invisible copy per
UI state to measure targets, so skip the video there: `ui.measuring ? null : <OffthreadVideo .../>`.
`t3-code` does this for `{kind: video, video: media/clip.mp4, poster: ...}` messages.

## 3. `terminal`

data: `title`, `header` (`{title, lines, tips}` orange welcome box, `null` hides it), `lines`
(`[{kind, text}]`, kinds `prompt` (grey band, `>`), `out` (white ⏺), `text` (continuation), `tool`
(green ⏺, `Name(args)` with bold name), `ok`/`err`/`dim` (`⎿` result line), `blank`), `commands`,
`status: {left, right}`, `anchor: 'top' | 'bottom'` (bottom = long session, newest lines at the
input box).

state: `prompt` (block caret while typing), `slash` + `slashHover` (list under the input, purple
selection), `upto`, `append`, `thinking` (orange spinner line), `mode: normal | plan | accept`.

targets: `window`, `titlebar`, `header`, `scrollback`, `line-<n>` (hugs its text), `thinking`,
`composer`, `status`, `slash`, `slash-<slug>`.

## 4. `browser`

data: `theme: dark | light` (Chrome frame), `tabs: [{title, icon, color}]`, `url`,
`page: {image?, imageHeight?, blocks?, theme?: {bg, text, muted, accent, card, line, serif}}`.
`page.image` is a path in the work dir (`staticFile`). Blocks: `nav {brand, links, cta}`,
`hero {kicker, title, sub, button, secondary, image, align}`, `heading {text, sub}`, `p {text}`,
`cards {items: [{tag, title, text, price, image}], columns}`, `button {text, secondary}`,
`image {src, height, caption}`, `stats {items: [{value, label}]}`, `quote {text, by}`.
Keep the default page within the window (about 880 px of page height) so every block can be lifted.

state: `tab` (0-based), `url` (type with `key: url`), `scroll` (px), `urlSelect` (blue selection
on a substring, e.g. `shared`), `loading`.

targets: `window`, `tab-<n>`, `new-tab`, `nav-back`, `nav-forward`, `nav-reload`, `address`,
`profile`, `page`, `block-<n>`, `block-<n>-cta`, `block-<n>-button`, `block-<n>-secondary`,
`block-<n>-card-<k>`, `block-<n>-stat-<k>`.

---

## `t3-code`

T3 Code (sidebar of projects and threads, chat column, inline video player), built from a real screen
recording. Run `screenplay replicas t3-code` for its targets, state keys and data shape. Has
`state.scroll` for `tween`.

## 5. Building a new replica from screenshots

Goal: a viewer on a phone believes it is a screen recording, and every element the narration
mentions has a target.

1. **Collect references.** 2 to 6 screenshots of the real app in the states the video needs
   (default, menu open, modal, typing). Save them as data next to your notes; never ship them.
2. **Pick the design size and scale.** Use 1920x1080 and draw the UI at **~1.5x real size** (body
   text 22 to 24 px, row pitch ~58 px). If the screenshot is a 2x Retina capture at 2880x1800,
   multiply its pixel measurements by 1920/2880 x 1.5 ≈ 1.0, i.e. measure on a 1440-wide copy and
   scale by 1.33.
3. **Measure, don't guess.** With PIL or any image tool: sample backgrounds, hairlines, selected
   and hover fills, text and muted text colours; measure bar heights, sidebar width, paddings, row
   pitch, radii, icon sizes. Write them into a `tokens.ts` (palette `C`, layout grid `L`). Match the
   type scale x1.5 (13 px label -> ~20 px; 15 px body -> ~23 px). Inter stands in for SF/Segoe
   (use `letterSpacing: -0.01em` to match Segoe widths); JetBrains Mono for code; Newsreader serif.
4. **Scaffold the folder:** `src/replicas/<id>/` with `tokens.ts`, `types.ts` (data + state
   shapes), `defaults.ts` (rich, coherent fictional data: Orchard Lane Coffee, Saltmarsh Swim,
   Tidewell Pet Co, Hearthbook, user "Samin · Max"), one file per region, `index.ts` exporting the
   `ReplicaDef`. Register it in `src/replicas/index.ts`. Reuse `_shared/kit.tsx` (`Ico` lucide icons,
   `TrafficLights`, `WinControls`, `Switch`, `Spinner`, `Ring`, `ClaudeStar`, `Inline`, `Caret`,
   `fill`, `slug`, `mergeData`).
5. **Lay out with real CSS** (flex/grid), root `position: relative; overflow: hidden` at the design
   size. Overlays (menus, modals, popovers) at window level with coordinates computed from the same
   constants the layout uses; clamp them inside the window.
6. **Name targets for every narrated element**: each button, row, card, field, menu item, plus
   group targets for "this whole section" moments. Make them hug content. Use `<slug>`/`<id>`/`<n>`
   patterns from data so new data gets targets for free. Document all of them in `targets`, and every
   state key in `stateDoc`.
7. **Drive every visual change from `state`.** Hover/pressed via `isHover`/`isPressed`. Carets via
   `caretOn(ui, key)`. Spinners via `ui.frame`. No transitions: the engine handles motion.
8. **Write a test timeline** `examples/tests/replica-<id>.json` (`{"timeline": ...}`, see
   `src/sample.ts`) that exercises: click with `set`, callout, lift, explode, type with lift, zoom,
   focus, mark, and each overlay state.
9. **Render stills and compare side by side with the screenshots:**
   `npx remotion still src/index.ts Main /tmp/sp-replica/<id>-<frame>.png --frame=<N> --props=examples/tests/replica-<id>.json --log=error`.
   Stack reference and render (PIL, half size) and check the list below. Iterate.
10. `npx tsc --noEmit`.

### Fidelity checklist

- [ ] Backgrounds, hairlines, selected/hover fills match the sampled hexes (within ~2 levels).
- [ ] Text widths within ~3% of the reference (font size, weight, tracking).
- [ ] Row pitch, paddings, radii, icon sizes and stroke weights match measurements.
- [ ] Truncation behaves like the app (fade vs ellipsis), long labels don't push icons out.
- [ ] Accent colour used only where the app uses it.
- [ ] Every narrated element has a target; targets hug their content; nothing important off-plate.
- [ ] Menus/popovers stay inside the window in every state you use.
- [ ] Cursor lands on the right spot; callout dots sit on the element edge; lifts and explodes show
      clean, fully on-plate crops; zoom framing keeps the subject in view (for very wide targets
      zoom with a `rect:` anchored where the action is).
- [ ] Default data reads as one coherent fictional world, no lorem ipsum, no real customer data.
- [ ] No `useState`/`useEffect`/transitions/timers; deterministic for any frame.
