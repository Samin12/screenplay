---
name: screenplay-demo-edit
description: Edit a long (20-40 min) Borumi screen-demo tutorial end to end the way "Hermes Trader" (Nov 2026) was made - his real screen shown live and whole whenever he uses the computer, motion graphics only on concepts and the hook, Higgsfield pixel-art B-roll for analogies, recreated chat replicas for "my bot told me", real proof pages for every claim, key-only privacy blurs, parallel part writers on the screenplay engine, then a final assembly in a Borumi project (chapter scenes, 1 s chapter breaks with his click, whoosh/pop sound effects, filler "but"/retake cuts verified with whisper). Use when asked to "edit it like the Hermes Trader video", to edit a long screen-recording tutorial with the screenplay engine, to assemble a render in Borumi with chapter breaks and cuts, or to resume such an edit.
---

# screenplay-demo-edit

A long tutorial is two kinds of footage glued together by his voice: **talking** (hook, concepts, stories) and
**doing** (his real screen while he clicks, types, installs). The rule that made this video work: talking gets
the full motion-graphics treatment; doing gets his real screen, live and whole, with almost nothing on top.

This skill sits on top of [`screenplay-edit`](../screenplay-edit/SKILL.md) (the engine, its YAML, its style
rules). Read that skill first; this one adds what a 30-minute screen-demo video needs.

Two places, two jobs:
- **Screenplay work dir** (`~/Borumi Projects/<Video> screenplay`): everything visual. Output = one render
  (`out/<Video> vN.mp4`) plus a short intro render when only the hook changes.
- **Borumi project** (`<Video> working edit`): the assembly he reviews and finishes in. Scenes per chapter, a card
  scene before each chapter, sound effects as separate clips, retake cuts. Built by one script in one verified
  transaction, so it can be re-run after every new render.

## The pipeline

| # | Step | Where | Reference |
|---|---|---|---|
| 1 | Split the raw Borumi recording by chapter so he can see it | Borumi | [borumi-assembly.md](references/borumi-assembly.md) §1 |
| 2 | `screenplay init --borumi`, transcribe, cut, aroll, brief | work dir | `screenplay-edit` steps 1-2 |
| 3 | Build the **screen plates**: his raw screen recordings re-timed to output time, privacy blurs baked in | work dir | [privacy-blurs.md](references/privacy-blurs.md) |
| 4 | Write `plan.md`, `parts.md` (word ranges per part), `WRITER.md` | work dir | [parallel-parts.md](references/parallel-parts.md) |
| 5 | Make assets: Higgsfield B-roll, proof captures, replicas, tweets | work dir | [broll-higgsfield.md](references/broll-higgsfield.md), [intro-and-stories.md](references/intro-and-stories.md) |
| 6 | One agent per part writes `parts/<X>.yaml` in its own lane, checks with sheets | lanes/ | [parallel-parts.md](references/parallel-parts.md) |
| 7 | Live-screen pass on every part with a screen | parts/ | [live-screen.md](references/live-screen.md) |
| 8 | Merge, check, render (whole video, or `--from/--to` for the intro) | work dir | `scripts/merge.sh` |
| 9 | Chapter-break clips from the render, then assemble in Borumi: scenes, cards, SFX, cuts | Borumi | `scripts/make_cards.py`, `scripts/borumi_assemble.py` |
| 10 | Verify every cut by ear-proxy (whisper on the exported mix), export previews, show him in chat | Borumi | `scripts/verify_cuts.py` |

Each round of his notes usually touches steps 6-10 only. Don't redo plates, B-roll or privacy unless he asks.

## His rules for this kind of video (all from his notes on v2-v7)

**Doing (screen) parts**
- Whenever his screen moves or he's doing something on it, show it **live** (`kind: app`, `start: auto`), the
  **whole screen**, for the whole stretch. 30-90 s of plain live screen is the goal. "I want to show live so
  people can see how I use the computer uninterrupted."
- Few zooms (1.2-1.3x, about one a minute, only when the thing is unreadable). None on a sponsor's dashboard
  (Hostinger) or on a desktop app he's showing whole (Hermes Desktop).
- Graphics only when his screen is idle and he stops to explain a concept, 3-8 s, then straight back.
- A highlight or callout here and there is fine; nothing else on a moving screen.

