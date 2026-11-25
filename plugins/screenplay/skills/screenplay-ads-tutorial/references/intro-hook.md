# The intro hook

About 60 s. Written **last**, from the finished lanes, because every beat is a real moment from later in
the video. The base recipe is in `screenplay-demo-edit` (`references/intro-and-stories.md`). This file is
what this kind of video adds. The hook went through eight versions here; the rules below are what survived.

## Shape

1. **Cold open**: one finished ad, whole, with its sound. Then him.
2. **Phrase by phrase**: every phrase of his first sentences gets a real moment from a later part, about
   1.5 to 2 s each, hard cuts, no whoosh.
3. **The promise, to camera**: one short beat of him full screen ("in this video I'm going to show you…").
4. **Job-title beats**: what Claude is now, one window per title.
5. **The levels**: one sentence per level, each with a level chip.
6. **The effort line** ("all I needed to do was type, look, approve"): a recreated window doing exactly
   that.
7. **The credential**: the award, in order.
8. **Him, to camera, on the last line.** Nothing mid-animation on the last frame.

Frame 1 after the cold open is the pieces, not him: a cut from him to a near-identical him is a jump cut.

## Job-title beats

For "a motion graphic designer, a product animator, an ad maker for your business":

- One recreated Claude window per title: **the real prompt** already in the chat → **the finished piece**
  playing in the chat → the job title landing on its word.
- The title pill enters with the cut, not half a second after. Each window is up about 1.5 s; keep the
  prompt short enough to read in that time, or zoom to one line of it.
- "Recreated" and the real model on every window.
- "For your business" has no proof (nobody's business ran these). Show an illustrated beat titled
  **"Example placements"**: the pieces on a product page, a phone, an event screen. The label must be big
  and bright and up long enough to read; the first version flashed three mockups in 1.3 s under a dim
  label and was flagged. A spec piece is not shown as if the brand ran it.

Template: `../templates/yaml/job-title-beat.yaml`.

## Level chips

- One chip style for all levels (dark rounded chip, accent dot and number), top left, on screen for the
  whole of that level's sentence, across the window and the full-bleed piece that follows it.
- Text: "Level 1 · <what it is>". Same titles as the chapter cards.
- If he never says "level two" aloud, the chip carries it and the line goes on the pickup list. His
  question after watching: "is there nowhere I say level 2?"

The chip is an engine option: a top-level `overlays:` entry `type: chip` (`text`, `eyebrow`, `corner`,
`at` / `until`), so it stays up across the window and the full-bleed piece. It is not a `show:` element.
Template: `../templates/yaml/level-chip.yaml`. A "four simple steps" mention gets a steps strip:
`steps-strip.yaml` (a top-level `overlays:` entry `type: steps`).

## The award, in order

handover → headline → finalists.

- The handover clip, full bleed, in point after any cropped text.
- The press headline, at least 85% of frame width, both marks on his words.
- The shot of him with the award lands on the title he says.
- Then the finalists photo, a slow push-in.
- Then back to him for "let's get into it". No award footage under that line.

Use the award footage, not his own submissions. His note: "clearly show the cool AI Grandmaster videos."

## Clips whole, on their best moment

- Each finished piece is shown whole in frame, not cropped into a tile.
- Pick the in point by looking at the piece: the transform, the reveal, the product in focus. Write the
  chosen second for each piece in the handoff.
- Three pieces together: a tight 2 + 1 with thin gutters, each as large as the frame allows.
- A full-bleed piece after a window: hard cut, the piece already in motion.

## Sound

- Hard cuts, no whooshes. A pop on a title, a click on a send.
- Keep his breath at every trim join. See [connectives.md](connectives.md).
- The opening sentence usually needs a connective after the first claim ("Because Claude can now…").
- Do not open on filler ("Okay, so"). If the first words after the cold open are filler and cannot be cut
  cleanly, cover them with the pieces and say so.
- A quiet tail between the cold open and his first word should not be boosted: it exposes hiss.

## What he rejected

| Version did this | His note or the review | Fix |
|---|---|---|
| His own submissions under the win | show the award footage | handover → headline → finalists |
| Clips small in cards (about 60 to 67% width) | make them whole and big | full bleed; article at 91% |
| Four trimmed pointer phrases with butt joins | the joins are jarring | breath kept; two phrases restored |
| Levels only implied | levels unclear | level chips; pickup line for the missing words |
| "Example placements" in 1.3 s, dim label | too fast, too dim | fewer mockups, longer, bright label |
| A tool count on a connector | not backed | painted out |
| The same sentence as the next chapter's opening | repeat | the next chapter lost it, then was dropped |
| Award handover opening on cropped stage text | flagged | later in point, longer hold |

## Deliver

A separate intro preview (cold open to the end of the first showcase), a 1 fps sheet of the hook, and a
before/after clip for any join he asked about.
