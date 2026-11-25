#!/usr/bin/env python3
"""Rebuild a FILLED Borumi project from a new master, non-destructively, in ONE verified transaction.

  python3 borumi_rebuild.py --project <id> --master out/master-v2 [--dry] [--bridge URL] [--forbid <id> ...]

WHEN: the working project already holds an earlier master and a new one is ready. Tell the
creator first (what changes, where): they may be watching that project. Never the creator's
own project or its backups: put those ids in --forbid or $BORUMI_FORBID. Always --dry first.

NON-DESTRUCTIVE: nothing is deleted from disk and no scene or recording is deleted. Inside the transaction:
  1. every sound-effect clip is removed from the timeline
  2. every scene is emptied (its content trimmed away, last scene first)
  3. the existing scenes are reused in order, missing ones are created at the end, all are
     renamed to the new scene list; if the project has MORE scenes than the new list, the spare
     ones stay at the end as "zz spare N (unused)" holding one frame, so none pads to the
     editor's 3 s wallpaper
  4. the new no-SFX master is imported and each scene is filled with its range of it
  5. every sound effect of <base>.sfx.json is added as its own clip
VERIFIES, and aborts the transaction on any failure:
  nothing is left after emptying; scene names and order; every scene's length (3 ms); every
  scene start (60 ms); the total (80 ms); picture coverage of every scene (none empty or
  padded: measured per scene, because a 3 s card scene is legitimately 3000 ms); the number and
  position of the sound effects (40 ms).

Reads <base>-nosfx.mov, <base>.segments.json, <base>.scenes.json (make_scenes.py) and <base>.sfx.json.
"""
import argparse
import os
import sys

sys.dont_write_bytecode = True
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import _borumi as bo  # noqa: E402

PICTURE, SOUND = "screen_1", "system_sound_1"


