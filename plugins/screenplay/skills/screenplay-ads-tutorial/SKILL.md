---
name: screenplay-ads-tutorial
description: EDIT a filmed tutorial or talking-head video about a build (ads, motion graphics, app demos) into a screen-style video, the way "Claude makes ads and motion graphics, in three levels" (Nov 2026) was edited - every idea shown on a computer in recreated Claude and Finder windows with the real prompts and results, real proof on every claim, the camera moving between three layouts (panel + tile, full-screen visual, full-screen him), chapter path cards with breathers, the finished pieces played in full with credit lines, a phrase-by-phrase intro hook, a story cut and a connectives pass on his voice, clicks and pops but no whooshes, then a master assembly and a Borumi working edit. Run by one boss with parallel lane writers, independent reviewers and fixers. Use when asked to "edit it like the Claude Ads video", to edit a recorded tutorial about something he built, to add recreated app windows, proof, chapter cards or showcase clips to a talking-head edit, or to resume such an edit. This skill does NOT make an ad or a motion graphic; the separate motion-ads skill does that.
---

# screenplay-ads-tutorial

He filmed himself explaining how he built something: three ads, in three levels. He never recorded his
screen for most of it. The edit makes the video look like he did: when he says "make a folder, drop your
assets in, paste the skill, type this prompt", the viewer watches a recreated Finder and a recreated Claude
window do exactly that, with the real files, the real prompt and the real result.

This skill sits on top of two others. Read them first; this one does not repeat them.
- [`screenplay-edit`](../screenplay-edit/SKILL.md): the engine, `edit.yaml`, the house look, the style rules.
- [`screenplay-demo-edit`](../screenplay-demo-edit/SKILL.md): long tutorials, parallel part writers, his
  real screen shown live, the Borumi assembly.

What this skill adds: a boss with one lane per recorded scene, independent reviewers, the story cut and the
connectives pass, the proof pack, the recreated-window recipe, full showcase clips, the three layouts, the
path cards, and the master assembly with its checks.

Start from the engine's example, `examples/ads-tutorial-mini` in the engine repo: one 39 s edit that uses
path chapter cards, the breather, all three layouts, a chip, a steps strip and both recreated windows.

```bash
node examples/ads-tutorial-mini/make-media.mjs          # writes aroll.mp4 and media/*.png (needs ffmpeg)
node cli/screenplay.ts check examples/ads-tutorial-mini
node cli/screenplay.ts render examples/ads-tutorial-mini --preview
node cli/screenplay.ts sheet examples/ads-tutorial-mini --every 1s
```

It edits a video **about** a build. It does not make the ads. The pieces he built are inputs.

## What you need before you start

- The recording project (camera, mic, any screen recordings), **read-only**.
- `<project>`: the builds he talks about, each with its README (the exact prompts), logs, storyboard and
  final files. These are the visuals. If a build has no README with its prompts, ask for it first.
- `<work dir>`: a new folder for the edit. Layout: [templates/workdir-skeleton/README.md](templates/workdir-skeleton/README.md).
- The `screenplay` CLI (`$SCREENPLAY_HOME`), ffmpeg, whisper-cli, a model that can watch video and listen
  to audio for the reviews, and the Borumi bridge.

## The pipeline

