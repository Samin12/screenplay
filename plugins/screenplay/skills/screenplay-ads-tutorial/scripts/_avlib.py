"""Shared audio/video helpers for the scripts in this folder (not a command; imported by them).

Python 3, stdlib + numpy, ffmpeg/ffprobe on PATH. Everything here works at 48 kHz stereo float32.
"""
import hashlib
import json
import os
import shutil
import subprocess
import sys
import time
import wave

import numpy as np

SR = 48000


# ---------------------------------------------------------------- paths

def rp(path, base=None):
    """Expand ~ and resolve a path relative to `base` (a config file's folder)."""
    path = os.path.expanduser(str(path))
    if not os.path.isabs(path) and base:
        path = os.path.join(base, path)
    return os.path.normpath(path)


def load_json(path):
    with open(path, encoding="utf-8") as fh:
        return json.load(fh)


def dump_json(obj, path):
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(obj, fh, indent=1, ensure_ascii=False)


# ---------------------------------------------------------------- ffmpeg

def run(cmd, what="ffmpeg"):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode:
        sys.exit(f"{what} failed: {' '.join(cmd[:8])} ... {r.stderr[-800:]}")
    return r


def duration(path, stream=None):
    """Seconds. stream 'v' or 'a' reads that stream's duration, else the container's."""
    if stream:
        cmd = ["ffprobe", "-v", "error", "-select_streams", stream + ":0", "-show_entries", "stream=duration", "-of", "json", path]
        o = subprocess.run(cmd, capture_output=True, text=True)
        try:
            return float(json.loads(o.stdout)["streams"][0]["duration"])
        except (ValueError, KeyError, IndexError):
            pass
    o = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path], capture_output=True, text=True)
    try:
        return float(o.stdout.strip())
    except ValueError:
        sys.exit(f"ffprobe cannot read {path}: {o.stderr.strip()[-300:]}")


def decode(path, a=None, b=None, ch=2):
    """Audio of [a, b) seconds (or the whole file) as float32, shape (n, ch)."""
    cmd = ["ffmpeg", "-v", "error"]
    if a is not None:
        cmd += ["-ss", f"{a:.4f}", "-t", f"{b - a:.4f}"]
    cmd += ["-i", path, "-vn", "-f", "f32le", "-ac", str(ch), "-ar", str(SR), "-"]
    r = subprocess.run(cmd, capture_output=True)
    if r.returncode:
        sys.exit(f"cannot decode audio of {path}: {r.stderr.decode(errors='replace')[-300:]}")
    return np.frombuffer(r.stdout, dtype=np.float32).reshape(-1, ch)


def write_wav(path, data):
    """16-bit PCM wav at 48 kHz from float data, shape (n,) or (n, ch)."""
    data = np.asarray(data, dtype=np.float32)
    if data.ndim == 1:
        data = data[:, None]
    with wave.open(path, "wb") as wv:
        wv.setnchannels(data.shape[1])
        wv.setsampwidth(2)
        wv.setframerate(SR)
        wv.writeframes((np.clip(data, -1, 1) * 32767).astype("<i2").tobytes())


def db(x):
    return 20 * float(np.log10(max(float(x), 1e-12)))


# ---------------------------------------------------------------- input guard

def guard_input(path, media=True, settle=2.0):
    """Refuse a file that is still being written, and fingerprint it.

    Twice in the edit this came from, a render was picked up while its writer was still running.
    So: stat, (wait if it was modified in the last `settle` seconds), ffprobe it when it is media,
    md5 it, stat again. Exits when ffprobe cannot open it or when its size or mtime moved while reading.
    Returns {"file", "size", "md5"[, "duration"]}.
    """
    if not os.path.exists(path):
        sys.exit(f"missing input: {path}")
    st0 = os.stat(path)
    if time.time() - st0.st_mtime < settle:
        time.sleep(settle)
        st = os.stat(path)
        if (st.st_size, st.st_mtime_ns) != (st0.st_size, st0.st_mtime_ns):
            sys.exit(f"refusing {path}: it is still being written (size {st0.st_size} -> {st.st_size})")
    rec = {"file": path, "size": st0.st_size}
    if media:
        o = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path], capture_output=True, text=True)
        try:
            rec["duration"] = round(float(o.stdout.strip()), 4)
        except ValueError:
            sys.exit(f"refusing {path}: ffprobe cannot open it (half-written render?): {o.stderr.strip()[-200:]}")
    h = hashlib.md5()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 22), b""):
            h.update(chunk)
    rec["md5"] = h.hexdigest()
    st1 = os.stat(path)
    if (st1.st_size, st1.st_mtime_ns) != (st0.st_size, st0.st_mtime_ns):
        sys.exit(f"refusing {path}: its size changed while reading ({st0.st_size} -> {st1.st_size} bytes)")
    return rec


