# Case study: "Claude makes ads and motion graphics, in three levels" (Nov 24 2026)

A filmed tutorial, about 22 minutes raw: an intro hook, a four-step overview, three
levels (code only; Claude with Higgsfield; photoreal product ads), one stretch of his real screen, one extra
take with a tip filmed out of order. Three finished ads were the assets: a TRMNL product ad, a Dubai Future
Week promo, a Rolex spec ad. Final: 18:06.9, 18 chapters, 17 chapter cards.

## The brief

His ask is the first quote in [his-taste.md](his-taste.md): every idea shown on a computer, all the cuts,
the assets shown in full in each level. Level 1 was edited first as a pilot in its own work dir. The rest
ran as one boss with parallel lanes.

## Numbers

| | |
|---|---|
| Lanes | 9 work dirs (hook, four steps, Level 1, Level 2 opener, real screen, Level 2 build, the extra tip, Level 3 in two halves). 2 were merged by a re-ordered source, 1 was dropped by him. 7 lane renders in the final |
| Wave 1 | 7 workers at once: an engine owner, a facts and proof worker, 5 lane writers. Then 2 proof capture workers, 1 proof verifier, an intro writer, and a fixer per review |
| Reviews | 8 lane reviews, 3 whole-video reviews, 1 listen-only connectives review. All by Gemini 4 Neon; the writers were Claude Fable 5.2 and Opus 5.5 |
| Lane versions | up to v11 on one lane. Old versions kept, every time |
| Proof pack | 64 records: 14 ok, 42 ok with a limit, 8 do not show |
| Masters | v1 16:48 → v2 16:41 → v3b 18:07 → v4b 18:06.9 (longer after the full showcase clips went in) |
| Loudness | −16.3 LUFS, true peak −1.1 dBFS; parts −16.0 to −16.5; full ads about −17 |
| Borumi working edit | 39 scenes (17 "Card · title" scenes), sound effects as separate clips. Built once, rebuilt three times, gap-fixed once |
| Sound effects | 132 whooshes removed at the end, on his note. Clicks, pops and 17 chapter clicks stayed |
| Generated B-roll | 67.5 Higgsfield credits of a 1,500 budget, all on Level 1 analogies. The other lanes spent none: the real assets were the visuals |
| Engine | 8 commits during the edit (Finder replica, connector tools and tool calls in the Claude window, model chip, badge overrides) |

## The rounds

| Round | What changed | What the review caught |
|---|---|---|
| Lane v1 | First renders from each writer | Lane reviews found 5 to 15 "must" items each: things described but not shown on a computer, the default model chip, empty panels, typed text too small, untrue or unbacked numbers, retakes left in |
| Story cut (his note on Level 1) | Paper edit for every lane; Level 1 re-cut; the out-of-order tip moved into Level 2 by a re-ordered source | The listen-only pass was added to every review |
| Master v1 | First assembly with 1 s breathers | 4 blockers, 11 majors: a word clipped at a join, a breather that split after "And", a white flash after a full ad, patch artifacts in captions, a stuck badge, full ads 3 dB too quiet, a doubled sound effect, digital-zero breathers |
| Master v2 | All of the above fixed; intro rebuilt on his notes | 0 blockers. 13 fixed, 2 partly, 1 new major (the "example placements" beat too fast and too dim) |
| Connectives pass (his note) | His own words restored or spliced at 17 joins | All 17 changed joins rated natural in the next whole-video review |
| Master v3b | Path cards, three layouts, the full recap and the finished promo as their own chapters, the four-steps chapter dropped | 2 blockers (a chuckle looped into two card room tones; zoomed windows that cropped the "Recreated" stamp), 12 majors (framing, dark dips at layout switches, a 0.3 s colour flash before a card) |
| Master v4b | Shared clean room tone, segment ends pulled back to the end of speech, quick lane fixes under a 20 minute hard stop | Shipped to export. Leftovers written as a list for the next version |
| After v4b | All whooshes removed without re-rendering the picture | |

## Mistakes, and the rule each one made

| What happened | Rule |
|---|---|
| The master was assembled with a lane file that was still being re-rendered. It happened more than once; the logged case cost a full re-assembly and a second Borumi rebuild | Pick a file up only when the handoff names it, `ffprobe` reads its full length, and its md5 is the same on two reads a minute apart |
| A scene badge override added to the Level 2 build (a level badge over a section that was not a tip) made the badge drop the tip heading too early. The last review flagged it and the override was taken back out | A scene badge override is for sections after the last tip. Check the badge at every scene inside a chapter |
| The room tone for two cards was cut from a window with a chuckle in it and looped | Room tone comes from a steady window with no transient. One shared tone for all inserted cards. Listen to every breather |
| The first breathers were digital silence | Never insert silence. Always room tone |
| A breather landed after his "And", before "tip number five" | Start the breather at a real pause before the anchor, found on the RMS, not at the anchor word |
| Caption cues bridged breathers; word-patch artifacts printed in the captions | Split cues at every breather. Strip patch artifacts. Read the final srt |
| A fixer deleted regenerable scratch sheets | Never delete means scratch too. Say it in every brief |
| His own project played the opening ad's sound twice (the take and an identical sound-effect copy), clipping | Measure loudness and peak of anything taken from his project. Use one copy |
| The sound-effect mix failed with about 190 ffmpeg inputs | Build the effects stem as one wav in numpy, then mix two tracks |
| A doubled effect at the same millisecond where two segments met | Dedupe the effect list across segment joins |
| A full ad cut to one frame of a blank white window, then a half-built title | The first frame after a split must be finished. Use a pre-rendered plate when the engine blurs an element in |
| A 0.3 s colour flash before a card | End a split segment where the speech ends, not where the scene ends |
| A splice passed on a 6 s clip and failed 3 of 3 on the finished file | Judge a splice on the final render, never only on the clip |
| The listener called his untouched audio "edited" | Use a paired comparison and a control clip. See [connectives.md](connectives.md) |
| A drawn "empty slot" placeholder was left in a lane's last scene | No text placeholder in a final. Leave the space clean |
| The first path cards showed every chapter title | Upcoming chapters are locked |
| Proof cards in the full-frame look came out at about 60% width | Build full-frame plates of the same crop with the address bar and source line |
| The first Borumi build script refused a project that already had content | Keep two scripts: build (empty project) and rebuild (filled project) |
| He removed a chapter in the working edit himself; the emptied scene padded to 3 s of wallpaper | Close the gap to one frame in one verified transaction. See [borumi-working-edit.md](borumi-working-edit.md) |
| Window generators and timing specs were left only in a temp folder | Copy builders into the lane before the hand-off |
| A lane's working files were hard-linked to copies elsewhere | Give the lane its own copies before writing |
| Boosting the quiet sound under the opening pull-back exposed hiss | Do not rescue a noisy tail with gain. Lower it or cover it |

## What was left for the next version

Dark dips of 0.1 to 0.2 s at some layout switches, a few windows with too much white, a few proof cards under
85% width, two caption cues near breathers, a mic tone shift at one moved take, markers at spliced joins in
Borumi, and two pickup lines for him to record.
