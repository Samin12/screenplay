# Master assembly and checks

Each lane renders on its own. The boss joins the lane renders, the chapter cards and the full showcase
clips into one master with `scripts/assemble.py`, driven by one config file.

## Engine option or script

Inside a lane the engine now does the path chapter cards (`chapters.style: path`), the three layouts
(`layout: panel | full | him`, hard-cut switches), the `chip` and `steps` overlays, the pinned "Recreated"
stamp, `fit: wide`, and the opt-in breather (`chapters.breather`). A script is still needed for what
crosses lanes: joining the lanes into a master, the sound-effect stem, chapter cards inserted BETWEEN
lanes, and the Borumi working edit. `scripts/compose_layouts.py` and `scripts/chapter_cards.py` are
fallbacks for an older engine; `chapter_cards.py` also makes the cross-lane cards.

**The one trap:** a lane that turns on `chapters.breather` must have `"breathers": false` on its segment in the
assembly config, or it gets two breathers at every card (the engine's, then the assembler's). The key's own meaning is "leave the lane's own chapter
cards alone", so the assembler then also leaves that lane's cards out of `.chapters.txt` and the card
spans: add them from the lane's `<render>.chapters.txt`. The two ways to set a lane up are in
[chapter-cards.md](chapter-cards.md).

## The segments config

`tools/assemble.json` in the work dir (template: `../templates/assemble.example.json`). One entry per
segment, in play order:

| Key | Meaning |
|---|---|
| `id` | order prefix and name (`04-L1`, `09-L2build-a`) |
| `file` | the lane render or the clip |
| `lane` | the lane's work dir (for its compiled timeline: chapter frames, click and pop cues) |
| `srt` | the lane's captions |
| `start` / `end` | use only part of the file (a lane split around an inserted clip) |
| `card` | index of the chapter card to insert **before** this segment |
| `breathers` | `false` = leave the lane's own chapter cards alone. **Required on a lane rendered with `chapters.breather`** |
| `gain` | dB for a showcase clip |
| `sfx` | `false` for a segment that gets no effects (his real screen) |
| `no_sfx_in` | ranges in the segment with no effects (under a clip's own sound) |
| `chapter` | chapter name for a segment with no card (the cold open) |
| `extra_audio` (top level) | a sound tail that runs under the next segment (the cold open's transition) |
| `chapters`, `cards` (top level) | the chapter list and the card clip per chapter index |
| `lane_card_index` / `card_index` | maps a lane's own chapter number to the video's chapter index, so the path card replaces the lane's engine card |
| `sounds`, `shared_tone` (top level) | the pop, click and chapter-click files (none are bundled; configure no whoosh) and the room tone under inserted cards |

When a version changes, change only `file` and `srt` for that segment. When a chapter is dropped or added,
save the old config under a new name first, then update every `card` index.

## Split points

A full clip that plays in the middle of a lane is not rendered inside the lane. The lane writer:
- ends the sentence before it ("…and it should come back,") on a finished frame, ideally the clip's own
  opening frame held for a few frames;
- makes the first frame after it a finished frame too (see the flash rows in the case study);
- reports in the handoff: the split in seconds, the last frame before and the first frame after.

The boss then writes three segments: `X-a` with `end`, the clip, `X-b` with `start`. Set `end` where the
**speech** ends, a little before the split, so no stray frames of the next scene show.

## What the assembler does

1. Writes one intermediate per segment (1920×1080, 30 fps, PCM) so a changed lane re-encodes only itself.
2. At each chapter card inside a lane (unless the segment has `"breathers": false`), builds the breather
   and swaps in the path card ([chapter-cards.md](chapter-cards.md)). Room tone from `scripts/room_tone.py` logic: a steady,
   transient-free window; one shared tone for inserted cards.
3. Concatenates.
4. Builds the sound-effect stem as one wav in numpy, then mixes voice and stem. (A single ffmpeg call with
   about 190 inputs failed.) Dedupes effects that land at the same time across a join.
5. Writes `out/master-<v>.mp4` (the deliverable), `out/master-<v>-nosfx.mov` (for Borumi, effects go in as
   separate clips), `.sfx.json`, `.chapters.txt`, `.srt`, `.segments.json`.

Run `--only-plan` first: it prints the length and chapter list without rendering. `assemble.py --help` lists
every key; the script also refuses an input whose size changes while it is being read.

## Sound rules in the mix

- His voice at −16 LUFS (the engine's A-roll does this). Full clips about −17.
- **No whooshes.** Clicks on sends, pops on titles, his chapter click. `scripts/remix_no_whoosh.py` rebuilt
  a finished master's effect stem without re-encoding the picture when he gave that rule late.
- No music unless he asks.

## The fast automated check

`scripts/check_master.py --master out/master-<v>` (the base path, no extension), after every assembly,
before anyone watches. Its breather check covers the cards the assembler placed; for a lane with the
engine's own breather, audit a card by hand with `scripts/room_tone.py --check <file> --at <seconds>`:

| Check | Pass |
|---|---|
| Integrated loudness, true peak | about −16 LUFS, peak under −1 dBFS |
| Loudness per segment | parts within about 0.5 dB of each other; clips about −17 |
| `silencedetect` | nothing over about 0.9 s outside breathers |
| Every breather | room-tone floor, no digital zero, no transient, click present |
| Join frames | a strip of the frames either side of every join: no blank, white or half-built frame |
| Whisper at every changed join | reads as one clean sentence |
| Captions | no cue bridges a breather; no patch artifacts |
| Chapters | first at 0:00, each at least 10 s, titles equal the card titles |

Then look at a contact sheet (one frame every 6 s) yourself.

## Review rounds, and what each caught

Every render gets an independent reviewer on a different model that can watch and listen
(`../templates/REVIEWER.md`, `../templates/FINAL-REVIEW.md`). It does a listen-only pass first, then 1 fps
contact sheets, full-size frames of every window, proof card and number, and dense strips across every
join.

| Round | Typical catches |
|---|---|
| Lane review | "described but not shown on a computer", wrong model chip, empty or static panel over 3 s, typed text too small, a number no file backs, a missing "Recreated", a retake left in, a late or lingering visual |
| Lane re-review after the story cut | flow by ear: repeated points, dangling connectives, a step before the thing it depends on |
| Whole-video review 1 | things only the master shows: a word clipped at a join, a breather inside a sentence, flashes at clip joins, level differences between parts, a badge stuck on the last tip through the closing, caption cues across breathers, doubled effects |
| Whole-video re-check | status of each earlier item (fixed / partly / not), then a fresh pass of anything rebuilt |
| Whole-video review after layouts and cards | room-tone defects, cropped stamps on zoomed windows, framing under 85%, dark dips at layout switches, orphaned references to a dropped chapter, every changed join rated |

The verdict line is one of: ship, ship after majors, ship after blockers and majors. Blockers and majors go
to one fixer per lane. Minors go on the next-version list.

## After the final master

1. Borumi working edit: [borumi-working-edit.md](borumi-working-edit.md).
2. Exports: the mp4, `.chapters.txt`, `.srt` into the project's exports folder under a new version name
   (never over an older export), a 720p phone copy, an intro copy, a contact sheet.
3. The report: length, chapters, what was recreated or illustrative, unproven claims, pickup lines, the
   changed joins, the next-version list, credits spent. Nothing uploaded.
4. Publishing is the `youtube-publish` skill's job, and only on his word.
