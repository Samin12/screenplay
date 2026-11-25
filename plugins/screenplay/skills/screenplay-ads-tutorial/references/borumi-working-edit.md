# The Borumi working edit

He reviews and finishes in Borumi. So the master goes back into a Borumi project as scenes he can move:
one per chapter, a "Card · title" scene before each, each full showcase clip as its own scene, and every
sound effect as a separate clip.

The bridge, the transaction model and the basic build are in `screenplay-demo-edit`
(`references/borumi-assembly.md`). Read that first. This file adds what a multi-round edit needed.

## Rules

- **A new project.** Name it "<Video> working edit". Never write to the creator's own project or its
  backups. Give those ids to every script as its refuse list: `--forbid <id> ...` or `$BORUMI_FORBID`.
- **Every write is one verified transaction.** `begin_project_edit` → edits with the current
  `timeline_hash` → checks → `commit_project_edit`, or abort on any failed check.
- **Dry first.** Every script takes `--dry`: it runs the whole flow, runs the checks, then aborts. Read the
  dry log before the real run. All three commit without it; `borumi_gapfix.py` too: it COMMITS unless you
  pass `--dry`.
- **Tell him before changing what he is watching.** Once the project is open in front of him, say what
  will change and where before any rebuild. (relayed rule, see [his-taste.md](his-taste.md))
- Nothing is deleted from disk. No scene or recording is deleted.

## Build (empty project)

1. `scripts/make_scenes.py --master out/master-<v> --config tools/assemble.json` turns the assembler's `segments.json` (card spans, clip segments)
   into a scene list: start time and name for every scene.
2. Import `out/master-<v>-nosfx.mov`.
3. Create the scenes, fill each with its range of the master.
4. Add every effect from `out/master-<v>.sfx.json` as a separate `sound_effect` clip.
5. Verify, then commit.

`scripts/borumi_build.py --project <id> --master out/master-<v> --dry` does steps 2 to 5 and refuses a
project that is not empty; run it again without `--dry` to commit.

## Rebuild (a project that already has content)

A first-build script should refuse a non-empty project. `scripts/borumi_rebuild.py` (see its `--help`;
always a dry run first) handles the later rounds, in one transaction:

1. Remove every sound-effect clip from the timeline.
2. Empty every scene, last to first. (An emptied scene pads to 3 s.)
3. Reuse the existing scenes in order, create missing ones at the end, rename all to the new list.
4. Import the new master and fill each scene, last to first.
5. Spare scenes (more old than new) get one frame, so none is left as a 3 s pad.
6. Add the effects.
7. Verify, then commit.

## The checks before commit

- Scene count and names equal the scene list, in order.
- Total length equals the master's, within a frame.
- Effect clip count equals the list; positions within a couple of ms.
- No scene is an accidental pad. Measure real screen coverage per scene: a legitimate card scene can be
  exactly as long as a pad, and a length-only check false-fired on those.

## The empty-scene gap and its one-frame fix

If he removes a chapter's content himself, the emptied scene stays and pads to 3 s of wallpaper in the
middle of the video. The scene cannot be deleted while it has a take, and deleting recordings is off
limits. The fix (`scripts/borumi_gapfix.py --project <id> --scene <scene id> --media <media id> --keep-ms A B`),
in one verified transaction. It commits unless you pass `--dry`, so run it with `--dry` first:

1. Add one take of the master at the scene's start.
2. Trim it down to **one frame** (pick a frame that belongs there: the next card's first frame).
3. Check: the scene is one frame long, the total dropped by 3 s minus a frame, and **every other scene's
   length is unchanged**.
4. Commit with a summary that says exactly that.

## Sound effects

- Separate clips he can nudge. Never baked into the take.
- No whooshes. Clicks, pops and the chapter click only.
- When scanning his own project for sources, measure what you take. This edit found an ad whose sound
  played twice (the take and an identical effect clip), which summed to clipping.

## Showing him

- Bring the working edit to the front in Borumi after each commit.
- Report: the commit, scene count, effect count, total length, and what changed since the last one.
- Markers at spliced joins would help him audit; no marker tool was found in this edit. List the changed
  joins with times in the report instead.
