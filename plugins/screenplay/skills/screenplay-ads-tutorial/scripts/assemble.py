#!/usr/bin/env python3
"""Assemble a whole video from its lane renders, full clips and chapter cards.

  python3 assemble.py --config assemble.json --version v1 [--only-plan] [--work DIR] [--out DIR] [--whoosh]

WHEN: every lane (one screenplay work folder per part of the video) has a final render, the
chapter cards exist (chapter_cards.py, or the engine's `chapters.style: path` when available),
and you want one master. Run with --only-plan first: it prints every segment's start and length
and writes the plan files without encoding anything.

WHAT IT DOES
- One intermediate per segment in the work folder (same size, fps, pcm 48 kHz), cached by the
  filter it was built with and the md5 of its inputs.
- Chapter cards, two kinds:
  (a) REPLACE a lane's own engine chapter card. The lane's `.screenplay/timeline.json` gives the
      card's frame. A 1 s breather is inserted that starts at a real pause before the card
      (the latest >= 150 ms pause in the 0.8 s before it), the picture holds the frame at the
      pause, the card movie builds during the breather over clean room tone, then holds over
      the engine's own 2 s card while the speaker starts.
  (b) INSERT a card movie before a segment that has "card": <chapter index>, over one shared
      room tone, so no card sits on digital silence.
- Split segments ("start"/"end" in seconds of the file) so a full clip can go in mid-lane.
- Per-segment "gain" in dB.
- A sound-effect stem built in numpy (one wav the length of the master) from each lane's
  timeline or the lane's own sfx json, deduplicated. WHOOSHES ARE OFF by default (clicks, pops
  and the chapter click only); --whoosh turns them on.
- Captions (.srt) shifted to master time and split at breathers so no cue bridges one;
  zero-width characters stripped.
- Before any input is used it is ffprobed and its size and md5 are recorded in .segments.json;
  an input that ffprobe cannot open or whose size changes while reading is refused (a render
  picked up while still being written).
- "extra_audio" items (a transition's sound tail that runs under the next segment's first
  words) are mixed into the no-SFX master: they are part of the picture's own sound.

WRITES (in --out, default "out_dir" from the config, default `out/` next to the config)
  master-<v>-nosfx.mov     picture + voice + clip sound (for the editor; SFX go in as separate clips)
  master-<v>.mp4           the same with the SFX stem mixed in (the deliverable)
  master-<v>.sfx.json      every sound effect: sound, file, dB, time in the master, why
  master-<v>.sfx.wav       the stem
  master-<v>.srt           captions
  master-<v>.chapters.txt  every chapter at its card (first one pinned to 00:00)
  master-<v>.segments.json total, segments (id, file, start, dur, cards, pauses), card_spans, inputs

CONFIG (JSON; relative paths are relative to the config file, ~ is expanded). See assemble.example.json.
  "fps": 30, "width": 1920, "height": 1080
  "out_dir": "out"
  "chapters":  ["Intro", "Level 1: ...", ...]  or a path to a JSON list (chapter_cards.py writes chapters.json)
  "cards":     "cards/ch-{index:02d}.mov"      card movie per chapter index (index 0 has no card)
  "lane_card_index": {"1": 2, "2": 3}          a lane's chapter number (timeline chapter index + 1) -> chapter index
  "inserted_card_s": 2.0                       length of an inserted card
  "sounds": {"whoosh": {"file": "...", "db": -6}, "pop": {...}, "click": {...}, "chapter": {"file": "...", "db": 0}}
             Sound files are yours to supply (an editor's built-in sounds, a creator's click). None are bundled.
  "shared_tone": {"segment": "<segment id>"} or {"file": "tone.wav"}   room tone under inserted cards
             (default: the first lane segment that has a clean half second; make a file with room_tone.py)
  "keep_near_click": ["card"]                  a pop/whoosh within a second of a chapter click is dropped
                                               unless its reason contains one of these words
  "segments": [ ... in order ... ]
     "id"            unique name; also the intermediate's file name
     "file"          the render or clip
     "lane"          the lane's work folder (has .screenplay/timeline.json): enables card replacement and derived SFX
     "offset"        seconds in the file before the lane's frame 0 (a clip joined in front of the lane render)
     "start", "end"  use only this part of the file (seconds)
     "vdur"          use the file up to this many seconds (when the picture is shorter than a sound tail)
     "gain"          dB
     "card"          insert the card of this chapter index before the segment
     "chapter"       a plain chapter title that starts at this segment (no card)
     "breathers"     false = leave the lane's own chapter cards alone
     "card_index"    per-segment override of "lane_card_index"
     "srt", "srt_offset"   the segment's captions
     "sfx"           false = no derived SFX for this lane
     "sfx_json"      the lane's own SFX list [{"sound", "t", "why"}] (times in the file) instead of derived ones
     "sfx_at"        [["pop", 3.2], ...] extra sounds, seconds from the segment's start in the master
     "no_sfx_in"     [[a, b], ...] file-time ranges with no derived SFX
     "whoosh_gap"    minimum seconds between two whooshes (default 2.5)
     "vfade_in"      seconds of fade-in on the picture
  "extra_audio": [{"after": "<segment id>", "file": "...", "ss": 23.87, "db": 0}]
     audio that starts where that segment ends, read from `ss` seconds into the file
  "scenes": {...}  read by make_scenes.py
"""
import argparse
import os
import re
import sys

