# Orchestration: one boss, parallel lanes, independent reviewers

An 18-minute video is too much for one agent in one pass. Split it by recorded scene, give each scene its own
work dir and its own writer, and have a different model review every render.

## The boss

The boss plans, briefs, decides what reviews mean, assembles and reports. The boss does not write lanes.

Before the first worker:
1. Read the creator's ask and write it at the top of `PLAN.md` in his words.
2. Map his recording project **read-only**. List every scene: length, what it is, which lane takes it.
3. `screenplay init` and transcribe one work dir per scene under `<work dir>/lanes/<lane>/`. Split a long
   scene into two lanes (same recording, each writer cuts away the other half with one manual cut).
4. Decide the cross-lane cuts the per-lane detector cannot see: an abandoned lead-in that the next scene
   restarts, an extra take that belongs inside another scene, where a full clip will be inserted.
5. Write one chapter and tip scheme for the whole video. No badge may contradict a number he says aloud.
6. Write the rule files from `../templates/` and start wave 1.

## Lanes

- One lane = one complete screenplay work dir: its own cut, A-roll, `edit.yaml`, render, `HANDOFF.md`.
- A writer touches only its lane and its own temp folder. Never engine code, other lanes, the plan, the
  facts file or the asset folder.
- The intro hook lane is written **last**, from the finished lanes.
- A lane that needs reordering gets a new dir beside the old one (see [story-cut.md](story-cut.md)).

## Who does what

| Role | Count | Model | Notes |
|---|---|---|---|
| Boss | 1 | the strongest model | plans, briefs, assembles, the only one who talks to the creator |
| Engine owner | 1 | strong coding model | the only one who edits engine code; writes `ENGINE-NOTES.md` for the writers |
| Facts and proof | 1, then 1 per topic group | careful model | `FACTS.md`, the proof pack |
| Lane writer | 1 per lane (or 2 small lanes) | strong model | cut, plan, edit, check, render, handoff |
| Reviewer | 1 per render | **a different model family** that can watch video and hear audio | returns numbered fixes, fixes nothing |
| Fixer | 1 per review | same as writers, ideally the lane's own writer thread | applies the review, writes `HANDOFF-vN.md` |
| Verifier | 1 | reviewer model | audits the proof pack |

What this edit used: Claude Fable 5.2 as the boss, the engine owner and most lane writers and fixers;
Claude Opus 5.5 for the facts worker, one proof group and one lane; Gemini 4 Neon for every review and the
proof verifier, because it watches the picture and hears the sound and did not make the render.

The reviewer must not be the model that made the render. In this edit the reviewers caught 5 to 15 "must"
items per lane that the writers' own two review passes had missed.

## Briefs are files

- `WRITER.md`, `REVIEWER.md`, `FIXER.md`, `FINAL-REVIEW.md` live in the work dir. A task message names the
  lane, the file to read and the output path. Nothing else.
- A new rule from the creator becomes a new rule file (`STORY-CUT.md`, `PROOF-FIRST.md`, `LAYOUT.md`,
  `CONNECTIVES.md`) with his words at the top, and a one-line message to every running worker: "read
  `<file>`, it applies to your lane".
- `PLAN.md` holds the truth rules. `FACTS.md` wins over it when they disagree.

## Steering running workers

- Send a steer to the worker's own thread. Do not start a second worker on the same lane.
- A steer names the rule file or the review item, the output version name, and what must not change
  ("audio stays byte-identical").
- When the same rule lands on five lanes, send it to all five at once and log it.

## Hard stops

When he says "Fix it all fast and show me in Borumi.": give every running fixer a time limit (15 to 20
minutes), tell it to ship what works and write the rest as a "next version" list in its handoff. Run no new
review round before the build. The whole-video review runs in parallel with the Borumi rebuild.

## Never delete, one committer

- Nobody deletes a file. Versions get names (`edit.v5.yaml`, `S3-v8.mp4`, `assemble.v2.py`). This includes
  regenerable scratch.
- One agent commits to the engine repo (the engine owner; the boss merges and pushes). Nobody runs a
  formatter on it.
- Nobody but the boss writes to a Borumi project, and never to the creator's own.
- Workers do not start other agents. Nobody publishes or uploads.

## Picking up files

A lane file is ready only when all four are true:
1. The handoff names that exact file as the final.
2. `ffprobe` reads it and the duration matches the handoff.
3. Its md5 is the same on two reads a minute apart (a render in progress keeps changing).
4. The worker has ended its turn.

This edit assembled a master on a draft that was re-rendered three minutes later. The check takes a minute.

## The run log

`run-log.md`: one row per event, with the time. Workers started and on what, files accepted (name, length),
review counts (must / should / nice), every rule he gave, every decision, every mistake, and a "NEXT" row
that a fresh boss could resume from. Write the NEXT row before every long wait.
