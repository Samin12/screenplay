# Verification of the scripts in this folder

Done on the edit these scripts were generalised from (an 18-minute video: 13 lane/clip segments,
7 inserted chapter cards, 10 replaced lane cards, 18 chapters). Paths are generic here: `<edit>` is
that edit's folder, `<verify>` a scratch folder outside both the edit and this repository. Nothing
was written into `<edit>`: every output and work folder pointed at `<verify>`, and a
`find <edit> -newer <marker>` afterwards listed nothing.

## (a) Reproduction of the plan

A config for that edit was written to `<verify>/assemble.json`: the original segment list
unchanged, plus what used to be hard-coded in the one-off tool (chapter titles, card pattern,
`lane_card_index`, the four sounds, `shared_tone`, `keep_near_click`, the `scenes` block).

    python3 assemble.py --config <verify>/assemble.json --version v4b --only-plan --whoosh --work <verify>/asm
    python3 make_scenes.py --master <verify>/out/master-v4b --config <verify>/assemble.json

Compared with the edit's own `master-v4b.*` files:

| File | Result |
|---|---|
| `.segments.json` segments (20): start and length | max difference 0.000 ms (limit 1 ms); ids and files identical |
| `.segments.json` cards, pauses, `card_spans` (17), total | max difference 0.000 ms |
| `.chapters.txt` (18 chapters) | identical |
| `.scenes.json` (39 scenes) | identical |
| `.sfx.json` (166 entries, with `--whoosh`) | identical (not required; checked because the plan comparison alone never touches the SFX logic) |
| `.srt` (238 cues) | identical |
| default run, no `--whoosh` | 34 sound effects, identical to the list the original no-whoosh remix wrote (132 whooshes dropped) |

Intended differences: `.segments.json` has a new `inputs` list (file, size, md5, duration of all
43 inputs); whooshes are off unless `--whoosh`; chapter stamps switch to `h:mm:ss` past one hour.

## (b) `check_master.py` on that master

    python3 check_master.py --master <edit>/out/master-v4b -o <verify>/check      (16 s, exit 0)

    check     item                              value                                               result
    --------  --------------------------------  --------------------------------------------------  ------
    loudness  whole master                      -16.3 LUFS                                          ok
    peak      whole master                      -1.1 dBFS                                           ok
    length    audio vs plan                     1086.84 s vs 1086.87 s                              ok
    segment   <segment id>                      -15.9 LUFS                                          ok
    ...       (13 segment rows, -15.9 to -17.1 LUFS, all ok)
    silence   over 0.9 s                        none                                                ok
    breather  1:23.47 <chapter title>           floor -56 quiet -57 peak -44 dB bump 1.2            ok
    ...       (17 breather rows, floor -53 to -56 dB, bump 1.2 to 1.7, all ok)
    join      8:11.50                           dark frame: last frame of <segment id>              warn
    join      16:07.03                          dark frame: first frame of <segment id>             warn
    joins     19 joins                          sheet: master-v4b.joins.jpg (pairs: before, after); cut drift max 2 frames  warn

    PASS: 0 hard failure(s), 3 warning(s), 37 rows

The loudness and peak match what was measured by hand during the edit (-16.3 LUFS, -1.1 dBFS, no
silence over 0.9 s). The warnings are real and harmless: one full clip ends on black, another
opens on black. The contact sheet was opened and every pair shows the last frame of one segment
and the first frame of the next.

Finding worth knowing: in that master the picture cuts up to 2 frames later than the plan times
(the encoded video is 2 frames longer than the plan's total). Segment lengths that are not whole
frames each round up when encoded, and it adds up. The assembler's plan logic is unchanged (that
is what reproduction (a) pins down), so this drift is inherited; `check_master.py` now finds the
real cut around each planned join and reports the drift, and warns past 2 frames. Scene starts
sent to the editor come from the plan, so a scene boundary can sit a frame or two off a cut.

Negative control: the same check on the previous master, which a listening review had rejected
for a looped chuckle in two card tones and digital silence under two cards, exits 1 (exit code
read directly, not through a pipe) with 10 hard failures. It flags exactly those four cards (two "transient", two "digital silence") and six more
breathers that sat on the same faded-to-zero tone, and passes the seven clean ones.