| # | Step | Where | Reference |
|---|---|---|---|
| 1 | Read his ask. Map the recording. One lane per scene. Write `PLAN.md` | `<work dir>` | [orchestration.md](references/orchestration.md), [templates/PLAN.md](templates/PLAN.md) |
| 2 | Facts and the proof pack: capture, then an independent verifier | `proof/`, `FACTS.md` | [proof-first.md](references/proof-first.md) |
| 3 | Wave 1: engine owner, one writer per lane | `lanes/<lane>/` | [templates/WRITER.md](templates/WRITER.md) |
| 4 | Each writer: paper edit, cut, plan, `edit.yaml`, check, render, handoff | lane | [story-cut.md](references/story-cut.md), [recreated-windows.md](references/recreated-windows.md) |
| 5 | Independent review of every render, then a fixer per review | `review/` | [templates/REVIEWER.md](templates/REVIEWER.md), [templates/FIXER.md](templates/FIXER.md) |
| 6 | Build the full showcase clips and the cold open | `showcase/`, `front/` | [showcase-and-proof-beats.md](references/showcase-and-proof-beats.md) |
| 7 | Write the intro hook last, from the finished lanes | `lanes/<intro>/` | [intro-hook.md](references/intro-hook.md) |
| 8 | Layout pass: three layouts, framing | lanes | [layouts.md](references/layouts.md) |
| 9 | Chapter path cards | `cards/` | [chapter-cards.md](references/chapter-cards.md) |
| 10 | Assemble the master, run the fast check | `tools/`, `out/` | [assembly-and-checks.md](references/assembly-and-checks.md) |
| 11 | Whole-video review, fix wave, re-assemble | `review/` | [templates/FINAL-REVIEW.md](templates/FINAL-REVIEW.md) |
| 12 | Connectives pass on the master, pickup list | `CONNECTIVES.md` | [connectives.md](references/connectives.md) |
| 13 | Borumi working edit (new project, dry first) | Borumi | [borumi-working-edit.md](references/borumi-working-edit.md) |
| 14 | Export, report, hand off to `youtube-publish` | `<project>/Exports/` | "Export and hand-off" below |

A round of his notes usually touches steps 5 and 8 to 13 only. Do not redo the proof pack or the cuts unless
he asks.

## Engine option or script

The engine does these inside one lane's `edit.yaml` (`docs/EDIT-YAML.md`, "Tutorial edits"; the snippets in
[templates/yaml/](templates/yaml/) are each checked against the engine):

| What | Engine key |
|---|---|
| Path chapter cards | `chapters.style: path`, items with `label`, `group`, `title`, `at`; `chapters.heading` |
| Three layouts, hard-cut switches | scene `layout: panel \| full \| him`; `transition: morph` brings the blur back; `ui:` scales a replica in `full` |
| Level chip | top-level `overlays:` entry `type: chip` with `text`, `eyebrow`, `corner`, `at` / `until` / `hold` |
| Steps strip | top-level `overlays:` entry `type: steps` with `items: [{text, at, icon}]`, `place`, `band` |
| "Recreated" pinned when zoomed | automatic from `data.stamp: Recreated` (`claude-desktop` light, `finder`); nothing to set |
| A result card nearly frame wide | `fit: wide` on a `show:` beat |
| Breather at each card (opt-in) | `chapters.breather: { seconds: 1, click: media/click.wav }` |

A script is still needed for what crosses lanes:

| What | Script |
|---|---|
| Joining the lane renders, clips and cards into one master | `assemble.py` |
| The sound-effect stem (clicks, pops, the chapter click) | `assemble.py` (`remix_no_whoosh.py` to change a finished one) |
| Chapter cards BETWEEN lanes or before a showcase clip | `chapter_cards.py` clips, inserted by `assemble.py` (`"card": <index>`) |
| The Borumi working edit | `make_scenes.py`, `borumi_build.py`, `borumi_rebuild.py`, `borumi_gapfix.py` |

**The one trap:** a lane that turns on `chapters.breather` must have `"breathers": false` on its segment in the
assembly config, or it gets two breathers at every card (the engine's, then the assembler's).
With `"breathers": false` the assembler leaves that lane's cards alone, so it also does not list them:
copy their times from the lane's `<render>.chapters.txt` into the master's chapter list. Details:
[chapter-cards.md](references/chapter-cards.md). `compose_layouts.py` and `chapter_cards.py` are the
fallbacks for an older engine; `chapter_cards.py` also makes the cross-lane cards.

## Boss, lanes, reviewers, fixers

