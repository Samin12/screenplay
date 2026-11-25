# Proof first

His rule, quoted in [his-taste.md](his-taste.md) (Proof): show proof of every claim, including examples
from the internet that other people built. The method is the `proof-first-video-editor` skill, Step 3. This
file is how it ran here.

## Two kinds of visuals

- **Proof** is for any claim about the world: a capability, a product, a model, a sale, a win, "this is
  trending".
- **Recreation** is for "here is what you type and what you get back".

Use both: the proof on the claim, the recreated window on the doing.

## One pack per video

`<work dir>/proof/`:

| File | What |
|---|---|
| `README.md` | the index: file, claim it supports, what it honestly shows, the source pill, use (`ok` or do not show) |
| `proof-index.json` | the same, machine-readable, with `do_not_show` |
| `name.png`, `name-crop.png` | the capture and the crop to use on screen |
| `name.source.json` | url, page title, date, the exact quote, the pill text, a one-line description |
| `media/*.mp4` | short clips of other people's work, muted |
| `VERIFY.md` | the independent verifier's table |

`scripts/proof_readme.py` rebuilds the README and index from the `.source.json` files. Re-run it after every
capture group.

## Capture

- `FACTS.md` first: one worker checks every claim in the transcript against official pages and the real
  project logs. It lists what is true, what is wrong, and the exact figures. It wins over the plan.
- Then one capture worker per topic group. Here: official pages; other people's Claude-made motion
  graphics; products, the event and the concepts.
- Logged out, fresh browser profile. Posts are captured from the public embed so no viewer account is in
  frame.
- Like and view counts move. Show them as captured, rounded, with the pill.

## The independent verifier

A different model audits the whole pack, read-only:

1. Opens every crop and every clip's contact sheet.
2. Live-checks each url and compares the quote word for word.
3. Runs an OCR sweep over every image for emails, prices, logged-in menus, cookie banners, ads and
   competitor names.
4. Gives each record a verdict: `ok`, `ok with limit`, `do not show`, `wrong`, plus **safe seconds** for
   every clip.

In this edit: 64 records, 14 ok, 42 ok with a limit, 8 do not show. The verifier moved 5 records to do not
show that the capture workers had marked ok.

## Do not show

Typical reasons, all seen here:
- a price or a join button in frame (his own community page: use only the crop with no price)
- profanity in the first line of a post
- a post that is cut off mid-sentence, or one with almost no engagement
- a clip that carries a banner for another tool for its whole length
- third-party usernames
- a full-page capture too tall to read

A do-not-show file stays in the pack as a record. No lane may use it.

## Safe seconds

Each clip of someone else's work has a range that is clean to show (no banner, no handle burned in, the
claim visible). Lanes use only that range, muted, small enough to read as a quotation, with the source line
on it. See [showcase-and-proof-beats.md](showcase-and-proof-beats.md).

## On screen

- A `stage` image with `url` and `source` ("domain · captured <date>"), cropped to the relevant part, with a
  highlight landing on the spoken word, on the exact words that make the claim.
- Template: `../templates/yaml/proof-card-with-source-and-highlight.yaml`.
- If he rounds or overstates, the screen shows the source's exact figure and the handoff flags it.

## What could not be proven

Some claims had no credible source: that a visual style "is trending", a sweeping line about what one person
can now do, a tool he named that has no public page, a product he said a platform offers when it does not,
"run it locally" for a closed model.

How each kind was handled:
- **No source**: not illustrated as fact. The screen stays on something true (the real result, his own
  file). Listed in the handoff under "Unproven claims".
- **Wrong**: the spoken word is cut at the paper edit when it can be cut cleanly; nothing on screen repeats
  it. The fact-check capture is kept as a record, never shown to illustrate the wrong line.
- **No public page for his own tool**: show the real local run instead.
- **No business proof for "for your business"**: an illustrated beat labelled "Example placements", see
  [intro-hook.md](intro-hook.md).

The final report lists every unproven claim so he can decide.

## Never

The community price. A capture with an account name or email. A number, URL or repo name that no file
backs. A capture from the do-not-show list.
