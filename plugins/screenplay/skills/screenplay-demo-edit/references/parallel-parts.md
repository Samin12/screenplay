# Parallel part writers

A 33-minute edit is ~6,400 words and 200+ scenes. One agent can't write it well, so the video is split into
parts (A..M), each written by its own agent in its own **lane**, then merged.

## Files in the work dir
- `edit.header.yaml`: title, `look: panel`, camera, and `chapters:` (the chapter `at:` word ids, titles, badges,
  icons). Chapter cards are automatic (full screen, 2 s, speech continues under them).
- `parts/<X>.yaml`: a top-level YAML list of scenes; first scene `at:` = the part's first word id.
- `parts.md`: the table of parts (word range, output time, section, which screen plate) plus per-part direction
  (what each beat should show, which proof/B-roll/replica to use).
- `plan.md`: the whole edit's rules: layout, assets (plates and their sizes, replicas, B-roll index, proof
  folder), what "sloppy" looked like last time, the bar (a previous video made with the same engine).
- `WRITER.md`: the brief each part agent gets (template below).
- `LIVE.md`: the live-screen rule (copy `live-screen.md`), for parts with screen.
- `scripts/merge.sh` → `edit.yaml`; `scripts/lane.sh <X> check|sheet|still` → a private lane with symlinked media.

Split on chapter boundaries, 1-4 minutes per part. Keep a backup of every part before a pass
(`parts-v5/`, `parts-v6/`...) so a writer can reuse an earlier good graphic and you can diff.

## Running them
Spawn one agent per part in parallel (native subagents, foreground). Each one only touches `parts/<X>.yaml`,
`lanes/<X>/` and `/tmp/<X>-*`, never renders, never edits engine code. When all are back: `merge.sh`,
`screenplay check` on the whole edit, a sheet at chapter boundaries (the joins between parts), then render.

## WRITER.md template (fill the <> bits)

```
You write ONE part of Samin Yasar's YouTube edit "<Video>" with the screenplay motion-edit engine
(`screenplay` CLI on PATH). Work dir: <W>. Your part letter is given in your task.

Do this
1. Read W/plan.md, W/parts.md (your part), W/LIVE.md if your part has screen, the screenplay-edit skill
   (SKILL.md, references/METHOD.md, taste.md, concept-visuals.md) and docs/EDIT-YAML.md. Skim 2 reference parts.
2. Your words: W/brief.txt lines in your range. W/screen-plan.txt says when each plate has real screen.
   W/media/broll/INDEX.md lists B-roll (reveal times). `screenplay replicas` lists replicas.
3. Look before you write: pull plate frames across your range every 2-4 s and READ them.
4. Write W/lanes/<X>/plan.md (time / words / what the viewer sees / scene kind), then W/parts/<X>.yaml.
5. `W/tools/lane.sh <X> check` → 0 errors. Sheets across your range; OPEN every image. Fix and repeat twice.
6. Report (< 300 words): scene count, one line per scene group, every liberty (illustrative numbers,
   recreated UI), anything private seen and its time, open issues, 2-3 still paths.

Never end your turn while something is running: run sheet/still/check in the foreground.

Hard rules
- Everything on screen is true. Illustrative values only inside stories/replicas, listed in your report.
- He stays in the tile on the right. No em dashes on screen. Headlines ≤ 6 words. Real names spelled right.
- Anchors are w-ids or phrases, never frame numbers or o: times.
- Never zoom/lift onto a key, account id, IP, password, email or OAuth code.
- Only touch parts/<X>.yaml, lanes/<X>/ and /tmp/<X>-*. Don't render. Don't edit engine code.
```

## After each pass
Record his direction for that pass in its own file (`DEMO.md`, `LIVE.md`...) with his exact words at the top, so
the next writer sees why. These files override `plan.md` where they disagree.