def main():
    ap = argparse.ArgumentParser(description="Rebuild a FILLED Borumi project from a new master, non-destructively.",
                                 epilog=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    bo.add_common_args(ap)
    ap.add_argument("--master", required=True, help="base path of the new master, e.g. out/master-v2")
    ap.add_argument("--summary", help="change summary stored with the commit")
    a = ap.parse_args()
    bo.check_forbidden(a)
    br = bo.Bridge(a.bridge)
    base = os.path.abspath(os.path.expanduser(a.master))
    total_ms, new, bounds, names, sfx = bo.load_master(base)
    print(f"{len(new)} scenes, {len(sfx)} sfx, total {total_ms} ms")

    tx = br.call("begin_project_edit", {"project_id": a.project})["tx_id"]
    try:
        sc = br.scenes(tx)
        old = sc["scenes"]
        end0 = old[-1]["end_ms"] if old else 0
        print(f"project now: {len(old)} scenes, {end0} ms")
        # 1. remove every sound effect from the timeline
        fx = br.segments(tx, end0, ("sound_effect",))
        for k in range(0, len(fx), 60):
            br.call("delete_segments", {"tx_id": tx, "timeline_hash": br.scenes(tx)["timeline_hash"], "segment_ids": [g["id"] for _, g in fx[k:k + 60]]})
        # 2. empty every scene, last to first (an emptied scene pads to 3000 ms)
        for i in range(len(old) - 1, -1, -1):
            sc = br.scenes(tx)
            s = sc["scenes"][i]
            if s["end_ms"] - s["start_ms"] > 0:
                try:
                    br.call("trim_timeline", {"tx_id": tx, "timeline_hash": sc["timeline_hash"], "ranges": [[s["start_ms"], s["end_ms"]]], "ripple": True,
                                              "target": {"type": "layers", "layer_ids": [PICTURE, SOUND]}})
                except RuntimeError as e:                    # an already-empty scene refuses the trim; anything else is a real failure
                    msg = str(e).lower()
                    if "3000" not in msg and "empty" not in msg and "no content" not in msg and "nothing" not in msg:
                        raise
        sc = br.scenes(tx)
        left = br.segments(tx, sc["scenes"][-1]["end_ms"] if sc["scenes"] else 0, ("screen", "system_sound", "sound_effect"))
        if left:
            raise RuntimeError(f"content left after emptying: {len(left)} segments, e.g. {left[0][0]} {left[0][1]['start_ms']}-{left[0][1]['end_ms']}")
        # 3. scenes: reuse the existing ones in order, create the missing ones at the end, rename all
        if len(new) > len(old):
            br.call("create_scenes", {"tx_id": tx, "timeline_hash": sc["timeline_hash"], "destination": {"type": "end"},
                                      "scenes": [{"name": n, "script_markdown": None} for n in names[len(old):]]})
        sc = br.scenes(tx)
        if len(sc["scenes"]) < len(new):
            raise RuntimeError(f"{len(sc['scenes'])} scenes, need {len(new)}")
        extra = len(sc["scenes"]) - len(new)
        ids = [s["id"] for s in sc["scenes"]]
        all_names = names + [f"zz spare {k + 1} (unused)" for k in range(extra)]
        br.call("update_scenes", {"tx_id": tx, "updates": [{"scene_id": i, "name": n} for i, n in zip(ids, all_names)]})
        got = [s["name"] for s in br.scenes(tx)["scenes"]]
        if got != all_names:
            raise RuntimeError(f"scene names: {got[:5]}...")
        # 4. import and fill, last to first
        main_m = br.import_media(tx, base + "-nosfx.mov")
        print("imported", main_m["id"], main_m["duration_ms"])
        if abs(main_m["duration_ms"] - total_ms) > 60:
            raise RuntimeError(f"master is {main_m['duration_ms']} ms, plan says {total_ms}")
        snd = {}
        for e in sfx:
            if e["file"] not in snd:
                snd[e["file"]] = br.import_media(tx, e["file"])["id"]

        def fill(i, p0, p1):
            sc = br.scenes(tx)
            s = sc["scenes"][i]
            br.call("add_segments", {"tx_id": tx, "timeline_hash": sc["timeline_hash"], "additions": [
                {"type": "take", "placement": {"at_ms": s["start_ms"]}, "content": {"media_id": main_m["id"], "video_kind": "screen", "audio_kind": "system_sound"}}]})
            sc = br.scenes(tx)
            s = sc["scenes"][i]
            S, L = s["start_ms"], s["end_ms"] - s["start_ms"]
            ranges = ([[S, S + p0]] if p0 > 0 else []) + ([[S + p1, S + L]] if p1 < L else [])
            if ranges:
                br.call("trim_timeline", {"tx_id": tx, "timeline_hash": sc["timeline_hash"], "ranges": ranges, "ripple": True})
            s = br.scenes(tx)["scenes"][i]
            if abs((s["end_ms"] - s["start_ms"]) - (p1 - p0)) > 3:
                raise RuntimeError(f"scene {i} {all_names[i]}: {s['end_ms'] - s['start_ms']} ms, want {p1 - p0}")

        for k in range(extra):                                   # spare scenes: one frame of the very end, so no 3 s wallpaper pad
            fill(len(new) + extra - 1 - k, total_ms - 34, total_ms - 1)
        for i in range(len(new) - 1, -1, -1):
            fill(i, bounds[i], bounds[i + 1])
            print(f"  {names[i]}: {bounds[i]}-{bounds[i + 1]}")
        sc = br.scenes(tx)["scenes"]
        for i in range(len(new)):
            if abs(sc[i]["start_ms"] - bounds[i]) > 60:
                raise RuntimeError(f"scene {i} starts at {sc[i]['start_ms']}, want {bounds[i]}")
        want_end = total_ms + 33 * extra
        if abs(sc[-1]["end_ms"] - want_end) > 80:
            raise RuntimeError(f"duration {sc[-1]['end_ms']}, want {want_end}")
        pads = br.uncovered_scenes(tx, sc, PICTURE)
        # 5. sound effects
        adds = bo.sfx_additions(sfx, snd)
        for k in range(0, len(adds), 40):
            br.call("add_segments", {"tx_id": tx, "timeline_hash": br.scenes(tx)["timeline_hash"], "additions": adds[k:k + 40]})
        got = sorted(g["start_ms"] for _, g in br.segments(tx, total_ms, ("sound_effect",)))
        want = sorted(x["placement"]["at_ms"] for x in adds)
        if len(got) != len(want) or any(abs(u - v) > 40 for u, v in zip(got, want)):
            raise RuntimeError(f"sfx: got {len(got)} {got[:5]}, want {len(want)} {want[:5]}")
        end = br.scenes(tx)["scenes"][-1]["end_ms"]
        print(f"verified: {len(sc)} scenes ({extra} spare), {len(got)} sfx, {end} ms; empty/padded scenes: {pads}")
        if pads:
            raise RuntimeError("empty or padded scene left")
        if a.dry:
            br.call("abort_project_edit", {"tx_id": tx})
            print("dry run: aborted, nothing changed")
        else:
            print(br.call("commit_project_edit", {"tx_id": tx, "change_summary": a.summary or
                          f"Rebuilt from {os.path.basename(base)}: {len(new)} scenes with chapter-card scenes, {len(got)} sound effects."}))
    except BaseException:
        br.call("abort_project_edit", {"tx_id": tx})
        raise


if __name__ == "__main__":
    main()
