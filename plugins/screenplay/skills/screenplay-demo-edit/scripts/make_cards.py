#!/usr/bin/env python3 -I
"""Chapter-break clips for the Borumi working edit, cut from the screenplay render.

  python3 -I make_cards.py <work dir> <render.mp4> <out dir> [--gap 1.0]

For each chapter card at render time C (from <work>/.screenplay/timeline.json): the render's card build
[C, C+gap] with no sound, then its last frame held for `gap` while the render's audio [C, C+gap] plays.
The chapter scene in Borumi then continues from C+gap, so picture and speech stay in sync. Writes
<out>/card-NN.mp4 (NN = chapter scene number, the intro is 01) and <out>/cards.json.
"""
import argparse
import json
import os
import subprocess


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("work")
    ap.add_argument("render")
    ap.add_argument("out")
    ap.add_argument("--gap", type=float, default=1.0)
    a = ap.parse_args()
    G = a.gap
    os.makedirs(a.out, exist_ok=True)
    t = json.load(open(os.path.join(a.work, ".screenplay", "timeline.json")))["timeline"]
    fps = t.get("fps", 30)
    rows = []
    for c in t["chapters"]:
        C = c["frame"] / fps
        out = os.path.join(a.out, f"card-{c['index'] + 2:02d}.mp4")
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{C:.6f}", "-i", a.render, "-t", f"{G}",
                        "-filter_complex",
                        f"[0:v]trim=duration={G},setpts=PTS-STARTPTS,tpad=stop_mode=clone:stop_duration={G},"
                        f"fps={fps},format=yuv420p[v];"
                        f"[0:a]atrim=duration={G},asetpts=PTS-STARTPTS,adelay={int(G * 1000)}:all=1,"
                        f"apad=whole_dur={2 * G}[a]",
                        "-map", "[v]", "-map", "[a]", "-t", f"{2 * G}", "-c:v", "libx264", "-crf", "16",
                        "-preset", "fast", "-c:a", "aac", "-ar", "48000", "-b:a", "256k", out], check=True)
        d = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", out],
                                 capture_output=True, text=True).stdout)
        rows.append({"index": c["index"], "title": c["title"], "card_ms": round(C * 1000), "file": out, "dur": d})
        print(f"  {os.path.basename(out)}  {c['title']}  at {C:.3f} s")
    json.dump(rows, open(os.path.join(a.out, "cards.json"), "w"), indent=1)


if __name__ == "__main__":
    main()
