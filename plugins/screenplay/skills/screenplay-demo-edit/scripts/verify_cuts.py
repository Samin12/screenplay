#!/usr/bin/env python3 -I
"""Listen (by proxy) to every cut join: whisper a few seconds around each one in the exported mix.

  python3 -I verify_cuts.py <config.json> <mix.wav> [--pad 3] [--model ~/.cache/whisper/ggml-large-v3-turbo.bin]

<config.json> is borumi_assemble.py's config (cuts in render ms, cards, gap). <mix.wav> is the project's mix
AFTER the cuts (Borumi `export_audio`, whole project). Prints each join's project time and what whisper hears
around it; every line should read as one clean sentence with the filler gone. Also prints the RMS energy
(dB, 20 ms frames) across the join so a clipped word onset (a stray "B...") shows as a bump right after it.
"""
import argparse
import json
import math
import os
import struct
import subprocess
import tempfile
import wave


def rms_profile(path, center, span=0.3, frame=0.02):
    with wave.open(path) as w:
        sr, n = w.getframerate(), w.getnframes()
        a = max(0, int((center - span) * sr))
        w.setpos(a)
        raw = w.readframes(int(2 * span * sr))
    x = struct.unpack(f"<{len(raw) // 2}h", raw)
    step = int(frame * sr)
    out = []
    for i in range(0, len(x) - step, step):
        e = sum(v * v for v in x[i:i + step]) / step
        out.append(round(10 * math.log10(e / 32768 ** 2 + 1e-12)))
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("config")
    ap.add_argument("mix")
    ap.add_argument("--pad", type=float, default=3.0)
    ap.add_argument("--model", default="~/.cache/whisper/ggml-large-v3-turbo.bin")
    a = ap.parse_args()
    here = os.path.dirname(os.path.abspath(a.config))
    cfg = json.load(open(a.config))
    cards = json.load(open(os.path.join(here, os.path.expanduser(cfg["cards"]))))
    C, G = [c["card_ms"] for c in cards], cfg.get("gap_ms", 1000)
    proj = lambda r: r + G * sum(1 for c in C if c <= r)
    removed = 0
    with tempfile.TemporaryDirectory() as tmp:
        for s, e, what in sorted(cfg.get("cuts", [])):
            join = (proj(s) - removed) / 1000
            removed += e - s
            piece = os.path.join(tmp, "p.wav")
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{max(0, join - a.pad):.3f}", "-t", f"{2 * a.pad:.3f}",
                            "-i", a.mix, "-ac", "1", "-ar", "16000", "-c:a", "pcm_s16le", piece], check=True)
            r = subprocess.run(["whisper-cli", "-m", os.path.expanduser(a.model), "-f", piece, "-nt", "-np", "-l", "en"],
                               capture_output=True, text=True)
            text = " ".join(r.stdout.split())
            print(f"{int(join // 60)}:{join % 60:05.2f}  cut: {what}\n    heard: {text}\n    rms: {rms_profile(piece, a.pad)}")


if __name__ == "__main__":
    main()
