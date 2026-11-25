# Recreated windows: the Claude app and Finder

This is the part he liked most: "how you created the Claude app and did the things there". When he
describes doing something on his computer, the viewer watches it being done in a code-built replica driven
by the scripted cursor. Replica reference: `docs/REPLICAS.md` (`claude-desktop`, `finder`). `screenplay
replicas <id>` prints targets and state keys.

## The question to ask of every sentence

What would he be **doing** on his computer here? Show that. Making a folder, dragging files in, attaching
the folder, pasting the skill, typing the prompt, approving, getting the result. An icon list, chips or a
generic diagram is the wrong answer when a screen exists. A diagram is for a concept with no screen.

## The recipe

1. **Finder**: new folder, name typed, files dragged in, folder opened, files land one by one. Real file
   names and real thumbnails from the build. `data.stamp: Recreated`.
   Template: `../templates/yaml/finder-new-folder-drag-files.yaml`.
2. **Cut to Claude**: the folder arrives under the cursor and drops on the composer (two replicas cannot
   share a drag; the cut sells it). The skill appears as a pasted chip. The prompt types.
   Template: `claude-attach-folder-paste-skill-type-prompt.yaml`.
3. **Claude replies with the real result**: the real storyboard image, the real render playing.
   Template: `claude-reply-with-image-and-video.yaml`.
4. **Connector tools**: the connectors popover opens and the tool list cascades in.
   Template: `claude-connector-tools-appear.yaml`.
5. **A tool call returns a video**: spinner, check, the clip blurs in and plays.
   Template: `claude-tool-call-returns-video.yaml`.

## Truth rules for a recreated window

- **Real prompts.** The typed text comes from the build's README or prompt files, exactly. Where he
  paraphrases aloud, the typed text may carry his spoken words. Typing starts about 1 s before he says it.
- **Real results.** The image or video in the reply is the real file from the build.
- **Model chip = the model that did the build.** The preset's default chip is not true for most builds.
  Set `data.model` to the real one, or `model: false` to hide it. Different builds in one video may have
  different models; check the facts file per build.
- **"Recreated" is always visible.** `data.stamp: Recreated` on the window. The pinned stamp is an engine
  option now, with nothing to set (`docs/REPLICAS.md`): when `camera: {scale, target}` or a `zoom` beat
  pushes in so far that the pill leaves the view, the engine pins the same pill to the top right of the
  view, fading it in as the window's own pill is cut off. It works on replicas with a `stamp` target
  (`claude-desktop` in the light theme, `finder`). On an older engine, or on a pre-rendered plate of a
  window, draw the pill yourself. The last whole-video review of this edit blocked on two zoomed windows
  that cropped the stamp, before the engine did this.
- **"Recreated · example" for staged demos.** When the window shows what he *would* type, or a step that
  did not happen in the real build (an approval step the build ran straight through), stamp it
  "Recreated · example" and title it honestly ("Example: how I'd ask"). Real pieces inside it are labelled
  as real ("A real prompt from the build").
- **"Illustration"** on anything invented to explain: a made-up edit to a paragraph, a generic poster, a
  file added to a folder. In stories too. Every illustration is listed in the handoff.
- **Tool calls vs CLI.** If the real build ran a step through a command line tool, not a connector tool
  call, the row shows that command. Do not draw a tool call that never happened.
- **Neutral names.** A neutral path bar (Macintosh HD › Users › you › Downloads). Never a real email, key, account id or
  private path. No tool count unless a source backs the number.
- **Never pass a recreation off as a screenshot.** His real screen, when he recorded it, is shown live and
  whole instead (`screenplay-demo-edit`, `references/live-screen.md`).

## Framing so text reads on a phone

- Look at every window frame at 1/3 size. Typed text under about 22 px on the final frame is too small.
- Push the camera in on the composer while he types (about 1.4 to 1.5×), follow the sent message up, then
  frame the reply.
- No big white. A window that is 70 to 90% empty canvas is a framing failure: zoom to the message, lift the
  result bigger, or go full screen (see [layouts.md](layouts.md)).
- A dense window is a reason to use the full-screen layout: `layout: full` on the `app` scene draws the
  replica about a quarter bigger than its design size (`ui:` changes the factor).
- A result shown over the window (a storyboard, a plan) that should be nearly frame wide: `fit: wide` on
  the `show:` beat.
- A steps strip over a window: a `steps` overlay with `band: true`, so it never covers the title bar or
  the stamp.
- Hold a window still no longer than about 6 s. Mark, lift or scroll something.

## Drag rules that keep it looking right

- Pick up with a `click` that sets the drag, travel with `move`, drop with a `click` that clears it.
- Keep pick-up, travel and drop under 5 s apart, or the cursor leaves and the ghost jumps.
- Do not reflow the layout in the drop's own `set`. Use `moved` so the slots stay empty.
- Use poster jpgs, not videos, as thumbnails for a folder full of clips.
- Re-encode every clip shown in a replica to h264, 30 fps, 1 s GOP.

## When the engine lacks something

Path chapter cards, the three layouts, the chip, the steps strip, the pinned stamp and `fit: wide` are
all in the engine now; `examples/ads-tutorial-mini` in the engine repo uses each of them with both
windows. For anything else: writers do not edit engine code. Build the beat another honest way (an image or video element, a
pre-rendered plate of the replica) and ask the engine owner in the handoff. The engine owner writes what was
added to `ENGINE-NOTES.md` with a copy-paste example for each.
