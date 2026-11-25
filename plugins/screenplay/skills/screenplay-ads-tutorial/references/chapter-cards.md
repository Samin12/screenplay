# Chapter path cards with breathers

He liked "the chapter titles". What he asked for across three rounds (relayed in
[his-taste.md](his-taste.md), Chapter cards): a breather at every chapter, a progression grid, titles
embedded in the picture, the heading badge, and each card as its own "Card · title" scene in Borumi. Then:
the card must not reveal everything.

## The path card

One card design for the whole video, full screen, on the house canvas:

- A small heading line (the video's name and counts).
- The current chapter's title, large.
- A grid of tiles, one per chapter, grouped in rows by level.
- **Done** chapters: dimmed, with a tick and their titles.
- **Current**: revealed by a line that travels **one step** from the previous tile, then the tile lights.
- **Upcoming**: locked. A lock icon, no title. The viewer sees how much is left, not what it is.

Wider tiles for level openers and non-tip chapters. Keep every title short enough to fit two lines.

## Titles = chapters.txt

One list drives everything: the card tiles, the Borumi scene names, the badge headings, and the YouTube
chapter list. If a chapter is added or dropped, rebuild all of them from the list. The chapter time is the
time of the card.

Chapters here were: the intro, each level, each numbered tip, and the destinations that are not tips
(connecting the tool, a finished piece, the last technique). Section changes that are none of those open
with a short title in the panel, not a card.

Tip numbers must make every number he says aloud true. Write the scheme in `PLAN.md` before any lane
starts.

## The breather

At every chapter: about 1 s where the card builds with no speech, his click sound, then the card holds
while he starts talking.

- **Start at a real pause.** Find the latest quiet run of at least 150 ms before the anchor on the RMS.
  Starting at the anchor word itself split one sentence after "And".
- **Room tone, never digital silence.** A steady, transient-free window from his own recording. One shared
  tone for all inserted cards. The first master's breathers were digital zero; a later one looped a chuckle.
- **The click** finishes inside the breather, decayed before his first syllable.
- **Captions never bridge a breather.** Split the cue at the pause.
- Two kinds of switch:
  - at a tip inside a lane, the path card replaces the engine's own 2 s card: 1 s breather, then the card
    holds 2 s under his first words;
  - between lanes or before a showcase clip, a 2 s card clip is inserted with room tone and the click.
    (1.5 s left the lit state on screen for only half a second.)

## How: the engine option (cards inside a lane)

The path card is an engine option now (`docs/EDIT-YAML.md`, "Chapter card `chapters.style: path`" and
"Chapter breather"). Template: `../templates/yaml/chapters-path.yaml`. Working example:
`examples/ads-tutorial-mini/edit.yaml` in the engine repo.

| Key | What it does |
|---|---|
| `chapters.style: path` | the path card (`grid` is the default) |
| `chapters.heading` | the small caps line above the title |
| item `label` | the eyebrow on the tile ("Level 2", "Tip 7"); numbering is yours |
| item `group` | the row. Same group = same row; no group = the row of the item before |
| item `title`, `at` | the title, and the word the card lands on. No `at` = a tile with no card |
| `chapters.breather: { seconds: 1, click: media/click.wav }` | opt-in. A breath at every card, starting at a real pause, on room tone taken from the recording, with an optional click. `seconds` 0.3 to 3 |

- The card's large title and the line in `<render>.chapters.txt` are the same string: `label: title`.
- The card cuts in and out hard, and the scenes on either side are drawn complete at its edges.
- The breather makes the video longer and moves output times. Word ids and phrases keep working; `o:` and
  `f:` anchors on scenes mean output time. If the recording has no clean room tone the compile fails
  and says so.

The grid spans lanes, so every lane's `chapters.items` lists **all** chapters in the same order with the
same titles. Only the ones that happen in that lane get an `at`. Earlier ones show as done, later ones as
locked.

## What still needs a script (cards between lanes)

The engine knows one lane. A card **between** two lanes, or before a showcase clip, is a clip:
`scripts/chapter_cards.py --chapters <chapters.json> -o <cards dir>` renders one card movie per chapter
(HTML to frames, the line drawn tile to tile), and `scripts/assemble.py` inserts it over shared room tone
with the click (`"card": <index>` on the segment that follows it). Joining the lanes, the sound-effect stem
and the Borumi working edit are scripts too ([assembly-and-checks.md](assembly-and-checks.md)).

## The trap: two breathers

By default the assembler treats every chapter card inside a lane as its own to replace: it inserts a 1 s
breather before it and lays the card movie over the engine's card. A lane rendered with `chapters.breather`
already has that breath in its picture and sound.

**The one trap:** a lane that turns on `chapters.breather` must have `"breathers": false` on its segment in the
assembly config, or it gets two breathers at every card (the engine's, then the assembler's).

Pick one per lane:

| | Lane `edit.yaml` | Segment in `assemble.json` | Master chapter list and Borumi card scenes |
|---|---|---|---|
| Engine does it | `chapters.style: path` + `chapters.breather` | `"breathers": false` | complete: the assembler does not retime the lane, and reads its chapters from the lane's timeline |
| Assembler does it (how this edit was made; also the fallback for an engine without the path card) | `chapters:` with **no** `breather` | default, with `lane_card_index` / `card_index` and the card movies from `chapter_cards.py` | complete, written by the assembler |

## In Borumi

Each card is its own scene named `Card · <title>`, followed by the chapter's scene. He can nudge or drop a
card without touching the chapter. `scripts/make_scenes.py` writes the scene list from the assembler's card
spans.

## Checks

- Every breather: floor around −52 dB, no −90 dB dips, no breath or laugh, click present.
- Every card: the settled frame shows the right tile lit, the right number done, nothing upcoming revealed.
- No word on the wrong side of a breather in the captions.
- No flash in the 0.3 s before a card: end the segment where the speech ends.
