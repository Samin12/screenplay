#!/usr/bin/env python3
"""Insert or restore a connecting word ("Because", "Then", "So,") from the speaker's own audio.

  python3 splice_connective.py --target mic.wav --at 4.900 [--resume 4.977] \
        --donor mic.wav --from 14.309 --to 14.853 [--tone tone.wav --pad-before 0.1] -o mic.v2.wav
  python3 splice_connective.py --judge out.wav --join 4.90 [--join 5.44]

WHEN: a cut removed the word that links two sentences and the join now sounds like two
statements. The word must be the speaker's own, from the same microphone and session: no TTS,
no cloning, no pitch change. If no clean donor exists, write a pickup line for them to record.

SPLICE: target up to --at, then the donor [--from, --to], then the target from --resume
(default --at; set it later to drop a sliver of the target, e.g. to land just before the
voicing of the next word). Both joins are equal-power crossfades (--xfade-ms, default 8).
Put a join between an unvoiced burst and a voiced sound, never inside a vowel.
  Level   the donor is matched to the target. By default both are measured over their
          loudest speech (the top half of 50 ms frames) in the donor and in the 1.5 s on each
          side of the join. Better: give a word both share with --match-donor A B and
          --match-target A B. --gain-db sets it by hand. The script then measures the result
          and exits 1 if the donor sits more than 1 dB from the target reference.
  Tone    --tone lays room tone (room_tone.py) for --pad-before / --pad-after seconds on
          either side of the donor, so a lengthened pause is never digital silence.
  Output  -o, 48 kHz, same channel count as the target. Prints both join times and the net
          insert in seconds and frames: everything after the splice moves by that much
          (word timings, captions, sound cues, and the picture needs the same number of frames).

JUDGE (--judge <clip>): runs whisper on the clip and prints the transcript and the RMS (dB per
20 ms) around each --join. A clipped onset shows as a bump right after the join; a pasted word
whisper mishears is a bad join.

THE LISTEN IS A MANUAL STEP. This script does not call a listening model. Cut a 5 to 9 s clip
around the join and ask Gemini (audio in), three separate times:
    "Listen to this clip. Is it one natural, continuous sentence, or can you hear an edit?
     If you hear an edit, say where, and which word sounds pasted in."
Accept at 2 of 3 "natural" (and no run naming the inserted word as pasted).
CAVEAT: that question can fail on untouched audio. Run the same three listens on the clip
WITHOUT the splice as a control. If the control fails too, use the paired comparison instead:
both clips in one call, order swapped between calls,
    "Which clip has the more audible edit after '<word before the join>', and is any word pasted in?"
and accept when the unspliced clip is named more audible every time and the inserted word is
never called pasted. When neither test settles it, the creator's ear on a before/after preview decides.
"""
import argparse
import os
import subprocess
import sys

sys.dont_write_bytecode = True
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np  # noqa: E402
import _avlib as av  # noqa: E402

SR = av.SR


