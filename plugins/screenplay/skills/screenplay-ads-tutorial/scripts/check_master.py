#!/usr/bin/env python3
"""The fast automated check of an assembled master. Prints a pass/fail table; exits 1 on a hard failure.

  python3 check_master.py --master out/master-v1 [-o DIR] [--whisper-at 83.4 154.3 ...]

WHEN: straight after assemble.py and before anything goes into the editor or to a reviewer. It
takes about a minute for a 20-minute master. It does not replace watching the video or a
listening review: it catches the mechanical faults that twice reached a "final".

Reads <base>.mp4, <base>.segments.json and, when present, <base>-nosfx.mov.

CHECKS
  loudness     whole master: integrated LUFS and true peak            FAIL outside --lufs +- --lufs-tol, or peak above --peak-max
  segments     integrated LUFS of every segment                        WARN when one is more than --seg-tol from the target
                                                                       (full clips are often set 1 LU under the voice on purpose)
  silence      every silence longer than --silence-s                   FAIL (a breather over room tone is not silence)
  breathers    floor / quiet / peak / bump of each card's first second FAIL on digital silence or a transient (a looped
               (measured on the no-SFX master, so the chapter click     chuckle or breath in the room tone); WARN-only when
               does not count as a transient)                          only the final mix is there
               A card a lane rendered itself (engine chapters.breather; "breathers": false in the config) has the
               engine's click in its audio, so its transient is not judged here: listen to those cards.
  joins        the frame before and after every segment join, as a      WARN on a dark frame that is not a card (cards
               contact sheet <base>.joins.jpg (or in -o). The real cut  fade in from dark, so those are expected), and
               is found in the frames around the planned time, and its  when a cut sits more than 2 frames from the plan
               drift from the plan is reported (segments whose lengths
               are not whole frames add up to a frame or two)
  whisper      --whisper-at: what whisper hears around those times     printed for reading; never pass/fail

Nothing is written next to the master except the contact sheet; use -o to put it elsewhere.
"""
import argparse
import os
import re
import subprocess
import sys
import tempfile

sys.dont_write_bytecode = True
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np  # noqa: E402
import _avlib as av  # noqa: E402

TW, TH = 320, 180


def ebur(path, a=None, d=None):
    """(integrated LUFS, true peak dBFS) of a file or a part of it."""
    cmd = ["ffmpeg", "-hide_banner", "-nostats"]
    if a is not None:
        cmd += ["-ss", f"{a:.3f}", "-t", f"{d:.3f}"]
    cmd += ["-i", path, "-vn", "-af", "ebur128=peak=true", "-f", "null", "-"]
    err = subprocess.run(cmd, capture_output=True, text=True).stderr
    tail = err[err.rfind("Summary:"):] if "Summary:" in err else ""
    i = re.search(r"I:\s+(-?[\d.]+|-inf) LUFS", tail)
    p = re.search(r"Peak:\s+(-?[\d.]+|-inf) dBFS", tail)
    f = lambda m: float(m.group(1)) if m and m.group(1) != "-inf" else float("-inf")
    return f(i), f(p)


def silences(path, noise_db, min_s):
    err = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", path, "-vn", "-af", f"silencedetect=noise={noise_db}dB:d={min_s}", "-f", "null", "-"],
                         capture_output=True, text=True).stderr
    starts = [float(v) for v in re.findall(r"silence_start: (-?[\d.]+)", err)]
    durs = [float(v) for v in re.findall(r"silence_duration: ([\d.]+)", err)]
    return list(zip(starts, durs))


SPAN = 5          # frames looked at on each side of a planned join


def frames_around(path, t, fps):
    """The 2 * SPAN frames around a planned join time, and the index of the planned first frame of the next segment."""
    t0 = max(0.0, t - (SPAN + 0.25) / fps)
    r = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{t0:.4f}", "-i", path, "-frames:v", str(2 * SPAN), "-vf", f"scale={TW}:{TH}",
                        "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], capture_output=True)
    n = len(r.stdout) // (TW * TH * 3)
    fr = np.frombuffer(r.stdout[: n * TW * TH * 3], dtype=np.uint8).reshape(n, TH, TW, 3)
    return fr, min(SPAN, max(0, n - 1))