sys.dont_write_bytecode = True
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import _avlib as av  # noqa: E402


def derive_sfx(tl, off, min_gap, fps):
    """whoosh on scene changes, pop on title cards and overlays, click on send. Times in the lane FILE (seconds)."""
    scenes = tl["scenes"]
    chap = [c["frame"] for c in tl["chapters"] if c.get("frame", -1) >= 0]
    f2t = lambda f: off + f / fps
    sfx = []
    for s in scenes:
        f = s["from"]
        near = any(0 <= f - c <= 75 for c in chap)
        if s["kind"] == "chapter" or f == 0:
            continue
        els = s.get("elements") or []
        typ = els[0]["type"] if els else None
        if s["kind"] == "app" or typ in ("image", "story", "quote", "video"):
            if not near:
                sfx.append(["whoosh", f2t(f) - 0.12, "scene change"])
        elif typ in ("title", "cta", "chips", "iconlist"):
            if not near:
                sfx.append(["pop", f2t(f + (els[0].get("frame") or 0)), f"{typ} card"])
        if s["kind"] == "app":
            for a in s.get("actions", []):
                if a.get("do") == "click" and a.get("target") == "send":
                    sfx.append(["click", f2t(f + a["frame"]), "send prompt"])
    sfx.sort(key=lambda z: z[1])
    keep, last = [], -9
    for n, t, w in sfx:
        if n == "whoosh":
            if t - last < min_gap or any(abs(t - f2t(c)) < 1.0 for c in chap):
                continue
            last = t
        keep.append([n, max(t, 0), w])
    return keep


def parse_srt(path):
    cues = []
    if not os.path.exists(path):
        return cues
    txt = open(path, encoding="utf-8").read()
    for z in ("​", "‌", "‍", "﻿"):          # zero-width artifacts
        txt = txt.replace(z, "")
    for block in re.split(r"\n\s*\n", txt.strip()):
        lines = block.strip().split("\n")
        for i, ln in enumerate(lines):
            m = re.match(r"(\d+):(\d+):(\d+)[,.](\d+)\s*-->\s*(\d+):(\d+):(\d+)[,.](\d+)", ln)
            if m:
                g = [int(v) for v in m.groups()]
                a = g[0] * 3600 + g[1] * 60 + g[2] + g[3] / 1000
                b = g[4] * 3600 + g[5] * 60 + g[6] + g[7] / 1000
                cues.append([a, b, " ".join(lines[i + 1:]).strip()])
                break
    return cues


def ts(t, sep=","):
    ms = int(round(t * 1000))
    return f"{ms // 3600000:02d}:{ms // 60000 % 60:02d}:{ms // 1000 % 60:02d}{sep}{ms % 1000:03d}"


