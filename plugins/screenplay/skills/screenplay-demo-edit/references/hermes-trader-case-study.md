# Case study: "Claude Just Changed How We Trade Stocks Forever" (Hermes Trader), Nov 2026

A 33-minute tutorial: build an AI trader in three levels (Claude + QuiverQuant + Alpaca, then Hermes on a
Hostinger VPS running 24/7, copying Congress and a Discord trader). 11 Borumi scenes of raw footage: camera, mic
and two kinds of screen recording. 13 chapters. This is what each version taught.

| Version | Made with | His verdict | Lesson |
|---|---|---|---|
| v2-v3 | editroom (cutroom engine, parallel agents) | "this sucks", "sloppy and amateurishly edited" | Over half had no motion (286 s bare talking head, 766 s plain screen). Text cards standing in for visuals, empty shells, tiny crops, a static screen for many seconds. |
| v4 | screenplay engine, 13 parts in parallel lanes, Higgsfield B-roll, new `telegram` replica, OCR privacy blurs | Good look, but too much on his screen | Motion on every part works for talking. Concepts acted out as B-roll stories land. |
| v5 | live-demo pass on the screen parts | Better, still too zoomed and too blurred | Screen parts are demos: few cuts, show the real screen. |
| v6 | live-screen rule everywhere, key-only blurs, hook montage of real later moments, level previews | Intro first 2 s "too fast, not clear" | Whole screen, live, whenever he uses the computer. Blur only keys and truly sensitive values. |
| v7 | intro re-render + Borumi assembly (cards with his click, SFX, verified cuts) | (current) | Frame 1 must be readable. Every hook phrase on a real moment. Stories need real dated proof. Cuts need whisper verification. |

## What ended up in the video
- **Hook (0:00-1:19)**: Discord-reading shot with moving labels, a phrase-by-phrase montage of later moments, the
  Kobeissi tweet behind "markets went crazy", the Claude Personal Finance tweet + "Read the room Claude." reply
  with the red heatmap, the midterms story (Plante Moran Oct 1 → bot raises cash (Recreated) → Nov 5 heatmap → bot
  buys back (Recreated)), "3 levels" with real previews, the Discord labels again on "it can read their calls".
- **Concept chapters (no screen)**: Models and Harnesses, Why Hermes, Where It All Runs: Higgsfield pixel-art
  stories (engine in a car, renting an apartment in a data center, a coffee maker set the night before, a smoke
  detector, an employee with a notebook), `claude-desktop` and `terminal` replicas, real proof cards.
- **Demo chapters (screen)**: his real screen, live and whole, for long stretches; a handful of 1.2-1.3x zooms;
  occasional callouts in his words; short concept graphics only where the screen was idle.
- **Honesty**: QuiverQuant returns labelled "backtest", his portfolio labelled "paper account", every recreated
  Telegram bubble stamped "Recreated", a disclaimer in the 24/7 chapter.
- **Borumi working edit**: 27 scenes (intro + card/chapter pairs), 9 whooshes, 5 pops, 13 clicks, 18 cuts (~16 s),
  32:57.

## Things that cost time (do them right the first time)
- Borumi's transcript said he repeated "like QuiverQuant" and "get"; whisper on the real audio heard one of each.
  Cutting the "repeat" removed his only take. Verify every cut on the exported mix.
- "But, and" at 1:09 sat closer to the next word than the transcript said; an RMS profile showed the "B" onset.
- A level preview played the plate from a guessed second and showed the wrong page; freeze the exact frame.
- Several previews stacked in one scene rendered tiny; one `stage` per preview.
- A camera target on the first message cropped the second message; target the message being revealed.
- The chapter card's first frame is near-black; break clips must use the render's card frames, not a still.
- Cuts didn't move the sound effects until `sound_effect_1` was added to the trim's target layers.
- Running prettier on the engine reformatted whole files (no config, hand-formatted code). Never format it.
- A union-box privacy scan blurred whole chat windows for minutes; per-hit OCR boxes held only while visible.
