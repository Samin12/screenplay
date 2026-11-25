# Replicas: code-built copies of apps

The "screen recordings" in a screenplay video are not recordings. They are **replicas**: React
components that redraw an app's UI with fictional data, at a fixed design size. Because every
pixel is code, the edit can click, type, open menus, lift a card out of the window, dim everything
else and zoom, all landing on the exact word, and the data is always clean and on-brand.

Library: `src/replicas/` (registry in `src/replicas/index.ts`).

| id | what | design size |
|---|---|---|
| `claude-desktop` | Claude desktop app, dark, macOS chrome (or Windows); `data.theme: light` / `data.preset: samin` = Samin's real light setup | 1920x1080 |
| `terminal` | Claude Code CLI in a macOS Terminal window | 1920x1080 |
| `browser` | Chrome-like window: screenshot or simple page blocks | 1920x1080 |
| `openusage` | OpenUsage menu-bar strip + panel (spend ring, limit bars, Accounts, Add Account, Settings), light | 1920x1080 |
| `finder` | macOS Finder window, light: sidebar, toolbar, icon and list view, real thumbnails, new folder, rename, drag and drop | 1920x1080 |
| `telegram` | Telegram Desktop forum group (topic tabs, chat list) or the same chat on an iPhone (`state.view: phone`), dark | 1920x1080 |
| `_fixture` | minimal example used by tests | 1920x1080 |

---

## 1. The contract

`src/app/replica.ts`:

```ts
type ReplicaProps = { data; state; ui: { hover?, pressed?, caret?, frame, fps, changes? } };
type ReplicaDef = {
  id, title, size: [w, h], tone: 'dark' | 'light',
  component,                       // React.FC<ReplicaProps>
  defaults: { data, state },       // rich fictional defaults
  targets: { name: 'what it is' }, // every pointable element (docs for the editing agent)
  stateDoc: { key: 'values' },     // every state key
  resolveData?: (plateData) => data, // optional: presets/themes (default: {...defaults.data, ...plateData})
  toneOf?: (data) => 'dark' | 'light', // optional: tone that depends on the data (a light theme)
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

### The "Recreated" stamp stays readable when the camera pushes in

Replicas with a `stamp` target (`claude-desktop` light, `finder`) draw `data.stamp` as an amber pill
in their title bar. When `camera: {scale, target}` or a `zoom` beat pushes in far enough that the pill
leaves the view, the engine pins the same pill to the top right of the view, fading it in exactly as
much as the window's own pill is cut off, so a recreated window is never shown without its stamp.
Nothing to set: it follows `data.stamp`. A new replica gets this by giving its pill `data-target="stamp"`.

```yaml
- kind: app
  app: claude-desktop
  layout: full
  data: { theme: light, stamp: Recreated }
  camera: { scale: 1.6, target: composer }       # pushed in: the stamp is pinned top right
  beats:
    - { at: "type the prompt", zoom: composer, scale: 1.35, until: "send it" }   # or only for a beat
```

### Cards over a window: `show:` with `fit: wide`

`show:` puts a stage element over the dimmed window. Add `fit: wide` to the beat when the card should
fill the frame (an image at 16:9 or wider covers about 95% of the scene's width; without it image cards
stop at 1.4 times their own pixels inside an inset box):

```yaml
    - { at: "the plan", show: { type: image, src: media/storyboard.png, size: [1280, 720] }, fit: wide }
```

### Replicas on the whole frame

`layout: full` on the scene draws the window on the whole frame with no tile, 1.25 times bigger than
its design size (`ui:` changes that). See "Three layouts" in `docs/EDIT-YAML.md`. A `steps` strip with
`band: true` sits above the window instead of over its title bar.

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

### Light theme: Samin's real setup (`data.theme: light`, `data.preset: samin`)

`data.theme: light` draws the app the way Samin actually runs it: Claude Desktop in light mode, Code
tab, vibrancy sidebar, flat session rail (Environment / Context / Connectors / Changes), his composer
and model line. `data.preset: samin` also loads **his** content (project `ai-youtube-course`, his
session list, `Samin · Ultra`, Sonnet 5.5 Medium, context 10%, "3 to reconnect", +3,401 −218,
the "hi" chat) and implies the light theme. The dark theme is unchanged and stays the default.

```yaml
- kind: app
  app: claude-desktop
  data: { preset: samin }            # or { theme: light } for the fictional agency world in light
  state: { active: new-session, rail: true }
