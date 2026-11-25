#!/usr/bin/env python3
"""Pick clean room tone from a recording, or audit a window that should hold only room tone.

  python3 room_tone.py <file> [--start S --end S] [--len 1.0] -o tone.wav
  python3 room_tone.py --check <file> --at S [--len 1.0]

WHEN (pick): before assembling, when the inserted chapter cards need one shared tone
("shared_tone": {"file": "tone.wav"} in the assemble config), or a splice needs a bed.
WHEN (check): after assembling, to audit a card's breather for a looped chuckle or digital
silence. Use the no-SFX master (master-<v>-nosfx.mov): in the final mix the chapter click sits
inside the breather and reads as a transient.

PICK takes the quietest half second in [--start, --end] that is steady and transient-free (no
breath, chuckle or click; not digital silence), mirrors it so the loop has no seam, fades both
ends 40 ms and writes --len seconds. Exits 1 when the range has no such window: pick another
stretch (a talking part between sentences works best), never fall back to silence.

CHECK prints floor (RMS of the window), quiet (its quietest 50 ms), peak, and bump (loudest
50 ms over the median 50 ms). It flags "digital silence" when quiet < -72 dB and "transient"
when bump > 2.5, and exits 1 on either. A good breather reads about -50 to -60 dB floor, peak
within about 15 dB of it, bump under 2.
"""
import argparse
import os
import sys

sys.dont_write_bytecode = True
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import _avlib as av  # noqa: E402


def main():
    ap = argparse.ArgumentParser(description="Pick clean room tone, or audit a breather window.",
                                 epilog=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("file", nargs="?", help="recording to take the tone from (any audio or video file)")
    ap.add_argument("--start", type=float, default=0.0, help="search from this second (default 0)")
    ap.add_argument("--end", type=float, help="search up to this second (default: start + 300, or the end of the file)")
    ap.add_argument("--len", type=float, default=1.0, dest="length", help="seconds of tone to write, or the window length for --check (default 1.0)")
    ap.add_argument("-o", "--out", help="tone wav to write (48 kHz stereo, 16 bit)")
    ap.add_argument("--check", metavar="FILE", help="audit a window of this file instead of picking")
    ap.add_argument("--at", type=float, help="--check: start of the window in seconds")
    a = ap.parse_args()

    if a.check:
        if a.at is None:
            ap.error("--check needs --at")
        path = os.path.expanduser(a.check)
        st = av.window_stats(av.decode(path, a.at, a.at + a.length))
        verdict = ", ".join(st["flags"]).upper() if st["flags"] else "ok"
        print(f"{a.at:.2f}-{a.at + a.length:.2f} s  floor {st['floor_db']:.1f} dB  quiet {st['quiet_db']:.1f} dB  "
              f"peak {st['peak_db']:.1f} dB  bump {st['bump']:.2f}  {verdict}")
        sys.exit(1 if st["flags"] else 0)

    if not a.file or not a.out:
        ap.error("give a file and -o tone.wav (or use --check)")
    path = os.path.expanduser(a.file)
    end = a.end if a.end is not None else min(av.duration(path), a.start + 300.0)
    got = av.pick_room_tone(av.decode(path, a.start, end), a.length)
    if got is None:
        print(f"no clean room tone in {a.start:.1f}-{end:.1f} s: no steady, transient-free half second between -72 and -48 dB", file=sys.stderr)
        sys.exit(1)
    tone, info = got
    av.write_wav(os.path.expanduser(a.out), tone)
    print(f"wrote {a.out}: {a.length:.2f} s from {a.start + info['at']:.2f} s of the file, {info['rms_db']:.1f} dB RMS")


if __name__ == "__main__":
    main()