# ---------------------------------------------------------------- pauses and room tone

def rms_track(mono, hop=0.01, win=0.03):
    h, w = int(hop * SR), int(win * SR)
    n = max(0, (len(mono) - w) // h)
    return np.array([np.sqrt(np.mean(mono[i * h:i * h + w] ** 2) + 1e-12) for i in range(n)]), hop


def quiet_point(path, c, back=0.8):
    """The latest real pause (>= 150 ms) in [c - back, c + 0.05]; else the longest quiet run; else c.

    c and the result are seconds in the file. A breather that starts here never splits a word
    ("And- [silence] -tip number five" was the bug when it started at the card frame).
    """
    a0 = max(0.0, c - back)
    mono = decode(path, a0, c + 0.08, ch=1)[:, 0]
    r, hop = rms_track(mono)
    if len(r) < 5:
        return c
    thr = max(10 ** (-50 / 20), 2.5 * float(r.min()))
    runs, i = [], 0
    while i < len(r):
        if r[i] < thr:
            j = i
            while j < len(r) and r[j] < thr:
                j += 1
            runs.append((i, j))
            i = j
        else:
            i += 1
    if not runs:
        return c
    long_runs = [x for x in runs if (x[1] - x[0]) * hop >= 0.15]
    i, j = (long_runs[-1] if long_runs else max(runs, key=lambda x: x[1] - x[0]))
    t = a0 + ((i + j) / 2) * hop + 0.015
    return min(max(t, a0), c)


def pick_room_tone(stereo, length=1.0):
    """`length` seconds of clean room tone from decoded audio, or None.

    Takes the quietest half second that is steady and has no transient in it (no breath, chuckle
    or click), mirrors it to avoid a loop seam, and fades both ends. Digital silence is rejected
    too: a card over dead zero sounds like a dropout.
    Returns (tone, info) with info = {"at": seconds into the audio, "rms_db": level}.
    """
    mono = stereo.mean(axis=1)
    w, h = SR // 2, SR // 20
    best = None
    for i in range(0, max(0, len(mono) - w), h):
        seg = mono[i:i + w]
        r = float(np.sqrt(np.mean(seg ** 2) + 1e-12))
        pk = float(np.abs(seg).max())
        if r < 10 ** (-72 / 20) or r > 10 ** (-48 / 20):      # digital silence, or not quiet
            continue
        if pk / r > 4.5:                                      # a transient inside the window
            continue
        sub = [float(np.sqrt(np.mean(seg[j:j + h] ** 2) + 1e-12)) for j in range(0, w - h, h)]
        if max(sub) / (min(sub) + 1e-9) > 2.2:                # not steady
            continue
        if best is None or r < best[0]:
            best = (r, i)
    if best is None:
        return None
    half = stereo[best[1]:best[1] + w]
    n = int(length * SR)
    loop = np.concatenate([half, half[::-1]])
    tone = np.concatenate([loop] * (n // len(loop) + 1))[:n].copy()
    f = int(0.04 * SR)
    ramp = np.linspace(0, 1, f, dtype=np.float32)[:, None]
    tone[:f] *= ramp
    tone[-f:] *= ramp[::-1]
    return tone, {"at": best[1] / SR, "rms_db": round(db(best[0]), 1)}


def window_stats(stereo, edge=0.06):
    """Floor / peak report for a window that should hold only room tone (a card breather).

    floor_db   RMS of the whole window
    quiet_db   the quietest 50 ms inside it (digital silence shows here even when a click is mixed in)
    peak_db    the largest sample
    bump       loudest 50 ms over the median 50 ms (a chuckle, breath or click gives > 2.5)
    The first and last `edge` seconds are left out of quiet_db and bump: the tone is faded there.
    Flags: "digital silence" when quiet_db < -72 dB, "transient" when bump > 2.5.
    """
    mono = stereo.mean(axis=1) if stereo.ndim == 2 else stereo
    if not len(mono):
        return {"floor_db": -120.0, "quiet_db": -120.0, "peak_db": -120.0, "bump": 0.0, "flags": ["empty"]}
    e = int(edge * SR)
    core = mono[e:len(mono) - e] if len(mono) > 4 * e else mono
    h = SR // 20
    sub = np.array([np.sqrt(np.mean(core[j:j + h] ** 2) + 1e-14) for j in range(0, max(1, len(core) - h + 1), h)])
    out = {
        "floor_db": round(db(np.sqrt(np.mean(mono ** 2) + 1e-14)), 1),
        "quiet_db": round(db(sub.min()), 1),
        "peak_db": round(db(np.abs(mono).max()), 1),
        "bump": round(float(sub.max() / (np.median(sub) + 1e-9)), 2),
        "flags": [],
    }
    if out["quiet_db"] < -72:
        out["flags"].append("digital silence")
    if out["bump"] > 2.5:
        out["flags"].append("transient")
    return out


# ---------------------------------------------------------------- sound-effect stem

def build_stem(sfx, total, chapter_sound="chapter", chapter_max=0.95):
    """One stereo float32 array the length of the master holding every sound effect.

    sfx: [{"sound", "file", "db", "t"}, ...]. Built in numpy because one ffmpeg call with a
    couple of hundred inputs fails. The chapter click is cut to `chapter_max` seconds with a
    quarter-second fade, so it ends inside the one-second breather.
    """
    stem = np.zeros((int(total * SR) + SR, 2), dtype=np.float32)
    cache = {}
    for e in sfx:
        if e["file"] not in cache:
            if not os.path.exists(e["file"]):
                sys.exit(f"sound file missing: {e['file']} (sound '{e['sound']}')")
            cache[e["file"]] = decode(e["file"])
        d = cache[e["file"]] * (10 ** (float(e["db"]) / 20))
        if e["sound"] == chapter_sound and len(d) > int(chapter_max * SR):
            d = d[: int(chapter_max * SR)].copy()
            fo = int(0.25 * SR)
            d[-fo:] *= np.linspace(1, 0, fo, dtype=np.float32)[:, None]
        i = int(max(float(e["t"]), 0) * SR)
        j = min(i + len(d), len(stem))
        if j > i:
            stem[i:j] += d[: j - i]
    return stem[: int(total * SR)]


MIX_FILTER = "[0:a][1:a]amix=inputs=2:normalize=0:duration=first,alimiter=limit=0.89:level=false[a]"


# ---------------------------------------------------------------- whisper

def whisper(path, a, b, model, lang="en"):
    """What whisper-cli hears in [a, b) seconds of a file. Returns None when whisper is not installed."""
    exe = shutil.which("whisper-cli")
    model = os.path.expanduser(model)
    if not exe or not os.path.exists(model):
        return None
    import tempfile
    with tempfile.TemporaryDirectory() as tmp:
        piece = os.path.join(tmp, "p.wav")
        run(["ffmpeg", "-v", "error", "-y", "-ss", f"{max(0, a):.3f}", "-t", f"{b - max(0, a):.3f}", "-i", path,
             "-vn", "-ac", "1", "-ar", "16000", "-c:a", "pcm_s16le", piece])
        r = subprocess.run([exe, "-m", model, "-f", piece, "-nt", "-np", "-l", lang], capture_output=True, text=True)
    return " ".join(r.stdout.split())


def rms_profile(path, center, span=0.3, frame=0.02):
    """dB per 20 ms frame across [center - span, center + span]: a clipped word onset shows as a bump."""
    mono = decode(path, max(0, center - span), center + span, ch=1)[:, 0]
    step = int(frame * SR)
    return [int(round(db(np.sqrt(np.mean(mono[i:i + step] ** 2) + 1e-12)))) for i in range(0, len(mono) - step + 1, step)]


# ---------------------------------------------------------------- headless Chrome

def find_chrome(explicit=None):
    """A Chrome/Chromium binary for HTML -> PNG screenshots: --chrome, then $CHROME, then PATH."""
    cands = [explicit, os.environ.get("CHROME")]
    cands += [shutil.which(n) for n in ("google-chrome", "google-chrome-stable", "chromium", "chromium-browser", "chrome")]
    for c in cands:
        if c and os.path.exists(os.path.expanduser(c)):
            return os.path.expanduser(c)
    sys.exit("no Chrome/Chromium found on PATH: pass --chrome <path to the binary> or set $CHROME")


def screenshot(chrome, html_path, png_path, width=1920, height=1080, transparent=False):
    cmd = [chrome, "--headless=new", "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=1",
           f"--window-size={width},{height}", f"--screenshot={png_path}"]
    if transparent:
        cmd.append("--default-background-color=00000000")
    subprocess.run(cmd + ["file://" + os.path.abspath(html_path)], capture_output=True)
    if not os.path.exists(png_path):
        sys.exit(f"Chrome did not write {png_path}")


def read_image(path, width, height, alpha=False):
    """An image file as a uint8 array (h, w, 3 or 4), scaled to width x height by ffmpeg."""
    pix, n = ("rgba", 4) if alpha else ("rgb24", 3)
    r = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-vf", f"scale={width}:{height}", "-f", "rawvideo", "-pix_fmt", pix, "-frames:v", "1", "-"], capture_output=True)
    if r.returncode or len(r.stdout) != width * height * n:
        sys.exit(f"cannot read image {path}")
    return np.frombuffer(r.stdout, dtype=np.uint8).reshape(height, width, n)