## (c) `room_tone.py --check` on two breathers of that master (no-SFX track)

    83.47-84.47 s    floor -55.8 dB  quiet -57.0 dB  peak -43.5 dB  bump 1.20  ok     (an inserted card, shared tone)
    551.60-552.60 s  floor -52.6 dB  quiet -56.0 dB  peak -39.0 dB  bump 1.67  ok     (a replaced lane card, the lane's own tone)

On the rejected master the same two kinds read `quiet -93.7 dB ... DIGITAL SILENCE, TRANSIENT`
and `peak -23.4 dB  bump 5.35  TRANSIENT`, exit 1.

## (d) `--help`

Exit 0 for all thirteen commands: assemble, make_scenes, borumi_build, borumi_rebuild,
borumi_gapfix, remix_no_whoosh, room_tone, splice_connective, compose_layouts, chapter_cards,
showcase, check_master, proof_readme.

## (e) `python3 -m py_compile`

Clean for all fifteen `.py` files (with `PYTHONPYCACHEPREFIX` set, so no `__pycache__` here).

## Also run, on synthetic clips made with ffmpeg in `<verify>`

| Script | What was run | Result |
|---|---|---|
| `assemble.py` full build | one lane used twice as a split segment, a full clip between, one replaced lane card, two inserted cards, `extra_audio`, captions with a zero-width character and a cue across the breather | master, no-SFX master, stem and all plan files written; breather starts in the pause before the card; cue split at the pause; artifact stripped |
| `assemble.py` input guard | a truncated mp4 as an input | refused ("ffprobe cannot open it"), exit 1 |
| input guard, growing file | a valid mp4 being appended to every half second while the guard reads it | refused ("it is still being written"), exit 1 |
| `make_scenes.py`, `check_master.py`, `remix_no_whoosh.py` | on that synthetic master | scene list with card scenes; table printed; stem rebuilt with 5 of 6 sounds, picture stream copied |
| `room_tone.py` | pick on the synthetic lane; pick on a clip with no quiet part | tone written; exit 1 |
| `chapter_cards.py` | an 8-chapter list, Chrome given with `--chrome` (without it and with no Chrome on PATH: clear error, exit 1) | 7 card movies of 3.00 s; frames looked at: done dimmed, line travelling one step, upcoming locked |
| `showcase.py` | a 6 s clip at -29.8 LUFS | chip then credit, push, -17.0 LUFS; frames looked at |
| `splice_connective.py` | an insert with a room-tone pad; `--judge` | net insert exactly as computed (+0.8000 s, 24 frames); level within 1 dB; whisper and RMS printed |
| `compose_layouts.py` | two renders, two ranges, `--assert-same-audio`; a mismatched pair | 4 switches verified frame-exact; mismatch refused |
| `proof_readme.py` | a 2-record folder with a split record and an unrecorded file | README and index written with the do-not-show rows |

## Not verified by running

- `borumi_build.py`, `borumi_rebuild.py`, `borumi_gapfix.py` were NOT run against any project, by
  instruction. They were checked with `--help`, `py_compile` and a line-by-line read against the
  originals: same bridge calls in the same order, same tolerances. Deliberate changes: flags
  instead of positional arguments and built-in ids; the forbidden list is `--forbid` /
  `$BORUMI_FORBID`; the per-scene coverage check now also runs in `borumi_build.py`;
  `borumi_rebuild.py` also checks the imported master's length against the plan; the transaction
  is aborted on Ctrl-C as well; `borumi_gapfix.py` now COMMITS unless `--dry` (the original was
  dry unless told to commit) and takes the scene, media and kept range as flags.
- `splice_connective.py` is a new script written from the edit's splice notes and its two
  one-off paste scripts; it was not replayed on the original recording, and no listening model
  was called (that step is manual by design).
- `showcase.py` is rebuilt from the finished showcase clips and their chip/credit HTML; the
  original commands were not on disk, so the push and fade timings are this script's own. In
  particular the credit line here stays from the end of the chip to the end of the clip unless
  `--credit-seconds` is given; a frame of an original showcase just after its chip showed no
  credit there, so the originals timed it differently.
- `compose_layouts.py` covers the frame-range cut of the original; the original's step-strip band
  overlay and scaled-under-band picture were specific to one scene and are not included.
- The full `assemble.py` encode was not re-run on the 18-minute edit (only its plan); the encode
  path ran on the synthetic clips.
- The whisper steps ran, but on synthetic tones they have nothing real to transcribe.
