# Scripts for an ads-tutorial edit

Python 3, standard library + numpy, with `ffmpeg` and `ffprobe` on PATH. Every script has `--help`.
No paths are built in: everything comes from flags or a JSON config, config paths may be relative
to the config file, and `~` is expanded. No sound, font or media file is bundled; sound effects
(an editor's built-in sounds, a creator's click) are named in the config and stay where they are.
`chapter_cards.py` and `showcase.py` also need headless Chrome or Chromium (`--chrome <binary>`, `$CHROME`, or on PATH); the whisper steps need
`whisper-cli` and a model file. Run them with plain `python3` (numpy must be importable).

## Engine option or script

The engine now does these inside one lane's `edit.yaml`: path chapter cards (`chapters.style: path`), the
three layouts with hard-cut switches (`layout: panel | full | him`), the `chip` and `steps` overlays, the
pinned "Recreated" stamp (from `data.stamp`), `fit: wide` on a `show:` beat, and the opt-in breather
(`chapters.breather`). Start from the engine's `examples/ads-tutorial-mini`.

These scripts are for what crosses lanes: joining the lanes into a master and the SFX stem (`assemble.py`),
chapter cards inserted BETWEEN lanes (`chapter_cards.py` + `"card"` in the config), and the Borumi working
edit (`make_scenes.py`, `borumi_*.py`). `compose_layouts.py` and `chapter_cards.py` are also the fallbacks
for an older engine that has no `layout:` or no path card.

**The one trap:** a lane that turns on `chapters.breather` must have `"breathers": false` on its segment in the
assembly config, or it gets two breathers at every card (the engine's, then the assembler's). With it the assembler leaves that lane's cards alone
and does not list them in `.chapters.txt`: add them from the lane's `<render>.chapters.txt`.

## One line per script

| Script | What it does |
|---|---|
| `chapter_cards.py` | Builds the chapter-grid card movies: done dimmed, a line travels one step, upcoming locked. For cards between lanes; inside a lane the engine's `chapters.style: path` replaces it (fallback for an older engine). |
| `showcase.py` | Makes a full-screen showcase clip: chip for the first 5 s, small credit line, slow push, loudness to a target. |
| `compose_layouts.py` | Cuts a panel-look render and a reference-look render of the same edit together on frame ranges, hard cuts, audio copied once. Fallback for an older engine: the engine's `layout:` option replaces it. |
| `splice_connective.py` | Inserts or restores a connecting word from the speaker's own audio (level match, room-tone pads, equal-power crossfades); `--judge` transcribes a join. The listening test is manual and described in its help. |
| `room_tone.py` | Picks clean room tone (steady, transient-free, mirrored, faded; exits 1 if none); `--check` audits a breather window for digital silence or a looped chuckle. |
| `assemble.py` | The master assembler: lane renders + full clips + chapter cards with breathers, SFX stem (whooshes off by default), captions, chapters, plan files; fingerprints every input and refuses a half-written one. |
| `assemble.example.json` | The config schema by example (generic names). |
| `make_scenes.py` | `.segments.json` to the editor's scene list, with a "Card · title" scene before each chapter; special names come from the config. |
| `check_master.py` | The fast automated check: loudness, peak, loudness per segment, silences, every card breather, join contact sheet, optional whisper; pass/fail table, exits 1 on a hard failure. |
| `remix_no_whoosh.py` | Rebuilds the SFX stem without the named sounds and muxes it over the untouched picture. |
| `borumi_build.py` | Fills an EMPTY Borumi project from a master in one verified transaction. |
| `borumi_rebuild.py` | Rebuilds a FILLED Borumi project from a new master, non-destructively, in one verified transaction. |
| `borumi_gapfix.py` | Closes an empty scene's 3 s pad to one frame without deleting anything. COMMITS unless `--dry`. |
| `proof_readme.py` | Proof folder to `README.md` + `proof-index.json` with a do-not-show column. |
| `_avlib.py`, `_borumi.py` | Shared helpers the scripts import. Not commands. |

## The order they run in

1. `proof_readme.py` once the proof captures are in (and again whenever captures are added).
2. Per lane, while editing: `splice_connective.py` for a missing connective, `compose_layouts.py`
   only when a lane needs more than one layout and the engine is too old for `layout:`.
3. `showcase.py` for each clip shown whole.
4. `chapter_cards.py --chapters chapters.json -o cards/` for the chapter list of the whole video (the cards
   between lanes, and any lane whose cards the assembler replaces).
5. `room_tone.py <a talking lane> -o tone.wav` for the shared tone under inserted cards.
6. `assemble.py --config assemble.json --version v1 --only-plan`, read the plan, then without `--only-plan`.
   Every lane rendered with `chapters.breather` has `"breathers": false` on its segment.
7. `make_scenes.py --master out/master-v1 --config assemble.json`.
8. `check_master.py --master out/master-v1`. Fix what fails; `room_tone.py --check` looks at one breather.
9. Optional: `remix_no_whoosh.py --master out/master-v1` if the master was built with `--whoosh` and they have to go.
10. Editor: `borumi_build.py --project <new empty project> --master out/master-v1 --dry`, then without `--dry`.
    A later master: `borumi_rebuild.py ... --dry`, then without. Tell the creator before any rebuild.
    `borumi_gapfix.py --project <id> --scene <id> --media <id> --keep-ms A B --dry` only when a scene was
    left empty. It commits unless `--dry` is given, so the dry run is the one you type first.

Rules these scripts carry: no whooshes unless asked; never delete a scene, a recording or a file;
never touch the creator's own project (`--forbid`, `$BORUMI_FORBID`); one transaction, verified,
aborted on any failure; a breather is room tone, never digital silence; an input that is still
being written is refused.