One boss plans, briefs, decides and assembles. Each recorded scene is its own screenplay work dir with its
own writer. Every render is reviewed by a **different model** than the one that made it (here: Claude
Fable and Opus wrote, Gemini 4 Neon reviewed, watching the picture and hearing the sound); the reviewer
returns numbered fixes and fixes nothing; a fixer applies them and writes a versioned handoff. Briefs are
files in the work dir, so a new rule from him becomes a new rule file and a one-line steer to every running
worker. Nobody deletes anything. One agent commits to the engine. A file is picked up only when it is
complete (handoff names it, `ffprobe` reads it, md5 stable). When he says to ship fast, fixers get a hard
stop and the rest goes on a list. Everything is logged in `run-log.md`.
→ [orchestration.md](references/orchestration.md)

## The story cut, then the connectives pass

Before visuals are locked, each lane gets a paper edit: the transcript as a script, ordered for a viewer,
with moves, splices and drops, saved as `paper.md`. A lane that needs reordering is rebuilt on a re-ordered
source. One point is made once: here he dropped a whole overview chapter that the hook and the levels
already covered (the reason is the editor's reading). → [story-cut.md](references/story-cut.md)

After the first master, read it for missing connecting words. Restore his own word first, splice from the
same session second, gate each with whisper and a Gemini 2-of-3 listening test on the final render, and put what
fails on a pickup list for him to record. Keep his breath at trim joins. Smooth flow beats the trim rule.
→ [connectives.md](references/connectives.md)

## Proof first

Every claim about the world gets the real page or post, logged out, with its source line and a highlight on
the spoken word. One pack per video, captured by topic group, audited by an independent verifier who sets
`ok` / `ok with limit` / `do not show` and safe seconds for clips. What cannot be proven is not illustrated
as fact and is listed in the report. Never the community price.
→ [proof-first.md](references/proof-first.md)

## The recreated Claude window

Finder: new folder, files dragged in. Claude: the folder dropped on the composer, the skill pasted, the real
prompt typed, the real storyboard and the real render coming back, connector tools appearing, a tool call
returning a clip. The model chip is the model that really did the build. "Recreated" is always in frame (the engine pins the
stamp top right when the camera pushes in past it);
staged demos say "Recreated · example"; inventions say "Illustration". Text must read on a phone, so the
camera frames the prompt and the reply.
→ [recreated-windows.md](references/recreated-windows.md), snippets in [templates/yaml/](templates/yaml/)

## Full showcase clips and big proof beats

The finished pieces play whole, full screen, with their own sound at about −17 LUFS, each with a chip
saying what it is and a credit line for anything he did not make. Third-party footage is credited and
small. Award and press beats are big: at least 85% of the frame width.
→ [showcase-and-proof-beats.md](references/showcase-and-proof-beats.md)

## The intro hook

Written last. A cold open on a finished piece, then phrase by phrase on real later moments, job-title
beats (real prompt → piece → title, then "Example placements"), a level chip on each level's sentence, the
award in the order handover → headline → finalists, and him to camera on the last line.
→ [intro-hook.md](references/intro-hook.md)

## Three layouts

Panel + tile by default, full-screen visual when the thing is the point, full-screen him for a personal
point. Switch on sentence boundaries. The engine option is `layout: panel | full | him` on the scene, and a
switch is a hard cut; the older two-render compose (`compose_layouts.py`) is the fallback for an engine
without it. A chip or a steps strip that stays up across layouts is a top-level `overlays:` entry.
→ [layouts.md](references/layouts.md)

## Chapter path cards with breathers

One card design for the whole video: done chapters dimmed, a line travels one step to the current one,
upcoming ones locked. Each sits in a 1 s breather that starts at a real pause, on clean room tone, with his
click. Card titles are the chapter list. In Borumi each is a "Card · title" scene. Inside a lane the engine
draws them (`chapters.style: path`, opt-in `chapters.breather`); between lanes `assemble.py` inserts a card
clip. A lane with `chapters.breather` needs `"breathers": false` on its segment.
→ [chapter-cards.md](references/chapter-cards.md)

## Sound

- His voice at −16 LUFS. Full clips about −17. No music unless he asks.
- **No whooshes.** His rule. Clicks on sends, pops on titles, his chapter click. Nothing else.
- Breathers and inserted cards sit on clean room tone from his own recording, never digital silence, never
  a window with a breath or a laugh in it.
- Effects are a separate stem and separate clips in Borumi, never baked into a lane render.

## Master assembly and checks

One config lists the segments in order: lane renders, cards, full clips inserted at the split points the
lanes report. The assembler writes the master, a no-effects copy for Borumi, the effect list, chapters and
captions. A fast automated check runs after every assembly (loudness, silences, breathers, join frames,
whisper at changed joins, captions). Then the whole-video review.
→ [assembly-and-checks.md](references/assembly-and-checks.md), [templates/assemble.example.json](templates/assemble.example.json)

## The Borumi working edit

A new project, never his own. Every write is one verified transaction, dry first. A filled project is
rebuilt in place. An emptied scene's 3 s wallpaper gap is closed to one frame. Tell him before changing what
he is watching. → [borumi-working-edit.md](references/borumi-working-edit.md)

## Scripts

In `scripts/` beside this file. Each prints its usage with `--help`. Nothing is built in: each takes flags
or a JSON config (`assemble.py` reads `<work dir>/tools/assemble.json`).

| Script | What it does |
|---|---|
| `assemble.py` | segments config → master, no-effects copy, effect list, chapters, captions |
| `check_master.py` | the fast automated check on a master |
| `chapter_cards.py` | one path card clip per chapter from the chapter list: for cards between lanes, and the fallback for an engine without `chapters.style: path` |
| `showcase.py` | a full-screen showcase clip: chip, credit line, slow push, loudness to a target |
| `room_tone.py` | a clean, transient-free room tone from his recording |
| `splice_connective.py` | restore or splice one of his own words at a join, with the listening gate |
| `compose_layouts.py` | fallback for an engine without `layout:`: cut a panel render and a reference-look render together on frame ranges |
| `make_scenes.py` | assembler output → Borumi scene list with "Card · title" scenes |
| `borumi_build.py` | fill a new, EMPTY Borumi project from a master in one verified transaction (`--dry` first) |
| `borumi_rebuild.py` | rebuild a FILLED Borumi project from a new master in one verified transaction (`--dry` first) |
| `borumi_gapfix.py` | close an emptied scene's 3 s gap to one frame. It COMMITS unless you pass `--dry` |
| `remix_no_whoosh.py` | rebuild a master's effect stem without whooshes; picture untouched |
| `proof_readme.py` | rebuild the proof pack's README and index from the source files |

## Export and hand-off

1. Write the exports under a **new version name**: the mp4, `.chapters.txt`, `.srt`; a 720p phone copy; an
   intro copy; a contact sheet. Never overwrite an earlier export.
2. Show him the previews in the reply and bring the working edit to the front in Borumi.
3. Report: length and chapters; what is recreated, example or illustrative; unproven claims; pickup lines;
   changed joins with times; the next-version list; credits spent.
4. Publishing (title, description, chapters, captions, thumbnail, upload) belongs to the `youtube-publish`
   skill. Hand it the exports. Nothing is uploaded or posted without his explicit OK.

## His taste

Everything he said during this edit, as a checklist in his words: [his-taste.md](references/his-taste.md).
What each round taught and every mistake made: [claude-ads-case-study.md](references/claude-ads-case-study.md).

## Quick start: the next video like this

1. `screenplay init` one work dir per recorded scene under `<work dir>/lanes/`, and write the plan and rule files (`PLAN.md`, `WRITER.md`, `LAYOUT.md`, ...) from [templates/](templates/).
2. One writer per lane, then independent reviewers and fixers, using the engine's layouts (`layout:`), path chapters (`chapters.style: path`) and recreated windows ([templates/yaml/](templates/yaml/)).
3. `assemble.py` → `check_master.py` → `borumi_build.py` (`--dry` first), then export and hand to `youtube-publish`.
