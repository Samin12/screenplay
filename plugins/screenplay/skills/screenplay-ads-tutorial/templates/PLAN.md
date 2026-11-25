# <Video>: the whole edit (boss plan)

<Creator> filmed a <N> min tutorial: "<working title>". This is the edit of all of it with the screenplay
engine. The boss plans, briefs, reviews and assembles. One writer per lane. Independent reviewers check
every render.

- `W` = `<work dir>` (this folder)
- `P` = `<project>` (the real assets; READ-ONLY, copy out)
- Engine: `$SCREENPLAY_HOME` (`screenplay` CLI on PATH)
- Raw recording project: "<name>". **Nobody writes to it.**

## His request (his words)
"<paste the ask, word for word>"

## Lanes (each is its own screenplay work dir: own cut, own A-roll, own render)

| Lane | Raw scene | Raw length | What it is | Writer |
|---|---|---|---|---|
| `lanes/S1` | Scene <n> | <s> | The intro hook. **Written last**, from the finished lanes | Intro |
| `lanes/L1` | Scene <n> | <s> | Level 1: <what> | L1 |
| (slot) | | | Level 2 card + the full <piece>. **Boss builds it** | boss |
| `lanes/L2a` | Scene <n> | <s> | <what> | L2a |

## Boss decisions on the cross-lane cuts (the per-lane detector cannot see these)
- **<lane> tail**: "<abandoned lead-in>" is restarted by <next lane>. Cut it. Ends on "<words>".
- **<extra take> moves**: it plays inside <lane>, right after "<words>". Reason: <why>.
- **The full <piece>** plays inside <lane> right after "<words>". The writer does NOT render it: report the
  exact output time of the split. The boss inserts the clip.
- **Dead takes**: keep the LAST good take of any restarted sentence. Verify on the audio.

## Chapters and tip numbers (one scheme for the whole video)
No badge may contradict a number he says aloud.

| # | Card title | Lane | His words at the anchor |
|---|---|---|---|
| Level 1 | <title> | L1 | (lane start) |
| Tip 1 | <title> | L1 | "<words>" |

Every lane's `chapters.items` lists ALL chapters in this order with these titles; only the ones in that lane
get an `at`.

## What the edit must be (the bar)
1. **Screen-style. Every idea is shown on a computer.** Recreated `finder` and `claude-desktop` windows
   driven by the cursor, with the real files, the real prompts and the real results. Each says "Recreated".
2. **His real screen**, where he recorded it, is shown live and whole.
3. **Coverage**: no bare talking head or static screen for 3 s or more. Something changes every 1.5 to 3 s.
4. **Every claim, number or product** gets the real page from `W/proof/` or the real file from `P`.
5. **The real outputs are the stars**: on "like this" / "you can see", the real piece is on screen, big, playing.
6. **Cuts**: retakes, false starts, filler openers; keep the last good take; verify with whisper.
   Spellings to fix in `words.json`: <Product A>, <Product B>.
7. **Sound**: voice at −16 LUFS. No music. No whooshes. Effects are added by the boss at assembly.

## Truth rules (flag, never present as fact). `W/FACTS.md` wins over this list.
- **Model chip** in the recreated Claude window: <build A> was built by <model>; <build B> by <model>.
  Never the preset's default.
- "<claim he makes that is wrong>": do NOT illustrate it. Keep <the true thing> on screen.
- "<spoken figure>": the real figure is <x> (`P/<log>`). Show the log's figure.
- "<link in the description>": a neutral card. No URL, no repo name.
- The community page: only the no-price crop. Never the price.
- On-screen text is labels and his own words. Never new sentences in his voice.
- Never a real email, key, account id or private path.

## Assets (read the README in each before you design)
- `P/<build-a>/`: <final video>, <storyboard>, `README.md` (exact prompt per step), <logs>.
- `W/proof/`: logged-out captures (index in `W/proof/README.md`).

## Generated B-roll budget
<total> credits for the whole edit. Each lane at most <n>, only for an analogy that truly needs it. One job
at a time, cost checked first, every job logged in `W/CREDITS-LOG.md`. Most lanes should need zero.

## Never
Delete a file (version names instead). Write to the raw recording project. Run a formatter on the engine
repo. Edit engine code (one engine owner does). Publish, upload, post. Start other agents.