def stamp_time(t):
    t = int(t)
    return f"{t // 3600}:{t // 60 % 60:02d}:{t % 60:02d}" if t >= 3600 else f"{t // 60:02d}:{t % 60:02d}"


def main():
    ap = argparse.ArgumentParser(description="Assemble a whole video from lane renders, full clips and chapter cards.",
                                 epilog=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--config", required=True, help="the segment list (JSON; see assemble.example.json)")
    ap.add_argument("--version", required=True, help="version label: outputs are master-<version>.*")
    ap.add_argument("--only-plan", action="store_true", help="write the plan files (.segments.json, .chapters.txt, .sfx.json, .srt) and stop; no encoding")
    ap.add_argument("--work", help="folder for intermediates (default: asm/<version> next to the config)")
    ap.add_argument("--out", help="output folder (default: the config's out_dir, else out/ next to the config)")
    ap.add_argument("--whoosh", action="store_true", help="keep whoosh sounds (off by default: clicks, pops and the chapter click only)")
    a = ap.parse_args()

    cfg_path = os.path.abspath(os.path.expanduser(a.config))
    here = os.path.dirname(cfg_path)
    cfg = av.load_json(cfg_path)
    x = lambda p: av.rp(p, here)
    V, PLAN_ONLY = a.version, a.only_plan
    FPS = int(cfg.get("fps", 30))
    WID, HEI = int(cfg.get("width", 1920)), int(cfg.get("height", 1080))
    ASM = x(a.work) if a.work else os.path.join(here, "asm", V)
    OUT = x(a.out) if a.out else x(cfg.get("out_dir", "out"))
    os.makedirs(ASM, exist_ok=True)
    os.makedirs(OUT, exist_ok=True)
    VSET = f"fps={FPS},scale={WID}:{HEI},setsar=1"
    ENC = ["-r", str(FPS), "-c:v", "libx264", "-preset", "fast", "-crf", "12", "-g", str(FPS), "-pix_fmt", "yuv420p", "-c:a", "pcm_s16le", "-ar", "48000"]

    CHN = cfg.get("chapters") or []
    if isinstance(CHN, str):
        CHN = av.load_json(x(CHN))
    CHN = [c["title"] if isinstance(c, dict) else c for c in CHN]
    LANE_IDX = {int(k): int(v) for k, v in (cfg.get("lane_card_index") or {}).items()}
    CARD_LEN = float(cfg.get("inserted_card_s", 2.0))
    SND = {n: (x(s["file"]), s.get("db", 0)) for n, s in (cfg.get("sounds") or {}).items()}
    KEEP_NEAR = [w.lower() for w in cfg.get("keep_near_click", ["card"])]
    DROP = set() if a.whoosh else {"whoosh"}
    ids = [s["id"] for s in cfg["segments"]]
    if len(set(ids)) != len(ids):
        sys.exit("segment ids must be unique")

    inputs = {}

    def use(path, media=True):
        """Every input goes through here once: ffprobe + size + md5, refused when half-written."""
        if path not in inputs:
            inputs[path] = av.guard_input(path, media=media)
        return path

    def card_file(k):
        if not cfg.get("cards"):
            sys.exit('the config needs "cards" (a pattern like "cards/ch-{index:02d}.mov") to place chapter cards')
        if not 0 <= k < len(CHN):
            sys.exit(f'card index {k} is outside "chapters" ({len(CHN)} titles)')
        return use(x(cfg["cards"].format(index=k)))

    def timeline(lane):
        p = os.path.join(x(lane), ".screenplay", "timeline.json")
        use(p, media=False)
        return av.load_json(p)["timeline"]

    def seg_tone(f, s0, s1, out):
        """Room tone from a stretch of a file, written to `out`; None when it has no clean half second."""
        if PLAN_ONLY:
            return out
        got = av.pick_room_tone(av.decode(f, s0, min(s1, s0 + 300)))
        if got is None:
            return None
        av.write_wav(out, got[0])
        return out

    shared = {}

    def shared_tone():
        """One clean room tone for every inserted chapter card, so none of them is digital silence."""
        if "p" in shared:
            return shared["p"]
        st = cfg.get("shared_tone") or {}
        out = os.path.join(ASM, "shared.tone.wav")
        if st.get("file"):
            shared["p"] = use(x(st["file"]))
            return shared["p"]
        order = cfg["segments"]
        if st.get("segment"):
            pick = [s for s in order if s["id"] == st["segment"]]
            if not pick:
                sys.exit(f'shared_tone: no segment "{st["segment"]}"')
            got = seg_tone(use(x(pick[0]["file"])), float(st.get("start", 0.0)), float(st.get("end", 300.0)), out)
            if got:
                shared["p"] = got
                return got
        for s in order:
            if s.get("lane"):
                s0 = s.get("start", 0.0)
                got = seg_tone(use(x(s["file"])), s0, s0 + 300.0, out)
                if got:
                    shared["p"] = got
                    return got
        sys.exit("no clean room tone found for the inserted cards: make one with room_tone.py and set shared_tone.file")

    card_spans = []                                  # [start, end, title] of every chapter card in the master
    plan, T = [], 0.0
    all_sfx, chapters, srt = [], [], []
    for seg in cfg["segments"]:
        f = use(x(seg["file"]))
        dur_file = av.duration(f, "v")
        s0 = seg.get("start", 0.0)
        s1 = seg.get("end", seg.get("vdur", dur_file))
        off = seg.get("offset", 0.0)
        tl = timeline(seg["lane"]) if seg.get("lane") else None
        idx_map = {int(k): int(v) for k, v in seg["card_index"].items()} if seg.get("card_index") else LANE_IDX

        # ---- (b) a card inserted before this segment
        if seg.get("card") is not None:
            k = seg["card"]
            cmov = card_file(k)
            cout = os.path.join(ASM, seg["id"] + ".card.mov")
            tone0 = shared_tone()
            cfc = (f"[0:v]trim=duration={CARD_LEN},setpts=PTS-STARTPTS,{VSET}[v];"
                   f"[1:a]aresample=48000,aformat=channel_layouts=stereo,apad,atrim=duration={CARD_LEN}[a]")
            cstamp = cout + ".fc"
            want = cfc + tone0 + inputs[cmov]["md5"]
            if not PLAN_ONLY and not (os.path.exists(cout) and os.path.exists(cstamp) and open(cstamp).read() == want):
                av.run(["ffmpeg", "-v", "error", "-y", "-i", cmov, "-stream_loop", "-1", "-i", tone0, "-filter_complex", cfc,
                        "-map", "[v]", "-map", "[a]", "-t", str(CARD_LEN)] + ENC + [cout])
                open(cstamp, "w").write(want)
            plan.append({"id": seg["id"] + ".card", "file": cmov, "start": T, "dur": CARD_LEN, "cards": [], "pauses": [], "is_card": True})
            chapters.append([T, CHN[k]])
            card_spans.append([T, T + CARD_LEN, CHN[k]])
            all_sfx.append(["chapter", T, f"{seg['id']} chapter card: {CHN[k]}"])
            T += CARD_LEN

        # ---- (a) the lane's own chapter cards inside [s0, s1)
        ctimes, cidx = [], []
        if tl and seg.get("breathers", True):
            for c in tl["chapters"]:
                if c.get("frame", -1) >= 0:
                    t = off + c["frame"] / FPS
                    if s0 - 1e-6 <= t < s1 - 1.0:
                        num = c["index"] + 1
                        if num not in idx_map:
                            sys.exit(f'{seg["id"]}: the lane has a chapter card number {num} ("{c.get("title", "")}") with no entry in '
                                     f'lane_card_index; add one, or set "breathers": false on the segment')
                        ctimes.append(t)
                        cidx.append((num, idx_map[num]))
        qtimes = [av.quiet_point(f, c) for c in ctimes]          # where the audio pauses (<= card time)

        def m(t, ct=qtimes, s0=s0):          # file time (speech/audio) -> time inside this segment's intermediate
            return (t - s0) + sum(1 for c in ct if c <= t + 1e-6)

        def mv(c, ct=ctimes, s0=s0):         # card (picture) time -> time inside the intermediate
            return (c - s0) + sum(1 for q in ct if q < c - 1e-6)

        out_dur = (s1 - s0) + len(ctimes)
        # ---- the intermediate
        out = os.path.join(ASM, seg["id"] + ".mov")
        vf, af, vl, al = [], [], [], []
        ins = ["-i", f]
        tone = None
        if ctimes:
            tone = seg_tone(f, s0, s1, os.path.join(ASM, seg["id"] + ".tone.wav")) or shared_tone()
        cur_v, cur_a, n_in = s0, s0, 1
        vfade = f",fade=t=in:st=0:d={seg['vfade_in']}" if seg.get("vfade_in") else ""

        def vclip(p0, p1, hold):
            i = len(vl)
            h = f",tpad=stop_mode=clone:stop_duration={hold:.5f}" if hold > 1e-4 else ""
            vf.append(f"[0:v]trim=start={p0:.5f}:end={p1:.5f},setpts=PTS-STARTPTS,{VSET}{h}[v{i}]")
            vl.append(f"[v{i}]")

        def aclip(p0, p1):
            i = len(al)
            af.append(f"[0:a]atrim=start={p0:.5f}:end={p1:.5f},asetpts=PTS-STARTPTS,aresample=48000,aformat=channel_layouts=stereo[a{i}]")
            al.append(f"[a{i}]")

        md5s = [inputs[f]["md5"]]
        for (C, Q), (num, k) in zip(zip(ctimes, qtimes), cidx):
            if Q - cur_v > 1 / (2 * FPS):
                vclip(cur_v, Q, C - Q)                     # up to the pause, hold that frame until the card
            cmov = card_file(k)                            # the card builds 1 s (the breather), then holds 2 s over the engine's own card
            md5s.append(inputs[cmov]["md5"])
            ins += ["-i", cmov]
            i = len(vl)
            vf.append(f"[{n_in}:v]trim=duration=3,setpts=PTS-STARTPTS,{VSET}[v{i}]")
            vl.append(f"[v{i}]")
            n_in += 1
            cur_v = C + 2.0
            if Q - cur_a > 1e-3:
                aclip(cur_a, Q)
            ins += ["-i", tone]
            i = len(al)
            af.append(f"[{n_in}:a]aresample=48000,aformat=channel_layouts=stereo,atrim=duration=1,asetpts=PTS-STARTPTS[a{i}]")
            al.append(f"[a{i}]")
            n_in += 1
            cur_a = Q
        vclip(cur_v, s1, 0)
        aclip(cur_a, s1)
        gain = seg.get("gain", 0)
        fc = (";".join(vf + af) + ";" + "".join(vl) + f"concat=n={len(vl)}:v=1:a=0{vfade}[v];"
              + "".join(al) + f"concat=n={len(al)}:v=0:a=1,volume={gain}dB[a]")
        plan.append({"id": seg["id"], "file": f, "start": T, "dur": out_dur, "cards": [T + mv(c) for c in ctimes],
                     "pauses": [T + (q - s0) + i for i, q in enumerate(qtimes)]})
        stamp = os.path.join(ASM, seg["id"] + ".fc")
        want = fc + "\n" + " ".join(md5s)
        if not PLAN_ONLY and not (os.path.exists(out) and os.path.exists(stamp) and open(stamp).read() == want):
            av.run(["ffmpeg", "-v", "error", "-y"] + ins + ["-filter_complex", fc, "-map", "[v]", "-map", "[a]", "-t", f"{out_dur:.5f}"] + ENC + [out])
            open(stamp, "w").write(want)
        # ---- chapters
        if seg.get("chapter"):
            chapters.append([T, seg["chapter"]])
        for j, (c, (num, k)) in enumerate(zip(ctimes, cidx)):
            t_pause = T + (qtimes[j] - s0) + j
            chapters.append([t_pause, CHN[k]])
            card_spans.append([t_pause, T + mv(c) + 3.0, CHN[k]])
            all_sfx.append(["chapter", t_pause, f"{seg['id']} tip {num} card"])
        # ---- sound effects
        if seg.get("sfx_json"):
            p = use(x(seg["sfx_json"]), media=False)
            for e in av.load_json(p):
                if e["sound"] == "chapter":                 # the lane's own chapter clicks are replaced by the card's
                    continue
                if s0 <= e["t"] < s1:
                    all_sfx.append([e["sound"], T + m(e["t"]), seg["id"] + ": " + e.get("why", "")])
        elif tl and seg.get("sfx", True):
            for nme, t, why in derive_sfx(tl, off, seg.get("whoosh_gap", 2.5), FPS):
                if s0 <= t < s1 and not any(x0 <= t <= x1 for x0, x1 in seg.get("no_sfx_in", [])):
                    all_sfx.append([nme, T + m(t), seg["id"] + ": " + why])
        for nme, t in seg.get("sfx_at", []):
            all_sfx.append([nme, T + t, seg["id"]])
        # ---- captions
        if seg.get("srt"):
            p = use(x(seg["srt"]), media=False)
            for c0, c1, text in parse_srt(p):
                c0 += seg.get("srt_offset", 0.0)
                c1 += seg.get("srt_offset", 0.0)
                if c1 <= s0 or c0 >= s1 or not text:
                    continue
                c0, c1 = max(c0, s0), min(c1, s1)
                parts = [[c0, c1, text]]
                for q in qtimes:                       # a cue never straddles a breather: split its words at the pause
                    x0, x1, tx = parts[-1]
                    if x0 + 0.15 < q < x1 - 0.15:
                        ws = tx.split()
                        n = max(1, min(len(ws) - 1, round(len(ws) * (q - x0) / (x1 - x0)))) if len(ws) > 1 else 1
                        parts[-1] = [x0, q - 1e-3, " ".join(ws[:n])]
                        if len(ws) > 1:
                            parts.append([q + 1e-3, x1, " ".join(ws[n:])])
                    elif x0 < q <= x0 + 0.15:
                        parts[-1][0] = q + 1e-3
                    elif x1 - 0.15 <= q < x1:
                        parts[-1][1] = q - 1e-3
                for x0, x1, tx in parts:
                    srt.append([T + m(x0), T + m(x1), tx])
        T += out_dur

    total = T
    for e in cfg.get("extra_audio", []):
        if e["after"] not in ids:
            sys.exit(f'extra_audio: no segment "{e["after"]}"')
        use(x(e["file"]))
    base = os.path.join(OUT, f"master-{V}")

    # ---- chapters: first title pinned to 0:00; YouTube wants each at least 10 s long
    chapters.sort()
    first = CHN[0] if CHN else (chapters[0][1] if chapters else None)
    known = set(CHN) | {s["chapter"] for s in cfg["segments"] if s.get("chapter")}
    clean = ([[0.0, first]] if first else []) + [[t, n] for t, n in chapters if n != first and n in known]
    short_ones = [(a2, b2) for a2, b2 in zip(clean, clean[1:]) if b2[0] - a2[0] < 10]
    if short_ones:
        print("WARNING chapters under 10 s:", [(p[1], round(q[0] - p[0], 1)) for p, q in short_ones])
    open(base + ".chapters.txt", "w", encoding="utf-8").write("\n".join(f"{stamp_time(t)} {n}" for t, n in clean) + "\n")

    # ---- captions
    srt.sort()
    with open(base + ".srt", "w", encoding="utf-8") as fh:
        for i, (c0, c1, text) in enumerate(srt, 1):
            if i < len(srt):
                c1 = min(c1, srt[i][0])
            if c1 - c0 < 0.2:
                c1 = c0 + 0.2
            fh.write(f"{i}\n{ts(c0)} --> {ts(c1)}\n{text}\n\n")

    # ---- sound effects: dedupe, nothing on top of a chapter click, whooshes off unless asked
    all_sfx.sort(key=lambda z: z[1])
    kept = []
    for n, t, w in all_sfx:
        if any(n == n2 and abs(t - t2) < 0.35 for n2, t2, _ in kept):
            continue
        kept.append([n, t, w])
    clicks = [t for n, t, _ in kept if n == "chapter"]
    all_sfx = [e for e in kept if not (e[0] in ("whoosh", "pop") and any(-0.2 < e[1] - c < 1.05 for c in clicks)
                                       and not any(wd in e[2].lower() for wd in KEEP_NEAR))]
    dropped = sum(1 for e in all_sfx if e[0] in DROP)
    all_sfx = [e for e in all_sfx if e[0] not in DROP]
    missing = sorted({n for n, _, _ in all_sfx if n not in SND})
    if missing:
        sys.exit(f'"sounds" in the config has no entry for: {", ".join(missing)}')
    sfx_list = [{"sound": n, "file": SND[n][0], "db": SND[n][1], "t": round(t, 3), "why": w} for n, t, w in all_sfx]
    av.dump_json(sfx_list, base + ".sfx.json")
    if not PLAN_ONLY:
        for p in sorted({e["file"] for e in sfx_list}):
            use(p)
    av.dump_json({"total": total, "segments": plan, "card_spans": card_spans, "inputs": list(inputs.values())}, base + ".segments.json")

    print(f"total {total:.2f} s ({int(total) // 60}:{total % 60:05.2f}), {len(plan)} segments, {len(clean)} chapters, "
          f"{len(all_sfx)} sfx ({dropped} whooshes dropped), {len(srt)} cues, {len(inputs)} inputs fingerprinted")
    for p in plan:
        print(f"  {p['start']:8.2f}  {p['dur']:7.2f}  {p['id']}  cards={[round(c, 2) for c in p['cards']]}")
    if PLAN_ONLY:
        return

    # ---- concat
    lst = os.path.join(ASM, "concat.txt")
    open(lst, "w").write("".join("file '" + os.path.join(ASM, p["id"] + ".mov").replace("'", "'\\''") + "'\n" for p in plan))
    nosfx = base + "-nosfx.mov"
    raw = os.path.join(ASM, "concat-raw.mov")
    av.run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", lst, "-c", "copy", raw])
    # ---- extra audio: part of the picture's own sound, so it goes into the no-SFX master
    extras = cfg.get("extra_audio", [])
    if extras:
        ins, parts = ["-i", raw], []
        for j, e in enumerate(extras, 1):
            seg0 = next(p for p in plan if p["id"] == e["after"])
            d = int(round((seg0["start"] + seg0["dur"]) * 1000))
            ins += ["-ss", str(e.get("ss", 0)), "-i", x(e["file"])]
            parts.append(f"[{j}:a]aresample=48000,aformat=channel_layouts=stereo,volume={e.get('db', 0)}dB,adelay={d}|{d}[e{j}]")
        fc = ";".join(parts) + ";[0:a]" + "".join(f"[e{j}]" for j in range(1, len(extras) + 1)) + f"amix=inputs={len(extras) + 1}:normalize=0:duration=first[a]"
        av.run(["ffmpeg", "-v", "error", "-y"] + ins + ["-filter_complex", fc, "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "pcm_s16le", nosfx])
    else:
        av.run(["ffmpeg", "-v", "error", "-y", "-i", raw, "-c", "copy", nosfx])
    # ---- the stem and the mix
    stem_wav = base + ".sfx.wav"
    av.write_wav(stem_wav, av.build_stem(sfx_list, total))
    final = base + ".mp4"
    av.run(["ffmpeg", "-v", "error", "-y", "-i", nosfx, "-i", stem_wav, "-filter_complex", av.MIX_FILTER, "-map", "0:v", "-map", "[a]",
            "-c:v", "libx264", "-preset", "medium", "-crf", "17", "-pix_fmt", "yuv420p", "-movflags", "+faststart",
            "-c:a", "aac", "-b:a", "320k", final], what="final mix")
    print("wrote", final)
    print("next: make_scenes.py, then check_master.py --master", base)


if __name__ == "__main__":
    main()
