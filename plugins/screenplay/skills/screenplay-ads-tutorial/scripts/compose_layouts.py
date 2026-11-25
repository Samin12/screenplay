#!/usr/bin/env python3
"""Cut two renders of the same edit together: the panel look and the reference (full-screen) look.

  python3 compose_layouts.py --panel panel.mp4 --reference full.mp4 --panel-ranges 2400-2985 4100-4720 \
        [--assert-same-audio] -o out.mp4

WHEN: one part needs more than one layout (full-screen visual, full-screen speaker, panel +
camera tile) and the engine can only render one look per run. Render the same edit twice (same
A-roll, same cuts, so the frames line up one to one) and cut between the two here.
THE ENGINE'S `layout:` OPTION REPLACES THIS when your version has it: set the layout per scene
in the edit and render once.

The output shows the reference render, except on the frame ranges given, where it shows the
panel render (--base panel flips that: ranges then select the reference). Ranges are frames,
START-END with END exclusive, on the render's own frame grid: take them from the word timings,
rounded to frames the way the engine rounds its anchors (round(seconds * fps)).

- Hard cuts, frame exact: each range is an overlay switched on by frame number. No dissolve,
  so no half-mixed or dark frame is created at a switch.
- Audio is copied once, untouched, from --audio-from (default panel). --assert-same-audio
  first decodes both renders' audio and refuses if they differ.
- Refuses when the two renders differ in size, frame rate or frame count.
- Checks afterwards (skip with --no-verify): at every switch, the frame before and the frame
  after in the output must match the render they should come from; and it warns when the
  incoming render is itself dark at the switch (the engine was mid-fade there: move the cut a
  few frames, the compose cannot fix that).
"""
import argparse
import hashlib
import json
import os
import subprocess
import sys

sys.dont_write_bytecode = True
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np  # noqa: E402
import _avlib as av  # noqa: E402


def vinfo(path):
    o = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-count_packets", "-show_entries",
                        "stream=width,height,r_frame_rate,nb_read_packets", "-of", "json", path], capture_output=True, text=True)
    try:
        s = json.loads(o.stdout)["streams"][0]
    except (ValueError, KeyError, IndexError):
        sys.exit(f"ffprobe cannot read {path}")
    num, den = s["r_frame_rate"].split("/")
    return {"w": s["width"], "h": s["height"], "fps": float(num) / float(den), "frames": int(s["nb_read_packets"])}


def audio_md5(path):
    r = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-vn", "-f", "s16le", "-ac", "2", "-ar", "48000", "-"], capture_output=True)
    if r.returncode:
        sys.exit(f"cannot decode the audio of {path}")
    return hashlib.md5(r.stdout).hexdigest(), len(r.stdout)


def gray(path, n, fps):
    r = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{max(0.0, (n - 0.25) / fps):.5f}", "-i", path, "-frames:v", "1", "-vf", "scale=64:36",
                        "-f", "rawvideo", "-pix_fmt", "gray", "-"], capture_output=True)
    return np.frombuffer(r.stdout, dtype=np.uint8).astype(np.float32) if len(r.stdout) == 64 * 36 else None


