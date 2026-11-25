#!/usr/bin/env python3
"""Fill an EMPTY Borumi project from an assembled master, in ONE verified transaction.

  python3 borumi_build.py --project <id> --master out/master-v1 [--dry] [--bridge URL] [--forbid <id> ...]

WHEN: the first time a master goes into the editor. Create a NEW, empty project first (never
the creator's own project: put its id and its backups' ids in --forbid or $BORUMI_FORBID so a
typo cannot reach them). For a project that already has content use borumi_rebuild.py.
Always run with --dry first: it does the whole build inside the transaction, verifies, and aborts.

Reads <base>-nosfx.mov, <base>.segments.json, <base>.scenes.json (make_scenes.py) and <base>.sfx.json.
- imports the no-SFX master (picture + voice + clip sound, chapter breathers baked in)
- creates one scene per entry of the scene list and fills each with its range of the master
- adds every sound effect as its own sound_effect clip, at its time and level, so the creator
  can move or mute any of them
VERIFIES, and aborts the transaction on any failure:
  the project is empty; the imported master is as long as the plan; scene order; every scene's
  length (3 ms); every scene start (40 ms); the total (60 ms); picture coverage of every scene
  (none empty or padded with the 3 s wallpaper); the number and position of the sound effects (3 ms).
"""
import argparse
import os
import sys

sys.dont_write_bytecode = True
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import _borumi as bo  # noqa: E402


def main():
    ap = argparse.ArgumentParser(description="Fill an EMPTY Borumi project from a master in one verified transaction.",
                                 epilog=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    bo.add_common_args(ap)
    ap.add_argument("--master", required=True, help="base path of the master, e.g. out/master-v1")
    ap.add_argument("--summary", help="change summary stored with the commit")
    a = ap.parse_args()
    bo.check_forbidden(a)
    br = bo.Bridge(a.bridge)
    base = os.path.abspath(os.path.expanduser(a.master))
    total_ms, chap, bounds, names, sfx = bo.load_master(base)
    print(f"{len(chap)} scenes, {len(sfx)} sfx, total {total_ms} ms")

    info = br.call("get_scenes", {"project_id": a.project})
    if len(info["scenes"]) > 1 or any(s["segment_count"] for s in info["scenes"]):
        sys.exit(f"project {a.project} is not empty: {[(s['display_name'], s['segment_count']) for s in info['scenes']]} (use borumi_rebuild.py)")

    tx = br.call("begin_project_edit", {"project_id": a.project})["tx_id"]
    try:
        main_m = br.import_media(tx, base + "-nosfx.mov")
        if abs(main_m["duration_ms"] - total_ms) > 60:
            raise RuntimeError(f"master is {main_m['duration_ms']} ms, plan says {total_ms}")
        snd = {}
        for e in sfx:
            if e["file"] not in snd:
                snd[e["file"]] = br.import_media(tx, e["file"])["id"]
        # scenes: a new project has none; create them all at the end, in order
        sc = br.scenes(tx)
        if sc["scenes"]:
            raise RuntimeError("project is not empty")
        br.call("create_scenes", {"tx_id": tx, "timeline_hash": sc["timeline_hash"], "destination": {"type": "end"},
                                  "scenes": [{"name": n, "script_markdown": None} for n in names]})
        got_names = [s["name"] for s in br.scenes(tx)["scenes"]]
        if got_names != names:
            raise RuntimeError(f"scene order: {got_names}")
        # fill last to first so earlier scene starts do not move while we work
        for i in range(len(chap) - 1, -1, -1):
            p0, p1 = bounds[i], bounds[i + 1]
            sc = br.scenes(tx)
            s = sc["scenes"][i]
            br.call("add_segments", {"tx_id": tx, "timeline_hash": sc["timeline_hash"], "additions": [
                {"type": "take", "placement": {"at_ms": s["start_ms"]},
                 "content": {"media_id": main_m["id"], "video_kind": "screen", "audio_kind": "system_sound"}}]})
            sc = br.scenes(tx)
            s = sc["scenes"][i]
            if abs((s["end_ms"] - s["start_ms"]) - main_m["duration_ms"]) > 3:
                raise RuntimeError(f"scene {i}: take landed wrong: {s['end_ms'] - s['start_ms']} ms (media {main_m['duration_ms']})")
            S = s["start_ms"]
            ranges = ([[S, S + p0]] if p0 > 0 else []) + ([[S + p1, S + main_m["duration_ms"]]] if p1 < main_m["duration_ms"] else [])
            if ranges:
                br.call("trim_timeline", {"tx_id": tx, "timeline_hash": sc["timeline_hash"], "ranges": ranges, "ripple": True})
            s = br.scenes(tx)["scenes"][i]
            if abs((s["end_ms"] - s["start_ms"]) - (p1 - p0)) > 3:
                raise RuntimeError(f"scene {i} {names[i]}: {s['end_ms'] - s['start_ms']} ms, want {p1 - p0}")
            print(f"  {names[i]}: {p0}-{p1}")
        sc = br.scenes(tx)["scenes"]
        for i, s in enumerate(sc):
            if abs(s["start_ms"] - bounds[i]) > 40:
                raise RuntimeError(f"scene {i} starts at {s['start_ms']}, want {bounds[i]}")
        if abs(sc[-1]["end_ms"] - total_ms) > 60:
            raise RuntimeError(f"duration {sc[-1]['end_ms']}, want {total_ms}")
        pads = br.uncovered_scenes(tx, sc)
        if pads:
            raise RuntimeError(f"empty or padded scene left: {pads}")
        # sound effects, in batches
        adds = bo.sfx_additions(sfx, snd)
        for k in range(0, len(adds), 40):
            br.call("add_segments", {"tx_id": tx, "timeline_hash": br.scenes(tx)["timeline_hash"], "additions": adds[k:k + 40]})
        got = sorted(g["start_ms"] for _, g in br.segments(tx, total_ms, ("sound_effect",)))
        want = sorted(x["placement"]["at_ms"] for x in adds)
        if len(got) != len(want) or any(abs(u - v) > 3 for u, v in zip(got, want)):
            raise RuntimeError(f"sfx: got {len(got)} {got[:5]}, want {len(want)} {want[:5]}")
        end = br.scenes(tx)["scenes"][-1]["end_ms"]
        if abs(end - total_ms) > 60:
            raise RuntimeError(f"duration after sfx {end}, want {total_ms}")
        print(f"verified: {len(sc)} scenes, {len(got)} sfx, {end} ms, no empty or padded scene")
        if a.dry:
            br.call("abort_project_edit", {"tx_id": tx})
            print("dry run: aborted, nothing changed")
        else:
            print(br.call("commit_project_edit", {"tx_id": tx, "change_summary": a.summary or
                          f"Assembled {os.path.basename(base)}: {len(sc)} scenes and {len(got)} sound effects."}))
    except BaseException:
        br.call("abort_project_edit", {"tx_id": tx})
        raise


if __name__ == "__main__":
    main()
