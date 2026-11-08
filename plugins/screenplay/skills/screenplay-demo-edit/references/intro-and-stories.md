# The hook, stories, proof and level previews

The first 75 s get the most work. Reference: his own "Claude Just Changed the Stock Market Forever"
(youtube lH5wrfNwL3k, 1.8M views), first 5 s: a fast montage of real screens, pop on titles, whoosh on cuts.

## 1. Frame one
Open on the most enticing real moment of the whole video, slow enough to read. In Hermes Trader that was his bot
reading a trading Discord with its pink element labels sweeping over the page: a `stage` with an `image` of the
live plate (`src: media/screen-b.mp4`, `start: <plate seconds>` so it plays, not a still), cropped to the
interesting region, one short caption. His note on the first try ("too fast, not clear") means: 2 s minimum on the
first shot, then the montage.

## 2. Every phrase of the first ~12 s gets a real later moment
Read the first sentences as phrases and give each one 1.5-2 s of a real moment from later in the same video, hard
cuts, a Borumi whoosh on each cut (120 ms early, -6 dB):

| His words | What showed |
|---|---|
| "Claude just changed how we trade stocks forever" | Hermes reading the Discord (live plate, labels moving) |
| "this new setup" | a `tree`: Hermes Agent → Claude, QuiverQuant, Alpaca, each child on its word |
| "Wall Street whales" | Claude's answer pulled from QuiverQuant (plate frame) |
| "US politicians are buying" | the real Pelosi page on QuiverQuant |
| "plays those trades for you" | Claude buying NVIDIA (a still pulled from the exact plate frame) |
| "run 24/7" | the Hermes scheduled-jobs list |
| "improving every single week" | his bot's dashboard, labelled "paper account" |

Find the moments by reading `brief.txt` for the later mention and pulling plate frames around it
(`ffmpeg -ss <s> -i media/screen-b.mp4 -frames:v 1`). If a moment only lasts a frame, freeze that frame to a PNG
in `media/part-A/` rather than playing the plate from a guessed second (a guessed second showed the wrong page).

## 3. A story with stakes: proof → bot → outcome → bot
"Before the vote, my bot told me this" was built as four beats, cut on his words:
1. **Real dated proof that a person could have known**: a logged-out capture of an article from a month before
   (Plante Moran, Oct 1, "Midterm elections: Volatility before clarity"), `url` + `source` line, a box highlight on
   the headline, a marker on the line that matters.
2. **The bot acting on it**: the `telegram` replica with a custom message (`data.messages`, `illustrative: true`,
   dated), camera 1.3-1.4 on the message, a marker on the action line ("raised cash to 25%"). The engine stamps
   every bot bubble "Recreated". Never pass a recreation off as a screenshot.
3. **The outcome**: the real tweet/image (the red Nov 5 heatmap), with source.
4. **The bot's follow-up**: the same replica, next message revealed (`set: { upto: update }`), callout in his words.

Pop (-3 dB) on the warning card; whoosh on the cuts between beats.

Capturing proof: BrowserOS neo (`run` with `browser.open(url)`), logged out, full-page PNG at 2x into `proof/`,
with a `proof/<name>.json` holding url, title, date, capture date and the exact quote. Search for a source dated
before the event; never invent one. For X posts, capture the whole thread when the reply is the point (the
"Introducing Personal Finance in Claude" tweet + the "Read the room Claude." reply), stitched into one image with
highlights on both.

## 4. Level previews
"Level 1 / 2 / 3" lines: first a `story` with three `counter` actors (pop on the title), then for each level 1-3
framed previews of that level's real later screens (titles `*1* · Claude and the setup`), one `stage` per preview
(stacking previews in one scene made them tiny). Pop on each level title.

## 5. Callbacks later in the video
When he refers back to something shown in the hook ("it can read their calls", 1:03), show the same live moment
again (the Discord labels scan), not a new graphic.