def main():
    ap = argparse.ArgumentParser(description="Cut a panel-look render and a reference-look render together on frame ranges.",
                                 epilog=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--panel", required=True, help="the panel-look render (panel + camera tile + badge)")
    ap.add_argument("--reference", required=True, help="the reference-look render (full frame)")
    ap.add_argument("--panel-ranges", nargs="*", default=[], metavar="START-END", help="frame ranges shown from the non-base render (END exclusive)")
    ap.add_argument("--ranges-json", help="the same ranges as a JSON list [[start, end], ...]")
    ap.add_argument("--base", choices=["reference", "panel"], default="reference", help="the render shown outside the ranges (default reference)")
    ap.add_argument("--audio-from", choices=["panel", "reference"], default="panel", help="which render's audio is copied (default panel)")
    ap.add_argument("--assert-same-audio", action="store_true", help="refuse unless both renders decode to identical audio")
    ap.add_argument("--crf", type=int, default=18)
    ap.add_argument("--no-verify", action="store_true", help="skip the frame checks at the switches")
    ap.add_argument("-o", "--out", required=True, help="output mp4")
    a = ap.parse_args()

    panel, ref, out = (os.path.expanduser(p) for p in (a.panel, a.reference, a.out))
    for p in (panel, ref):
        av.guard_input(p)
    ranges = [tuple(int(v) for v in r.split("-")) for r in a.panel_ranges]
    if a.ranges_json:
        ranges += [tuple(int(v) for v in r) for r in av.load_json(os.path.expanduser(a.ranges_json))]
    ranges.sort()
    ip, ir = vinfo(panel), vinfo(ref)
    if (ip["w"], ip["h"]) != (ir["w"], ir["h"]) or abs(ip["fps"] - ir["fps"]) > 1e-3 or ip["frames"] != ir["frames"]:
        sys.exit(f"the two renders do not line up: panel {ip}, reference {ir}")
    fps, total = ip["fps"], ip["frames"]
    for (s0, s1), nxt in zip(ranges, ranges[1:] + [(total, total)]):
        if not 0 <= s0 < s1 <= total or s1 > nxt[0]:
            sys.exit(f"bad range {s0}-{s1}: ranges must be START-END with END exclusive, inside 0-{total}, not overlapping")
    if a.assert_same_audio:
        (m1, n1), (m2, n2) = audio_md5(panel), audio_md5(ref)
        if m1 != m2:
            sys.exit(f"audio differs between the two renders ({n1} vs {n2} bytes of pcm): they are not the same edit")
        print("audio identical in both renders")

    base, over = (ref, panel) if a.base == "reference" else (panel, ref)
    if ranges:
        en = "+".join(f"between(n,{s0},{s1 - 1})" for s0, s1 in ranges)
        fc = f"[0:v][1:v]overlay=0:0:eof_action=pass:enable='{en}',format=yuv420p[v]"
    else:
        fc = "[0:v]format=yuv420p[v]"
    amap = "1:a" if (a.audio_from == "panel") == (over == panel) else "0:a"
    av.run(["ffmpeg", "-v", "error", "-y", "-i", base, "-i", over, "-filter_complex", fc, "-map", "[v]", "-map", amap,
            "-c:v", "libx264", "-preset", "medium", "-crf", str(a.crf), "-r", f"{fps:g}", "-c:a", "copy", "-movflags", "+faststart", out])
    print(f"wrote {out}: {total} frames, {len(ranges)} ranges from the {'panel' if over == panel else 'reference'} render, audio copied from the {a.audio_from} render")

    if a.no_verify:
        return
    io = vinfo(out)
    bad = [] if io["frames"] == total else [f"output has {io['frames']} frames, inputs {total}"]
    for s0, s1 in ranges:
        for n, src, label in ((s0 - 1, base, "before cut-in"), (s0, over, "cut-in"), (s1 - 1, over, "before cut-out"), (s1, base, "cut-out")):
            if not 0 <= n < total:
                continue
            g_out, g_src = gray(out, n, fps), gray(src, n, fps)
            if g_out is None or g_src is None:
                continue
            if float(np.abs(g_out - g_src).mean()) > 8:
                bad.append(f"frame {n} ({label}) does not match its source render")
            if label in ("cut-in", "cut-out") and g_src.mean() < 0.6 * max(1.0, min(gray(src, min(total - 1, n + 12), fps).mean(), 255)):
                print(f"WARNING frame {n} ({label}): the incoming render is dark here (mid-fade); move the cut a few frames")
    if bad:
        print("FAIL:\n  " + "\n  ".join(bad), file=sys.stderr)
        sys.exit(1)
    print(f"verified: {2 * len(ranges)} switches frame-exact")


if __name__ == "__main__":
    main()
