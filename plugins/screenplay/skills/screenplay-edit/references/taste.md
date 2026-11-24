# Taste log

One line per learned preference, newest last. Read before planning beats (SKILL.md step 2).
Format: `- YYYY-MM-DD: <rule> (why: <the feedback>)`

- 2026-11-01: (reference look only) Corner webcam tile sits bottom-left; when the scene points at a left sidebar or left-aligned text, use `webcam: pip-right`. (why: tile covered the sidebar rows in the first demo)
- 2026-11-01: (reference look only) Terminal and chat replicas need `camera: {scale: 1.45, target: scrollback}` (or similar) so mono text reads on a phone. (why: the unzoomed terminal looked empty and tiny)
- 2026-11-01: Full-width elements (composers, terminal input) can't be lifted bigger; the engine spotlights them instead, so don't fight it with `scale:`. (why: the lifted composer overlapped itself)
- 2026-11-01: (reference look only) If a plate or video shows Samin's face, hide the tile. (why: two faces on screen in the second demo)
- 2026-11-01: Show real footage playing inside the UI rather than a poster still, and don't leave one UI static past ~6 s. (why: the T3 thread sat still for 11 s; the independent reviewer's top note)
- 2026-11-01: Use the house layout for every video: Samin in the tile on the right, all motion graphics in the left panel, step badge above the tile, from the first frame. Don't hide or move the tile for a plate. (why: "like my other videos, where I am on the right in a little box and all the motion graphics will be happening on the left so that we can keep consistent")
- 2026-11-01: For a claim, show the real page in an `image` card (`url`, `source`, `crop` to one paragraph, a marker on the phrase, on the word), not a diagram or a counter. Diagrams are for concepts with no screenshot. If he rounds or overstates, the screen shows the source's exact line and the report flags it. (why: his reference frame; his finished video shows Adobe's "$23.77 billion" line where the first demo animated "$23B")
- 2026-11-01: Chapter elements last 2 s at most. (why: he trimmed a 2.8 s pause himself, proof-first creator-style §4)
- 2026-11-01: A chapter switch is the one planned break from the layout: the chapter card takes the full screen for its 2 s, then cuts back to the tile and panel. (why: "let's say we're switching a chapter or something, then you can have it for the full screen")
- 2026-11-03: Analogies become story motion graphics: build the analogy as a little animated scene (`type: story`: people, props, a running number, moves on his words), not text on screen. (why: "whenever I'm talking about analogies, actually build out motion graphics in a story format so we can see what's happening")
- 2026-11-06: Every part of the video has motion graphics: no stretch of 3 s or more without something moving that helps understanding (his REA bar: longest empty panel 0.63 s). Measure gaps before review; a cut with half its runtime as bare talking head or plain screen recording "sucks". (why: Hermes Trader v2 had 286 s bare talk + 766 s plain screen; his verdict)
- 2026-11-06: Demos keep the real screen and the live feel (natural UI pauses stay), but get motion ON it: a camera that zooms to follow the action, step callouts in his words, lifted UI cards of what he clicks or what the AI returns, explainer scenes while the AI is working. Rings alone are not motion graphics. (why: same feedback; "keep that live feeling when demoing")
- 2026-11-06: Concepts are visualized the way his best videos did it (read `references/concept-visuals.md`), with cinematic AI B-roll generated in Higgsfield and hand-drawn Live Ink explainers timed to his voice, not just text cards. (why: "look through my actual YouTube videos and the ones that did really well... use B-roll and create it with Higgsfield... use the live ink in my GitHub to start drawing and explaining")
- 2026-11-06: Show the real tweets/posts behind the news he cites (a tweet card with the key line highlighted), on the word. (why: "show these tweets and stuff where applicable")
- 2026-11-06: When a take is filmed out of order (a scene meant to replace a point in another scene), move it into place in the edit and cut the old point; never just leave it where Borumi put it. (why: his concert-tickets take sat as scene 2 instead of replacing the weather-radar point in scene 3)
- 2026-11-07: When he says his bot or AI "told me" something, show it: a replica of the real app (Telegram, Claude) with that message on screen on his words, carrying the engine's "Recreated" stamp when the message is rebuilt, and no numbers or results he doesn't say. (why: "when I said my bot told me this, I want you to create something on Claude or Telegram with screenplay to show what it said")
- 2026-11-07: The bar is his "Paste This Into Claude v2" edit: nothing may read sloppy. No grey blur slabs or half-faded cards, no near-empty panels, no label sitting on the text it points at, no words cut at a crop edge, private areas framed out rather than smeared. (why: "right now I'm seeing a video that looks really sloppy and very amateurishly edited... like this was good, Paste This Into Claude v2")

## Story cut before visuals (Samin, Nov 24 2026, Claude Ads L1 v2: "some parts are not flowing logically")
- Paper edit first: write the transcript as a script and order it for the viewer (what it is → why it matters → how, steps in order → tip → result). Save `paper.md` with source timestamps for every piece.
- Move sentences when he said them out of order; splice the clean half of one take onto the clean half of another; drop asides, hedges, "Alright?", "right?", "Okay, so", "honestly", "really", superlatives and repeated points (keep the best one).
- Never change what he means or splice words into a claim he didn't make. A line that moves takes its visual with it.
- Joins: word boundaries in measured quiet, matched room tone, every join verified with whisper on the real audio; a splice that jumps his head lands where the panel is busy. List the joins worth a listen.
- To reorder with the engine: build a re-ordered camera + mic with ffmpeg first, then `init` on those; `paper.md` keeps the map back to raw time.
- Reviewers do a listen-only pass for flow before looking at pictures.

## Proof first for every claim (Samin, Nov 24 2026)
- Every claim about the world gets real proof on the exact words: the real page, post or video, logged out, with url + source line and a highlight on the spoken word. "Claude can make motion graphics" → real examples people built and posted, not our own renders.
- Build one proof pack per video (`proof/README.md`, `proof-index.json`, `do_not_show`), captured by one worker per topic group and checked by an independent verifier (method: the `proof-first-video-editor` skill, Step 3).
- Proof beats recreation for claims about the world; recreation is for "here's what you type and what you get back".
- A claim that can't be proven is not illustrated as fact; it goes in the report.
