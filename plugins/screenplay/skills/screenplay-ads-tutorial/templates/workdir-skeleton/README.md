# Work dir layout for one edit

Make this folder as `<work dir>` (beside the creator's other screenplay work dirs). Copy the rule files
from `../` (the templates) and fill the placeholders. Nothing here is ever deleted: versions get names.

```
<work dir>/
  PLAN.md            the boss plan: his ask, lanes, cross-lane cuts, chapter scheme, the bar, truth rules, assets
  WRITER.md          brief for every lane writer
  REVIEWER.md        brief for every lane reviewer
  FIXER.md           brief for every fixer
  FINAL-REVIEW.md    brief for the whole-video reviewer
  STORY-CUT.md       his rule on flow (add when he gives it, or from the start)
  PROOF-FIRST.md     his rule on proof
  LAYOUT.md          the three layouts
  CONNECTIVES.md     the connectives table and the pickup list (after the first master)
  FACTS.md           every claim checked: true / wrong / exact figure, with sources. Wins over PLAN.md
  ENGINE-NOTES.md    what the engine owner added for this edit, with copy-paste examples
  CREDITS-LOG.md     every generated B-roll job: time, lane, model, what, credits
  run-log.md         the boss's log: one row per event, with a NEXT row
  lanes/
    <lane>/          one screenplay work dir per recorded scene (source.json, words.json, cuts.yaml,
                     aroll.mp4, edit.yaml, paper.md, plan.md, media/, out/, HANDOFF.md, HANDOFF-vN.md)
    <lane>r/         a re-ordered lane (reordered/camera.mp4 + mic.wav); the original stays
    <lane>/full/     the full-frame copy of a lane, for the two-render layout compose
  proof/             the proof pack: README.md, proof-index.json, captures + -crop.png + .source.json,
                     media/ (clips), VERIFY.md
  review/            <lane>-<reviewer>-vN.md, FINAL-<v>.md, CONNECTIVES-<reviewer>.md
  cards/             chapter path cards: chapters.json, one clip per chapter (a new folder per redesign)
  showcase/          full clips with chip and credit line, about -17 LUFS
  front/             the cold open (a finished ad + the transition to him)
  tools/             assemble.json (+ older configs under version names), copies of this skill's scripts
  asm/<v>/           per-segment intermediates (safe to rebuild)
  out/               master-<v>.mp4, -nosfx.mov, .sfx.json, .chapters.txt, .srt, .segments.json,
                     .scenes.json, .joins.txt, check/ (join strips, sheets)
  logs/              assembly and Borumi dry/commit logs
```

The asset folder `<project>` (the builds, their READMEs, logs, prompts and final files) is separate and
read-only. Exports go to `<project>/Exports/` under a new version name each time.
