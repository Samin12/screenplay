#!/usr/bin/env python3
"""Close an empty scene's 3 s pad to one frame, without deleting anything.

  python3 borumi_gapfix.py --project <id> --scene <scene id> --media <id> --keep-ms A B [--dry]

WHEN: someone removed a scene's content in the editor and the scene is left empty, padded with
3 s of wallpaper. The editor refuses to delete a scene that has a take, and deleting a
recording is not ours to do. So the gap is closed instead: a take of --media (already in the
project, normally the master) is laid on the empty scene and trimmed to the one frame
[A, B) ms of that media, e.g. the first frame of what follows. The scene stays, 3 s shorter.

NOTE the default is to COMMIT; the one-off this came from was dry unless told otherwise. Run
with --dry first: it does the edit inside the transaction, prints the before/after, and aborts.

VERIFIES, and aborts the transaction on any failure:
  the scene is exactly the pad length before (--pad-ms, default 3000); afterwards it is one
  frame (the kept length, 12 ms tolerance); the project got shorter by pad - kept; every other
  scene kept its length (2 ms).
"""
import argparse
import os
import sys

sys.dont_write_bytecode = True
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import _borumi as bo  # noqa: E402


def main():
    ap = argparse.ArgumentParser(description="Close an empty scene's 3 s pad to one frame without deleting anything.",
                                 epilog=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    bo.add_common_args(ap)
    ap.add_argument("--scene", required=True, help="id of the empty, padded scene")
    ap.add_argument("--media", required=True, help="id of a media item already in the project (the master) to take the frame from")
    ap.add_argument("--keep-ms", required=True, type=int, nargs=2, metavar=("A", "B"), help="the part of the media to keep, in ms (one frame: B - A about 33)")
    ap.add_argument("--pad-ms", type=int, default=3000, help="length of the editor's empty-scene pad (default 3000)")
    ap.add_argument("--layer", default="screen_1", help="the picture layer (default screen_1)")
    ap.add_argument("--summary", help="change summary stored with the commit")
    a = ap.parse_args()
    bo.check_forbidden(a)
    k0, k1 = a.keep_ms
    keep = k1 - k0
    if not 0 < keep <= 100:
        sys.exit("--keep-ms must select one or two frames (B - A between 1 and 100 ms)")
    br = bo.Bridge(a.bridge, timeout=900)

    tx = br.call("begin_project_edit", {"project_id": a.project})["tx_id"]
    try:
        sc = br.scenes(tx)
        before = sc["scenes"][-1]["end_ms"]
        lens0 = {s["id"]: s["end_ms"] - s["start_ms"] for s in sc["scenes"]}
        hit = [k for k, s in enumerate(sc["scenes"]) if s["id"] == a.scene]
        if not hit:
            raise RuntimeError(f"no scene {a.scene}")
        i = hit[0]
        s = sc["scenes"][i]
        if s["end_ms"] - s["start_ms"] != a.pad_ms:
            raise RuntimeError(f"scene '{s['name']}' is {s['end_ms'] - s['start_ms']} ms, not the {a.pad_ms} ms empty pad: not touching it")
        name = s["name"]
        br.call("add_segments", {"tx_id": tx, "timeline_hash": sc["timeline_hash"], "additions": [
            {"type": "take", "placement": {"at_ms": s["start_ms"]}, "content": {"media_id": a.media, "video_kind": "screen", "audio_kind": "system_sound"}}]})
        sc = br.scenes(tx)
        s = sc["scenes"][i]
        S, L = s["start_ms"], s["end_ms"] - s["start_ms"]
        tl = br.call("get_timeline", {"tx_id": tx, "range": {"start_ms": S, "end_ms": S + 2000}, "detail": "segments"})
        seg = [g for layer in tl["layers"] if layer["id"] == a.layer for g in layer["segments"] if g["start_ms"] <= S + 10][0]
        print("after add: scene length", L, "take starts at", seg["start_ms"] - S, "media start", seg["media"]["start_ms"])
        off = seg["start_ms"] - S - seg["media"]["start_ms"]      # project time = S + off + media time
        p0, p1 = S + off + k0, S + off + k1
        br.call("trim_timeline", {"tx_id": tx, "timeline_hash": sc["timeline_hash"], "ranges": [[S, p0], [p1, S + L]], "ripple": True})
        sc = br.scenes(tx)
        s = sc["scenes"][i]
        after = sc["scenes"][-1]["end_ms"]
        now = s["end_ms"] - s["start_ms"]
        print("scene now", now, "ms; total before", before, "after", after, "drop", before - after)
        if abs(now - keep) > 12 or abs((before - after) - (a.pad_ms - keep)) > 12:
            raise RuntimeError(f"scene is {now} ms (want about {keep}); total dropped {before - after} ms (want about {a.pad_ms - keep})")
        bad = [(q["name"], lens0[q["id"]], q["end_ms"] - q["start_ms"]) for q in sc["scenes"]
               if q["id"] != a.scene and abs((q["end_ms"] - q["start_ms"]) - lens0[q["id"]]) > 2]
        if bad:
            raise RuntimeError(f"other scenes changed length: {bad}")
        print(f"scenes still exactly {a.pad_ms} ms (check they are real card scenes, not other empty ones):",
              [q["name"] for q in sc["scenes"] if q["end_ms"] - q["start_ms"] == a.pad_ms])
        if a.dry:
            br.call("abort_project_edit", {"tx_id": tx})
            print("dry run: aborted, nothing changed")
        else:
            print(br.call("commit_project_edit", {"tx_id": tx, "change_summary": a.summary or
                          f"Closed the {a.pad_ms} ms empty gap of scene '{name}' (now one frame); nothing else changed."}))
    except BaseException:
        br.call("abort_project_edit", {"tx_id": tx})
        raise


if __name__ == "__main__":
    main()