**Talking parts**
- Motion on everything: something changes every 1.5-3 s, nothing empty, nothing tiny.
- Analogies are acted out with Higgsfield pixel-art B-roll (same recurring protagonist), timed so the clip's
  reveal lands on his punch word.
- "My bot told me this" = a recreated chat replica (Telegram) with the bot's words, stamped "Recreated".
- Every claim, number and news item gets the real page or tweet, captured logged-out, with a source line.

**The hook (first ~75 s)**
- Frame 1 must be readable and enticing (it was the Discord page with labels scanning over it), not a blur of cuts.
- Visualize **every phrase** of the first 12 s with a real moment from later in the video, about 1.5-2 s each,
  whoosh on each cut.
- "Level 1/2/3" teasers show framed previews of those later moments, with a pop on each level title.
- A story with stakes ("before the vote my bot told me...") gets real dated proof, then the bot's message, then
  the outcome, then the bot's follow-up.
- Reference: his own "Claude Just Changed the Stock Market Forever" (youtube lH5wrfNwL3k), first 5 s.

**Privacy**: blur only API keys, tokens, account ids, passwords, OAuth codes, public IPs, server hostnames,
emails, and other people's private DMs. Show Discord servers, chat titles, sessions, localhost. Cut a login
flow instead of blurring it.

**Cuts**: remove retakes, false starts and filler sentence-openers ("But,", "Okay, so", "Well,", "But anyways,")
across the whole video. Verify each one on the real audio; Borumi's transcript invents repeats.

**Story cut (before any visual is locked)**: paper-edit every part first. Write its transcript as a script, order it for
the viewer (what it is → why it matters → how, steps in order → tip → result), move sentences he said out of order,
splice clean halves of takes, and drop hedges, "right?", "honestly", "really", superlatives and repeated points. Never
change his meaning; a moved line takes its visual with it; every join is on a word boundary in measured quiet and verified
with whisper; reviewers do a listen-only flow pass. Save `paper.md` with source timestamps. Details:
`../screenplay-edit/references/taste.md` → "Story cut before visuals".

**Chapter switches**: a 1 s breather where the chapter card builds silently with his click sound
(`create-chapter-transitions` repo, `chapter-transition-quiet.wav`), then the card holds while he starts talking.

Full history of what he rejected and why: [hermes-trader-case-study.md](references/hermes-trader-case-study.md).

## Tools

- `screenplay` CLI (engine in this repo). Lane checks: `scripts/lane.sh <X> check|sheet ...`.
- Borumi MCP through the local bridge (`POST http://127.0.0.1:47811/call {tool,args}`); every edit is a
  transaction: `begin_project_edit` → edits with `timeline_hash` → `commit_project_edit` (or abort).
- Higgsfield CLI (`higgsfield generate ...`) for keyframes (nano_banana_pro) and clips (seedance_2_0).
- BrowserOS neo (`browseros-neo` MCP, `run`) for logged-out proof screenshots of articles and tweets.
- `whisper-cli` with `~/.cache/whisper/ggml-large-v3-turbo.bin` for cut verification.
- Sounds: Borumi built-ins `/Applications/Borumi.app/Contents/Resources/built-in-sound-{whoosh,pop}.wav`,
  his click from `Samin12/create-chapter-transitions` (`assets/chapter-transition/chapter-transition-quiet.wav`).

## Scripts (copy into the work dir's `tools/` or the Borumi agent dir and edit the config at the top)

| Script | What it does |
|---|---|
| `scripts/merge.sh` | `edit.header.yaml` + `parts/*.yaml` → `edit.yaml` (or a lane's) |
| `scripts/lane.sh` | private lane per part writer (symlinked media, own `.screenplay`), then runs `screenplay <cmd>` |
| `scripts/blur_policy.py` | filters an OCR blur list down to key-only kinds (template; edit KEEP/DROP) |
| `scripts/make_cards.py` | 2 s chapter-break clips from the render's chapter frames |
| `scripts/borumi_assemble.py` | rebuilds the Borumi working edit from a JSON config in one verified transaction |
| `scripts/verify_cuts.py` | whisper on a few seconds around every cut in the exported mix |

## Delivering

- Embed the previews in the reply (`![](/abs/path.mp4)`) so he judges them in chat: the intro and one chapter
  break at minimum. Frame-check them first (`ffmpeg -ss T -frames:v 1`).
- Say what's recreated or illustrative, what you cut and where, and anything the transcript lied about.
- Never publish or upload. Never delete his older projects without asking.