def find_cut(fr, planned):
    """Index of the first frame after the real cut (the biggest picture change in the window) and its drift from the plan in frames."""
    if len(fr) < 2:
        return planned, 0
    diff = [float(np.abs(fr[i].astype(np.int16) - fr[i - 1].astype(np.int16)).mean()) for i in range(1, len(fr))]
    i = int(np.argmax(diff)) + 1
    if diff[i - 1] < 4:                       # no visible change at all (a held frame into a card that starts on it)
        return planned, 0
    return i, i - planned


def mmss(t):
    return f"{int(t) // 60}:{t % 60:05.2f}"


def main():
    ap = argparse.ArgumentParser(description="Fast automated check of an assembled master.",
                                 epilog=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--master", required=True, help="base path of the master, e.g. out/master-v1")
    ap.add_argument("-o", "--out", help="folder for the join contact sheet (default: next to the master)")
    ap.add_argument("--lufs", type=float, default=-16.0, help="target integrated loudness (default -16)")
    ap.add_argument("--lufs-tol", type=float, default=1.0, help="allowed distance from the target for the whole master (default 1.0)")
    ap.add_argument("--seg-tol", type=float, default=1.5, help="warn when a segment is further than this from the target (default 1.5)")
    ap.add_argument("--peak-max", type=float, default=-1.0, help="highest allowed true peak in dBFS (default -1.0)")
    ap.add_argument("--silence-s", type=float, default=0.9, help="silences longer than this fail (default 0.9)")
    ap.add_argument("--silence-db", type=float, default=-60.0, help="level under which audio counts as silence (default -60)")
    ap.add_argument("--fps", type=float, default=30.0, help="frame rate, for the join frames (default 30)")
    ap.add_argument("--no-joins", action="store_true", help="skip the contact sheet")
    ap.add_argument("--whisper-at", type=float, nargs="*", default=[], help="master times (s) to transcribe around")
    ap.add_argument("--whisper-file", help="a text file with one time per line (seconds or m:ss, text after it is ignored)")
    ap.add_argument("--pad", type=float, default=3.0, help="seconds of audio on each side of a whisper time (default 3)")
    ap.add_argument("--model", default="~/.cache/whisper/ggml-large-v3-turbo.bin", help="whisper.cpp model file")
    a = ap.parse_args()

    base = os.path.expanduser(a.master)
    mp4, nosfx = base + ".mp4", base + "-nosfx.mov"
    d = av.load_json(base + ".segments.json")
    av.guard_input(mp4)
    rows, hard = [], 0

    def row(check, item, value, verdict):
        nonlocal hard
        rows.append((check, item, value, verdict))
        hard += verdict == "FAIL"

    with tempfile.TemporaryDirectory() as tmp:
        wav = os.path.join(tmp, "a.wav")
        av.run(["ffmpeg", "-v", "error", "-y", "-i", mp4, "-vn", "-c:a", "pcm_s16le", "-ar", "48000", wav])
        # ---- loudness
        lufs, peak = ebur(wav)
        dur = av.duration(wav)
        row("loudness", "whole master", f"{lufs:.1f} LUFS", "ok" if abs(lufs - a.lufs) <= a.lufs_tol else "FAIL")
        row("peak", "whole master", f"{peak:.1f} dBFS", "ok" if peak <= a.peak_max else "FAIL")
        row("length", "audio vs plan", f"{dur:.2f} s vs {d['total']:.2f} s", "ok" if abs(dur - d["total"]) < 0.25 else "FAIL")
        for p in d["segments"]:
            if p.get("is_card"):
                continue
            l, _ = ebur(wav, p["start"], p["dur"])
            row("segment", p["id"], f"{l:.1f} LUFS", "ok" if abs(l - a.lufs) <= a.seg_tol else "warn")
        # ---- silences
        sil = silences(wav, a.silence_db, a.silence_s)
        if not sil:
            row("silence", f"over {a.silence_s} s", "none", "ok")
        for s0, sd in sil:
            row("silence", mmss(s0), f"{sd:.2f} s", "FAIL")
    # ---- breathers
    src = nosfx if os.path.exists(nosfx) else mp4
    for s0, s1, title, *kind in d["card_spans"]:
        st = av.window_stats(av.decode(src, s0, s0 + 1.0))
        val = f"floor {st['floor_db']:.0f} quiet {st['quiet_db']:.0f} peak {st['peak_db']:.0f} dB bump {st['bump']:.1f}"
        baked = "lane" in kind                       # the lane rendered its own card: the engine's click is in its audio
        bad = st["flags"] if src == nosfx and not baked else [f for f in st["flags"] if f != "transient"]
        verdict = "FAIL" if bad else ("warn" if st["flags"] else "ok")
        row("breather", f"{mmss(s0)} {title}"[:44], val + (" " + "+".join(st["flags"]) if st["flags"] else ""), verdict)
    if src != nosfx:
        print(f"note: {os.path.basename(nosfx)} not found; breathers measured on the final mix (the chapter click reads as a transient)")
    # ---- joins
    if not a.no_joins and len(d["segments"]) > 1:
        tiles, dark, drifts = [], 0, []
        for p, q in zip(d["segments"], d["segments"][1:]):
            t = q["start"]
            fr, planned = frames_around(mp4, t, a.fps)
            if not len(fr):
                row("join", mmss(t), "no frames decoded", "FAIL")
                continue
            cut, drift = find_cut(fr, planned)
            drifts.append(abs(drift))
            if abs(drift) > 2:
                row("join", mmss(t), f"the picture cuts {drift:+d} frames from the plan", "warn")
            before, after = fr[max(0, cut - 1)], fr[min(cut, len(fr) - 1)]
            tiles += [before, after]
            for nm, im, is_card in (("last frame of " + p["id"], before, p.get("is_card")), ("first frame of " + q["id"], after, q.get("is_card"))):
                if im.mean() < 12 and not is_card:
                    dark += 1
                    row("join", mmss(t), f"dark frame: {nm}", "warn")
        cols = 8
        while len(tiles) % cols:
            tiles.append(np.zeros((TH, TW, 3), dtype=np.uint8))
        sheet = np.concatenate([np.concatenate(tiles[i:i + cols], axis=1) for i in range(0, len(tiles), cols)], axis=0)
        out_dir = os.path.expanduser(a.out) if a.out else os.path.dirname(os.path.abspath(base))
        os.makedirs(out_dir, exist_ok=True)
        jpg = os.path.join(out_dir, os.path.basename(base) + ".joins.jpg")
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{sheet.shape[1]}x{sheet.shape[0]}", "-i", "-",
                        "-frames:v", "1", "-q:v", "3", jpg], input=sheet.tobytes(), check=True)
        row("joins", f"{len(d['segments']) - 1} joins", f"sheet: {os.path.basename(jpg)} (pairs: before, after); cut drift max {max(drifts, default=0)} frames",
            "ok" if not dark and max(drifts, default=0) <= 2 else "warn")

    # ---- table
    w = [max(len(str(r[i])) for r in rows + [("check", "item", "value", "result")]) for i in range(4)]
    line = lambda r: "  ".join(str(c).ljust(w[i]) for i, c in enumerate(r)).rstrip()
    print(line(("check", "item", "value", "result")))
    print("  ".join("-" * n for n in w))
    for r in rows:
        print(line(r))
    warns = sum(1 for r in rows if r[3] == "warn")
    print(f"\n{'FAIL' if hard else 'PASS'}: {hard} hard failure(s), {warns} warning(s), {len(rows)} rows")

    # ---- whisper (for reading)
    times = list(a.whisper_at)
    if a.whisper_file:
        for ln in open(os.path.expanduser(a.whisper_file), encoding="utf-8"):
            m = re.match(r"\s*(?:(\d+):)?(\d+(?:\.\d+)?)", ln)
            if m:
                times.append(int(m.group(1) or 0) * 60 + float(m.group(2)))
    for t in times:
        heard = av.whisper(mp4, t - a.pad, t + a.pad, a.model)
        if heard is None:
            print("whisper: whisper-cli or the model file is missing; skipped (see --model)")
            break
        print(f"{mmss(t)}  heard: {heard}\n         rms: {av.rms_profile(mp4, t)}")
    sys.exit(1 if hard else 0)


if __name__ == "__main__":
    main()
