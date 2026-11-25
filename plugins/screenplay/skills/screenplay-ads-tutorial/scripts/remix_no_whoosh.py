#!/usr/bin/env python3
"""Rebuild a master's sound-effect stem without some sounds and mux it over the untouched picture.

  python3 remix_no_whoosh.py --master out/master-v1 [--drop whoosh ...] [-o out/master-v1-nowhoosh]

WHEN: a master was assembled with whooshes (assemble.py --whoosh, or an older build) and the
creator wants them gone; or any one sound has to come out without re-assembling. Clicks, pops
and the chapter click stay unless you name them in --drop.

Reads <base>.sfx.json, <base>-nosfx.mov (voice + clip sound) and <base>.mp4 (picture). Mixes
the new stem with the no-SFX track exactly like assemble.py does (same limiter), copies the
video stream of <base>.mp4 without re-encoding, and writes
  <out>.mp4, <out>.sfx.json, <out>.sfx.wav     (default <out> = <base>-nowhoosh)
The inputs are not modified. For the editor project, rebuild with the new .sfx.json
(borumi_rebuild.py reads <base>.sfx.json, so point --master at a base that has it).
"""
import argparse
import os
import sys

sys.dont_write_bytecode = True
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import _avlib as av  # noqa: E402


def main():
    ap = argparse.ArgumentParser(description="Rebuild the SFX stem without the named sounds; picture untouched.",
                                 epilog=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--master", required=True, help="base path of the master, e.g. out/master-v1")
    ap.add_argument("--drop", nargs="+", default=["whoosh"], help="sound names to remove (default: whoosh)")
    ap.add_argument("-o", "--out", help="base path of the outputs (default <master>-nowhoosh)")
    a = ap.parse_args()

    base = os.path.expanduser(a.master)
    out = os.path.expanduser(a.out) if a.out else base + "-nowhoosh"
    if os.path.abspath(out) == os.path.abspath(base):
        sys.exit("refusing to overwrite the master: choose another -o")
    os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
    for p in (base + ".sfx.json", base + "-nosfx.mov", base + ".mp4"):
        av.guard_input(p, media=not p.endswith(".json"))
    sfx = av.load_json(base + ".sfx.json")
    keep = [e for e in sfx if e["sound"] not in set(a.drop)]
    print(f"{len(sfx)} sfx -> {len(keep)} kept ({len(sfx) - len(keep)} removed: {', '.join(a.drop)})")
    dur = av.duration(base + "-nosfx.mov")
    stem_wav = out + ".sfx.wav"
    av.write_wav(stem_wav, av.build_stem(keep, dur))
    av.dump_json(keep, out + ".sfx.json")
    av.run(["ffmpeg", "-v", "error", "-y", "-i", base + "-nosfx.mov", "-i", stem_wav, "-i", base + ".mp4", "-filter_complex", av.MIX_FILTER,
            "-map", "2:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "320k", "-movflags", "+faststart", out + ".mp4"])
    print("wrote", out + ".mp4")


if __name__ == "__main__":
    main()