```

Built from his screen recording (`media/screen/*.png`, raw .mov frames): his window (3724 retina
px incl. ~52 px off-screen) fills the 1920 plate, so the UI is the same size as his screen shown
full-width; the 16:9 plate just shows fewer sidebar rows. SF Pro via `BlinkMacSystemFont` (Inter
elsewhere), sizes from his cap heights, `letter-spacing: 0.022em` to match his zoomed line widths.
Files: `src/replicas/claude-desktop/light/` (`tokens.ts`, `Chrome.tsx` title bar + sidebar + rail,
`Chat.tsx` messages + composer + slash popover + model menu, `Overlays.tsx` dialog + user menu +
Settings, `LightDesktop.tsx`), presets in `presets.ts`. Every scene `data:` key still overrides
(nested objects merge), e.g. `{preset: samin, model: "Opus 5.5", context: {pct: 51}}`.

Extra **data** (light): `theme`, `preset`, `menubar` (macOS menu bar strip), `environment.branch`,
`changes: {added, removed}` (null hides Changes), `connectorsNote` ("3 to reconnect"), `models`
(`[{name, key}]` model menu), `efforts` (Effort submenu), `commands[].tag` ("Custom command") and
`.hint` (`[auto|<tokens>]`), `settings.nav` items may be `{label, group, icon}` and rows
`{label, desc, on, control: switch|select|input, value, section, indent}`.

Extra **messages** (light): `{kind: meta, text, link}` ("Started on this computer · ai-youtube-course
· Save as environment"), `{kind: notice, text}` ("Claude Code notice ▸"), `{kind: context, used?,
total?, pct?, when?}` (the /context card), `{kind: usage, limits?, session?, breakdown?, whats?}`
(the /usage card; defaults are his numbers), `{kind: limit, text, sub?, on?}` (usage-limit card with
the "Auto-continue when limits reset" switch), `{kind: code, title, text}` (e.g. `~/.claude/settings.json`).
A user message starting with a known command (`/context`, `/autocompact 200k`) draws the command blue.
Media and progress (light): `{kind: image, src, title?, meta?, w?, h?, maxH?}` (a picture Claude made: file
header + the image), `{kind: video, src, title?, meta?, start?, ...}` (plays muted from the moment it is revealed),
`{kind: progress, text, pct?, meta?}` (a bar that follows `state.progress` when `pct` is unset: `tween: progress`),
and `attachments: [{name, icon?, meta?}]` on a user message (file/folder chips above the bubble). Messages revealed
by `upto` / `append` blur in. `data.stamp: Recreated` puts an amber pill in the title bar for rebuilt windows.

Connector (MCP) work, light theme (`light/Tools.tsx`). All of it is optional and additive:

- **Model chip:** `data.model` / `data.effort` set the chip under the composer (`model: "Fable 5.2", effort: "High"`);
  `model: false` hides it, `effort: ""` drops the grey word.
- **Connectors popover:** `data.connectors[]` entries take `tools: [name | {name, desc}]`, `icon` (lucide name or a work-dir
  logo image), `color` (letter tile). `state.connectors: {open: true}` opens the list above the composer; `{open: "Higgsfield"}`
  also shows that connector's tool pane. Tools revealed by a `set` cascade in on their own; `upto: N` shows only the first N.
  Columns are added as needed; what does not fit ends in "+ N more". Targets: `connectors-popover`, `connectors-list`,
  `mcp-<slug>`, `mcp-switch-<slug>`, `add-connector`, `mcp-tools`, `mcp-tools-head`, `mcp-tool-<slug>`. (The rail keeps
  `connector-<slug>` and `state.connectorsOpen`; the title bar keeps `tool-*`.)
- **Tool call:** `{role: tool, connector, tool, args?, open?, status?: running|done|error, id?, icon?, result?: {image | video,
  title?, meta?, start?, w?, h?, maxH?} | {text}}`: Claude's collapsed tool row (logo, connector, tool name, spinner → check),
  `open: true` shows `args`, and the result card sits under it once the call is done. `state.toolStatus: {<id or message
  number>: done}` flips it with one `set`: the result blurs in and a video starts playing from that frame. Targets: `msg-<n>`,
  `msg-<n>-status`, `msg-<n>-result`, `msg-<n>-result-media`. The dark theme draws a plain "Connector · tool" line.
- **Chips:** attachments take `kind: folder` (blue folder, `count` → "6 items"), `kind: pasted` (`lines` → "Pasted · 212 lines"),
  `kind: image`, `thumb` (a work-dir image). `state.attachments: [..]` puts chips inside the composer (targets `attachments`,
  `attachment-<k>`); the same list on a user message draws them above the bubble.
- **Drop on the composer:** `state.dropping: {name, kind?, count?, thumb?}`. While it is set and the cursor is on screen the
  item rides under the cursor (`drop-ghost`) and the composer shows a dashed blue "Drop to add to this chat". Drive it with
  `move: composer` then `click: composer` with `set: {dropping: null, attachments: [...]}`.
- **Long prompts:** the composer wraps, breaks on `\n`, grows to 9 lines, then shows the tail like a scrolled field.

```yaml
- kind: app
  app: claude-desktop
  data:
    preset: samin
    stamp: Recreated
    model: "Opus 5.5"
    connectors:
      - { name: Higgsfield, letter: H, color: "#111111", status: Connected, tools: [generate_image, generate_video, generate_audio, upscale_video] }
    messages:
      - { role: user, text: "Animate shot 3." }
      - { role: tool, id: gen, connector: Higgsfield, tool: generate_video, status: running, result: { video: media/shot-03.mp4, title: "shot-03.mp4", meta: "5 s" } }
  state: { active: dfw, sidebar: false, upto: 1 }
  beats:
    - { at: "drop it", set: { dropping: { name: "footage", kind: folder, count: 6 } } }
    - { at: "drop it +0.5s", move: composer }
    - { at: "into Claude", click: composer, set: { dropping: null, attachments: [ { name: "footage", kind: folder, count: 6 } ] } }
    - { at: "the tools", click: attach, set: { attachments: null, connectors: { open: true } } }
    - { at: "Higgsfield", click: mcp-higgsfield, set: { connectors: { open: Higgsfield } } }
    - { at: "generate", set: { connectors: null, upto: 2 } }
    - { at: "comes back", set: { toolStatus: { gen: done } } }
```

Extra **state** (light): `modelMenu` (`true` | `effort` | `more`), `modelHover`, `dialog`
(`{kind: switch-model, from, to, dontAsk}`), `userMenu`, `view: settings` + `settingsPage`,
`settingsScroll`, `settingsHover`, `toggles` (unset = the row's default; `false` turns a default-on
row off), `slashTip`, `connectorsOpen`; `prompt: "/aut"` + `slash: [...]` bolds the typed part,
`prompt: "/autocompact "` shows the command chip with its grey argument hint.

Extra **targets** (light): `settings-gear`, `user-menu`, `user-menu-<slug>`, `model-menu`,
`model-<slug>` (`model-haiku-5-5`, `model-effort`, `model-more-models`, `model-fast-mode`),
`effort-menu`, `effort-<slug>`, `buy-credits`, `dialog`, `dialog-cancel`, `dialog-confirm`,
`dialog-checkbox`, `slash-tip`, `mic`, `save-as-environment`, `env-head`, `env-branch`,
`context-head`, `connectors-head`, `connectors-note`, `changes-card`, `changes-head`, `changes`,
`create-pr`, `context-window-bar`, `usage-limit-<n>`, `usage-session`, `usage-breakdown`,
`usage-whats`, `usage-what-<n>`, `settings-search`, `settings-close`, `settings-page`,
`settings-section-<slug>`, `env-choice`, `choose-environment`, `connect-github`, `env-picker`.
`env-card` / `context-card` / `connectors-card` cover the rail sections (lift / explode them).

**Where the four settings live** (from the installed app 4.16336.0, CLI 2.1.302 and the docs; full
sources in the v2 work dir `review/claude-settings-path.md`):

| setting | desktop | CLI `/config` | settings.json / env |
|---|---|---|---|
| Prompt suggestions | gear (tooltip "Code settings") or user menu → Settings ⌘, → **Claude Code** → Sessions → switch "Prompt suggestions" (on by default) | "Prompt suggestions" | `promptSuggestionEnabled: false`, `CLAUDE_CODE_ENABLE_PROMPT_SUGGESTION=false` |
| Auto-continue at usage limit | not in Settings: switch "Auto-continue when limits reset" on the usage-limit card in a session | "Continue automatically at usage limit" | `autoContinueAtUsageLimit: false` |
| Subagent model | none | none | env only: `CLAUDE_CODE_SUBAGENT_MODEL=haiku` (+ `CLAUDE_CODE_SUBAGENT_MODEL_FORCE=1` for Explore/Plan) |
| Auto-compact window | `/autocompact 200k` (or `auto`) in the composer | "Auto-compact" (on/off) and `/autocompact` | `autoCompactWindow`, `modelSettings.<model>.autoCompactWindow`, `autoCompactEnabled`, `CLAUDE_CODE_AUTO_COMPACT_WINDOW`, `DISABLE_AUTO_COMPACT=1` |

How to show each one here: Settings path with `click: settings-gear` (or `user` → `user-menu-settings`)
→ `set: {view: settings}` → `toggle-prompt-suggestions` with `set: {toggles: {prompt-suggestions: false}}`;
auto-continue with a `{kind: limit}` message and `toggle-auto-continue-when-limits-reset`; the
subagent model with a `{kind: code, title: "~/.claude/settings.json"}` card (or the terminal); the
auto-compact window with `prompt: "/aut"` + `slash: [autocompact, ...]` → `prompt: "/autocompact 200k"`;
the CLI rows with the `terminal` replica's `state.config`.

The Settings window (modal: "Settings" + close, 212 px nav with "Search settings" and the groups
Preferences / This computer / Customize, section titles, label + description + control rows, 36x20
switches in blue-450) is built from the app's own code (labels, descriptions, defaults, order, layout
classes) at his zoom and palette: it never appears in his recording. The app can also show Settings
as a full page and may label the nav item "Code"; that choice is a server flag we could not read.

Test timeline: `examples/tests/replica-claude-desktop-light.json` (hi, /context, /usage, slash
popover with tooltip, /autocompact, model menu + empty session, switch-model dialog, the Settings
path, user menu, usage-limit card, settings.json card, the fictional world in light, gear, Effort
submenu, terminal `/config`).

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
selection), `upto`, `append`, `thinking` (orange spinner line), `mode: normal | plan | accept`,
`config` (`{hover: 'Auto-compact', values: {'prompt-suggestions': false}}`: Claude Code's `/config`
Settings panel, Config tab, in place of the input box; rows are `data.config` with the real CLI
labels: Auto-compact, Continue automatically at usage limit, Prompt suggestions, ...).

targets: `window`, `titlebar`, `header`, `scrollback`, `line-<n>` (hugs its text), `thinking`,
`composer`, `status`, `slash`, `slash-<slug>`, `config`, `config-<slug>`, `config-value-<slug>`.

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

## `openusage`

OpenUsage, the free macOS menu-bar tracker for AI plan limits (openusage.ai,
github.com/robinebers/openusage), on a Mac desktop strip: the menu bar with OpenUsage's strip
(provider mark + % left; two limits of one provider stack), and the light panel under it. Files:
`src/replicas/openusage/` (`tokens.ts` palette + grid, `geometry.ts` strip / panel / scroll maths,
`MenuBar`, `Dashboard`, `Screens` (Accounts, account page, Settings), `Sheets` (Add Account sheet +
pull-down menus), `icons.ts` (the app's own provider marks), `defaults.ts`).

Sources: the dashboard is OpenUsage 0.7.16 as on Samin's screen (`media/screen/openusage.png` and
the raw recording at 16-45 s): "Cost ⌄ ⓘ", the Today / Yesterday / 30 Days capsule, the spend ring
with "$10.5K / dollars" and the ranked legend (long values shrink like SwiftUI's scale-to-fit, names
truncate "Claude…"), account sections "Claude — you@work.com  Max 20x" with Session / Weekly
(flame "Limit reached") / Fable / Extra Usage bars, Usage Trend (30 daily bars), the expand caret
(On Demand rows Today / Yesterday / Last 30 Days, "Usage ↗"), footer "OpenUsage 0.7.16 / Next
update in 5m" + "Options ⌄". The Accounts flow is the app's current source
(`Sources/OpenUsage/Views`: PopoverFooter's Options menu "Accounts ↩ / Settings ⌘, / Check for
Updates… / Report an Issue… / About OpenUsage / Quit OpenUsage ⌘Q"; AccountListView + "Add New
Account"; AddAccountSheet "Add Account / Choose a provider to sign in to." with Claude, ChatGPT,
Cursor, Antigravity, Copilot, Devin, Grok, Ollama, OpenCode, OpenRouter, Z.ai, CLIProxyAPI; "Sign In
to Claude / Continue in your browser…", Code field, Copy Link / Open Browser, "Waiting for your
browser…"; device code for Copilot and Grok; API key for Ollama / OpenCode / OpenRouter / Z.ai;
AccountDetailView metric switches + "Remove Account…"; SettingsScreen General / Display / Alerts /
Advanced). Numbers are his displayed ones; account names are fictional (`you@work.com`, `Personal`).

Scale: 1.62 px per macOS point (panel 518 px wide) so the Total Spend card and the whole first
account card fit above the footer on a 1080-high plate. The panel hangs under the strip's right end
and keeps its place while the strip grows. Overlays (sheet, menus) are placed from `geometry.ts`.

### data

| key | shape |
|---|---|
| `accounts` | `[{id, provider, label?, title?, legend?, plan?, color?, metrics, more?, links?, spend?}]`; `provider` is a mark id (claude, codex, cursor, grok, antigravity, copilot, devin, ollama, opencode, openrouter, zai); `title` defaults to "Claude — <label>"; `spend: {today, yesterday, '30-days'}` dollars feed the ring |
| Metric | `{label, left: 0..100 \| null, resets?, note?, flame?, tone?: blue\|yellow\|red, tick?}` limit bar (`left: null` = "—  No data"); `{kind: 'trend', bars: number[] \| null}`; `{kind: 'value', label, value: string \| null}` |
| `strip` | `[{provider, values: ['93%'] \| ['96%', '88%'], account?}]` menu-bar strip; items show only for added accounts, the app mark when none |
| `providers` | Add Account list `[{id, name}]` (app order) |
| `optionsMenu`, `statusMenu` | menu items: `'-'` or `{label, icon?, key?}` |
| `footer` | `'options'` ("Options ⌄", 0.7.16, default) or `'ellipsis'` (newer round ⋯) |
| `version`, `nextUpdate`, `costTitle`, `clock`, `activeApp`, `appMenus`, `deviceCode` | strings |
| `desktop` | `{image?}`: a work-dir screenshot drawn under the menu bar instead of the wallpaper |

### state

| key | values |
|---|---|
| `open` | panel showing (click `menubar-icon` with `set: {open: true}`) |
| `view` | `'popup'` (dashboard) \| `'accounts'` \| `'account'` (page of `state.account`) \| `'settings'` |
| `tab` | `'today'` \| `'yesterday'` \| `'30-days'` |
| `menu`, `menuHover` | `null` \| `'options'` (above the footer button) \| `'status'` (right-click under the strip); highlighted item slug |
| `accounts` | `null` = every account in data; `[ids]` = the accounts added so far (`[]` = fresh install: empty dashboard "Add an Account", app icon in the strip). Add one = set the list with the new id |
| `account` | account id for `view: 'account'` |
| `expanded` | `[ids]` cards with the caret open |
| `scroll`, `scrollTo` | dashboard scroll in px (tween it); `scrollTo: '<id>'` puts that section at the top (clamped like a real scroll view) |
| `sheet`, `provider` | `null` \| `'add'` (provider list) \| `'signin'` (browser / device code / API key step for `provider`) |
| `pickHover` | provider id highlighted in the list |
| `signin` | `'preparing'` \| `'waiting'` \| `'signing'` \| `'error'` |
| `code` | pasted code or API key (type with `key: code`; the primary button becomes Continue) |
| `settingsTab`, `toggles` | `'general'` \| `'display'` \| `'alerts'` \| `'advanced'`; `{'<setting slug>': bool}`, `{'hide-<metric slug>': true}` on an account page |

### targets

Menu bar: `menubar`, `apple-menu`, `active-app`, `menubar-icon` (the whole strip), `strip-<n>`, `wifi`,
`battery`, `control-center`, `clock`. Panel: `panel`, `dashboard`, `cost`, `cost-title`, `cost-info`,
`cost-share`, `cost-card`, `tabs`, `tab-today`, `tab-yesterday`, `tab-30-days`, `donut`, `donut-total`,
`legend`, `cost-row-<id>`, `cost-row-<n>`, `cost-value-<id>`, `account-<id>`, `account-<id>-header`,
`plan-<id>`, `card-<id>`, `limit-<id>-<slug>` (+ `-bar`, `-note`, `-left`, `-resets`), `trend-<id>`,
`value-<id>-<slug>`, `caret-<id>`, `link-<id>-<slug>`, `footer`, `version`, `next-update`, `options`,
`empty`. Menus: `menu`, `menu-item-<slug>` (accounts, settings, check-for-updates, report-an-issue,
about-openusage, quit-openusage), aliases `accounts-nav`, `settings-nav`. Accounts: `top-bar`, `back`,
`screen-title`, `accounts-screen`, `accounts-list`, `account-row-<id>`, `account-row-<id>-open`,
`add-account`, `account-page`, `account-title`, `metrics-card`, `metric-row-<slug>`,
`metric-pin-<slug>`, `metric-switch-<slug>`, `remove-account`. Sheet: `sheet`, `sheet-title`,
`provider-list`, `provider-<provider>`, `cancel`, `signin-close`, `code-field`, `name-field`,
`device-code`, `copy-link`, `open-browser`, `signin-status`. Settings: `settings`,
`settings-tab-<slug>`, `setting-<slug>`, `toggle-<slug>`, `picker-<slug>`, `button-<slug>`,
`priority-preview`.

```yaml
- kind: app
  at: "it lives in your Mac menu bar"
  app: openusage
  state: { open: false, accounts: [claude-work, codex, cursor, grok], tab: today }
  beats:
    - { at: "menu bar", click: menubar-icon, set: { open: true } }
    - { at: "go to accounts", click: options, set: { menu: options } }
    - { at: "accounts", click: accounts-nav, set: { menu: null, view: accounts } }
    - { at: "add", click: add-account, set: { sheet: add } }
    - { at: "Claude", click: provider-claude, set: { sheet: signin, provider: claude } }
    - { at: "log into", click: open-browser, set: { signin: signing } }
    - { at: "every one of the plans", set: { sheet: null, accounts: [claude-work, claude-personal, codex, cursor, grok] } }
    - { at: "limit bars", click: back, set: { view: popup } }
    - { at: "last 30 days", click: tab-30-days, set: { tab: 30-days } }
    - { at: "this much money", callout: donut, text: "$10.5K in 30 days" }
```

Test timeline: `examples/tests/replica-openusage.json` (open, Options menu, Accounts, Add Account,
Sign In to Claude, connected row, account page, 30 Days, callout / lift / explode / zoom / focus,
scrollTo + expanded card, Settings tabs, fresh install with an API-key and a device-code sign-in,
right-click menu).

## `telegram`

Samin's Telegram Desktop, night theme: the forum group "Hermes Team", topic "Trading", with the bot
Hermes texting him. Built from his recording (window 1638 pt wide; `src/replicas/telegram/tokens.ts`
has the sampled palette and every size in points). Real text is 14 pt Open Sans on a 19 pt line, drawn
at 1.6x so it is 22 px; the bubble keeps his 472 pt width, so lines wrap where his do. Files: `tokens.ts`,
`types.ts`, `text.ts` (pure: message parsing and reveal logic, tested in
`cli/test/replica-telegram.test.ts`), `defaults.ts`, `Glyphs.tsx`, `Messages.tsx` (the thread, both
views), `Desktop.tsx`, `Phone.tsx`, `Telegram.tsx`.

**The hook messages are illustrative.** `risk` (Nov 2) and `update` (Nov 5) carry `illustrative: true`:
they are written for the video in the bot's style, never sent by the real bot. All chat names are
fictional. Drop his real avatars in with `data.bot.avatar` (a work-dir image).

### data

| key | shape |
|---|---|
| `group` | `{title, unread}`: title bar count "Trading – (421)" |
| `bot` | `{name, tag, color, avatar?}`: "Hermes", green "admin" (`tag: null` hides it), pink name; `avatar` replaces the drawn portrait |
| `topics` | `[{name, icon?, count?}]`: the tabs; `icon` is an emoji or `'#'`, `count` drives "258 messages" |
| `messages`, `topic` | the thread, and the topic slug it belongs to (`trading`); the `All` tab shows it too |
| `threads` | `{'<slug>': [Message]}` other topics |
| Message | `{id, from: 'bot'\|'me', name?, time, date?, title?, text?, card?: {site, title, desc?, image?}, reactions?: [{emoji, count}], status?: 'read'\|'sent'\|'sending', illustrative?}`. `date` draws a pill above it. `text`: `\n` lines, `**bold**`, `[label](url)`, bare `https://` links, bullets as lines starting `• ` |
| `activeChat`, `archived`, `chats` | sidebar: `{id, name, kind?: user\|group\|bot\|channel\|forum, preview, previewFrom?, time, unread?, muted?, pinned?, initials?, color?: 0..6, avatar?: 'bot'\|'team'\|path}` |
| `folders` | folder tabs above the chat list; `[]` by default, as his setup has none |
| `placeholder`, `phonePlaceholder`, `clock` | "Write a message...", "Message", phone status bar |
| `bubbleW` | bubble width in px (default his 472 pt = 755 px); widen it to fill the panel with `sidebar: false` |

### state

`view` (`desktop` \| `phone`), `sidebar`, `topic`, `upto` (count, message id or null), `append`,
`typing` (`true`, or `'header'` for the title line only), `scroll` (px up from the newest message, tween
it), `composer` (type with `key: composer`), `stickyDate` (floating pill for a long message), `folder`.

**Arrivals need no extra beat:** raising `upto` or growing `append` with `set` makes the thread make
room and the new bubble rise from behind the composer while it sharpens. The engine tells replicas when
a key last changed through `ui.changes[key] = {frame, prev}`.

### targets

Both views: `messages`, `msg-<id>`, `msg-<id>-title`, `msg-<id>-line-<k>` (hugs one line of text, blanks
not counted), `msg-<id>-name`, `-admin`, `-avatar`, `-card`, `-time`, `-tick`, `-reactions`, `-reaction-<k>`,
`date-<id>`, `date-sticky`, `avatar`, `typing`, `scroll-down`, `empty`, `header`, `header-title`,
`header-status`, `composer`, `composer-text`, `attach`, `send`. Desktop: `window`, `titlebar`, `chat`,
`topics`, `topics-view`, `topic-<slug>`, `header-search`, `panel-toggle`, `header-more`, `commands`,
`emoji`, `sidebar`, `menu`, `search`, `archived`, `chat-<id>`, `folders`, `folder-<slug>`. Phone: `phone`,
`screen`, `status-bar`, `back`, `header-avatar`.

```yaml
- kind: app
  at: "before the vote"
  app: telegram
  state: { upto: friday, sidebar: false }
  beats:
    - { at: "my bot", set: { typing: true } }
    - { at: "literally told me", set: { typing: false, upto: risk } }
    - { at: "saved me", mark: msg-risk-line-2, style: marker, until: "bunch of money" }
```

Test timelines: `examples/tests/replica-telegram.json` (full frame: reveal, mark, callout, lift, zoom,
focus, topic switch, scroll, explode, type and send, then the phone) and
`examples/tests/replica-telegram-panel.json` (the same in the panel look).

## `finder`

macOS Finder in light appearance, measured from a real window on macOS 27 (grey sidebar, capsule toolbar groups, icon view and
list view, path bar), drawn at ~1.55x so names read on a phone. Files: `src/replicas/finder/` (`Finder.tsx`, `types.ts`,
`defaults.ts`, `index.ts`). It fills the plate and reflows into the panel (sidebar 286 px, 5 icon columns; 372 px and more
toolbar buttons at 1920). Defaults are a neutral "Brand Kit" folder: no real names, drives or paths.

### data

| key | shape |
|---|---|
| `title` | folder name in the toolbar |
| `path` | path bar: `"Macintosh HD/Users/you/Brand Kit"` or a list; `null` hides it |
| `view` | `icon` (default) \| `list` |
| `items` | `[{id, name, kind?, thumb?, thumbAt?, meta?, date?, items?}]`. `kind`: `folder image video audio doc code` (guessed from the name). `thumb`: work-dir image, or a video (frame at `thumbAt` s, default 0.5; skipped in the measuring copy; a poster jpg is faster). `meta`: blue info line under the name, Size column in list view. `items`: folder contents |
| `folders` | `{<key>: {title?, path?, items}}` other folders `state.path` can open; key `new` = inside the new folder |
| `sidebar` | `[{section, items: [{name, icon?, active?}]}]` or `false` |
| `stamp` | `Recreated`: amber pill next to the title |
| `columns`, `date`, `search` | icon columns, default date text, `search: false` drops the search field |

### state

| key | values |
|---|---|
| `view` | `icon` \| `list` (overrides data) |
| `path` | key of `data.folders`, or the id of a folder item with `items`; `null` = top folder |
| `items` | replaces the item list on screen; new ids pop in |
| `shown` / `upto` | `[ids]` visible / first N. Ids added by a `set` pop in (files landing one by one) |
| `selected` | id or `[ids]` |
| `moved` | `[ids]` moved out: icon view keeps their slots empty (nothing reflows), list view drops the rows |
| `newFolder` | `true` \| `{id?, name?}`: a new folder at the end (id `new`), name field open |
| `rename` | text in the open name field (`type: item-new-name, key: rename`) |
| `renaming` | unset = the new folder's field is open; `null` = committed; `'<id>'` = that item's field |
| `names` | `{id: name}` permanent renames |
| `drag` | `{ids, count?}`: ghost stack of those items at `ui.cursor`, originals dim |
| `dropTarget` | folder id or `side-<slug>` highlighted; automatic for the hovered folder while `drag` is set |
| `scroll` | px scrolled (tween) |

### targets

`window`, `sidebar`, `side-<slug>`, `toolbar`, `back`, `forward`, `title`, `stamp`, `view-switch`, `view-icon`, `view-list`,
`view-columns`, `view-gallery`, `tags` (1920 only), `new-folder`, `share`, `more`, `search`, `content`, `items`, `list-header`,
`item-<id>`, `item-<id>-icon`, `item-<id>-name` (open name field), `path`, `drag-ghost`.

```yaml
- kind: app
  at: "make a folder"
  app: finder
  data:
    title: Downloads
    stamp: Recreated
    items:
      - { id: logo, name: "logo.png", thumb: media/logo.png, meta: "1200 × 393" }
      - { id: clip, name: "ad.mp4", thumb: media/ad.mp4, thumbAt: 3, meta: "00:16" }
  beats:
    - { at: "make a folder", click: new-folder, set: { newFolder: true } }
    - { at: "make a folder +0.8s", type: item-new-name, key: rename, text: "ad assets" }
    - { at: "drop", set: { renaming: null } }
    - { at: "drop +0.4s", click: item-logo, set: { selected: [logo, clip], drag: { ids: [logo, clip] } } }
    - { at: "footage", move: item-new }
    - { at: "footage +0.6s", click: item-new, set: { drag: null, selected: null, moved: [logo, clip] } }
```

**Drag ghosts and `ui.cursor`.** The engine now passes the scripted cursor's plate position as `ui.cursor` while the cursor
is on screen (`src/app/logic.ts` `uiAt`). A replica draws what is being dragged there (`finder` `state.drag`,
`claude-desktop` `state.dropping`) and hides it when `ui.cursor` is absent or `ui.measuring` is set. Authoring rules: pick up
with a `click` that sets the drag, travel with `move`, drop with a `click` that clears it; keep those beats under 5 s apart
(after 5 s the cursor leaves and re-enters); a click target is measured in the state after its own `set`, so do not reflow
the layout in the drop's `set` (that is what `moved` is for).

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