def speech_rms(x):
    """RMS of the loudest half of 50 ms frames: the level of the speech, not of the pauses."""
    mono = x.mean(axis=1)
    h = SR // 20
    if len(mono) < h:
        return float(np.sqrt(np.mean(mono ** 2) + 1e-14))
    fr = np.array([np.mean(mono[i:i + h] ** 2) for i in range(0, len(mono) - h + 1, h)])
    fr.sort()
    return float(np.sqrt(np.mean(fr[len(fr) // 2:]) + 1e-14))


def xfade(a, b, n):
    """a then b, overlapping n samples with an equal-power crossfade."""
    n = min(n, len(a), len(b))
    if n <= 0:
        return np.concatenate([a, b])
    t = np.linspace(0, np.pi / 2, n, dtype=np.float32)[:, None]
    return np.concatenate([a[:-n], a[-n:] * np.cos(t) + b[:n] * np.sin(t), b[n:]])


def loop(tone, n):
    return np.concatenate([tone] * (n // len(tone) + 1))[:n] if n > 0 else tone[:0]


def judge(a):
    path = os.path.expanduser(a.judge)
    dur = av.duration(path)
    heard = av.whisper(path, 0, dur, a.model)
    print("heard:", heard if heard is not None else "(whisper-cli or the model file is missing; see --model)")
    for j in a.join or []:
        print(f"rms around {j:.3f} s (dB per 20 ms, join in the middle): {av.rms_profile(path, j)}")
    print("\nNow the listen (manual): ask Gemini 3 times, accept at 2 of 3; run the control and the paired comparison. See --help.")


def main():
    ap = argparse.ArgumentParser(description="Insert a connecting word from the speaker's own audio, or judge a join.",
                                 epilog=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--target", help="the audio to insert into (wav or any file ffmpeg reads)")
    ap.add_argument("--at", type=float, help="the join: the target plays up to this second")
    ap.add_argument("--resume", type=float, help="the target continues from this second (default: --at)")
    ap.add_argument("--donor", help="the audio that holds the word (same mic and session)")
    ap.add_argument("--from", type=float, dest="d0", help="donor start, seconds")
    ap.add_argument("--to", type=float, dest="d1", help="donor end, seconds")
    ap.add_argument("--match-donor", type=float, nargs=2, metavar=("A", "B"), help="a shared word in the donor file, for the level match")
    ap.add_argument("--match-target", type=float, nargs=2, metavar=("A", "B"), help="the same word in the target file")
    ap.add_argument("--gain-db", type=float, help="set the donor gain by hand instead of matching")
    ap.add_argument("--tone", help="room-tone wav for the pads (room_tone.py)")
    ap.add_argument("--pad-before", type=float, default=0.0, help="seconds of room tone before the donor")
    ap.add_argument("--pad-after", type=float, default=0.0, help="seconds of room tone after the donor")
    ap.add_argument("--xfade-ms", type=float, default=8.0, help="crossfade length at each join (default 8)")
    ap.add_argument("--fps", type=float, default=30.0, help="frame rate, to report the insert in frames (default 30)")
    ap.add_argument("-o", "--out", help="output wav")
    ap.add_argument("--judge", metavar="CLIP", help="transcribe a clip and print the RMS around --join")
    ap.add_argument("--join", type=float, action="append", help="--judge: a join time in the clip (repeatable)")
    ap.add_argument("--model", default="~/.cache/whisper/ggml-large-v3-turbo.bin", help="whisper.cpp model file")
    a = ap.parse_args()
    if a.judge:
        return judge(a)
    for k in ("target", "at", "donor", "d0", "d1", "out"):
        if getattr(a, k) is None:
            ap.error("a splice needs --target --at --donor --from --to -o (or use --judge)")
    if (a.pad_before or a.pad_after) and not a.tone:
        ap.error("--pad-before/--pad-after need --tone (never pad with digital silence)")
    resume = a.at if a.resume is None else a.resume
    if resume < a.at or a.d1 <= a.d0:
        ap.error("--resume must not be before --at, and --to must be after --from")

    tpath, dpath = os.path.expanduser(a.target), os.path.expanduser(a.donor)
    ch = int(subprocess.run(["ffprobe", "-v", "error", "-select_streams", "a:0", "-show_entries", "stream=channels", "-of", "csv=p=0", tpath],
                            capture_output=True, text=True).stdout.strip() or 2)
    tgt = av.decode(tpath, ch=ch)
    n = int(a.xfade_ms / 1000 * SR)
    half = n / 2 / SR                                 # the donor is read half a crossfade wider on each side, so the insert is exact
    donor = av.decode(dpath, max(0.0, a.d0 - half), a.d1 + half, ch=ch).copy()
    i_at, i_res = int(round(a.at * SR)), int(round(resume * SR))

    # ---- level
    if a.match_donor and a.match_target:
        ref_t = speech_rms(av.decode(tpath, *a.match_target, ch=ch))
        ref_d = speech_rms(av.decode(dpath, *a.match_donor, ch=ch))
        how = "shared word"
    else:
        ref_t = speech_rms(np.concatenate([tgt[max(0, i_at - int(1.5 * SR)):i_at], tgt[i_res:i_res + int(1.5 * SR)]]))
        ref_d = speech_rms(donor)
        how = "speech around the join"
    gain = a.gain_db if a.gain_db is not None else av.db(ref_t) - av.db(ref_d)
    donor *= 10 ** (gain / 20)
    miss = (av.db(ref_d) + gain) - av.db(ref_t)
    print(f"level: target {av.db(ref_t):.1f} dB, donor {av.db(ref_d):.1f} dB ({how}); donor gain {gain:+.1f} dB; now {miss:+.1f} dB from the target")

    # ---- build
    mid = donor
    if a.tone:
        tone = av.decode(os.path.expanduser(a.tone), ch=ch)
        if a.pad_before > 0:
            mid = xfade(loop(tone, int(a.pad_before * SR) + n), mid, n)
        if a.pad_after > 0:
            mid = xfade(mid, loop(tone, int(a.pad_after * SR) + n), n)
    out = xfade(xfade(tgt[:i_at + n // 2], mid, n), tgt[max(0, i_res - n // 2):], n)
    av.write_wav(os.path.expanduser(a.out), out)
    net = (len(out) - len(tgt)) / SR
    j_out = a.at + a.pad_before + (a.d1 - a.d0) + a.pad_after
    print(f"wrote {a.out}: join in at {a.at:.3f} s, join out at {j_out:.3f} s; net insert {net:+.4f} s = {net * a.fps:+.2f} frames at {a.fps:g} fps")
    if abs(net * a.fps - round(net * a.fps)) > 0.05:
        print("note: the insert is not a whole number of frames; nudge --from/--to or the pads so the picture can match")
    print("next: --judge the join, then the manual listen (see --help)")
    if abs(miss) > 1.0:
        print(f"FAIL: the donor is {miss:+.1f} dB from the target reference (limit 1 dB)", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
