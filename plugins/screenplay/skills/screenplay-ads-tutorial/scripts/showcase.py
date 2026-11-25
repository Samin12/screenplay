#!/usr/bin/env python3
"""Make a full-screen showcase clip: a finished ad or promo shown whole, labelled and levelled.

  python3 showcase.py ad.mp4 --chip-eyebrow "WHAT WE'RE BUILDING" --chip-title "Level 2 · Code + AI tools" \
        --credit "Event recap · made by the event" --lufs -17 --push 1.06 -o showcase/level2.mov

WHEN: the video plays a whole clip full screen (the ad a level builds, the result that came
back). The clip then goes into the assemble config as its own segment with a "card" before it.

WHAT IT ADDS
  chip     top left for the first --chip-seconds (default 5): a small accented eyebrow over a
           title. `*word*` in the title is accented ("Level *2* · ..."). Fades in and out.
  credit   one small line in the same corner after the chip, to the end (or --credit-seconds):
           whose footage it is, "spec ad, not affiliated with ...", how it was made. Say what
           is true; a credit is not optional when the footage is someone else's.
  push     a slow zoom from 1.0 to --push (default 1.06) over the whole clip, so a full-screen
           clip is never static. --push 1 turns it off.
  loudness set to --lufs (default -17: about one LU under a -16 voice) by plain gain, measured
           with ebur128; a limiter only catches peaks over -1.5 dBFS. No dynamics processing.
Output: --size at --fps, h264 crf 14 + pcm 48 kHz stereo, ready for assemble.py.

Needs headless Chrome or Chromium to draw the chip and credit (--chrome, or $CHROME, or a binary
on PATH). No font is bundled: system stack by default, --font <woff2> for your own.
"""
import argparse
import html
import os
import re
import subprocess
import sys
import tempfile

sys.dont_write_bytecode = True
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import _avlib as av  # noqa: E402


def loudness(path):
    err = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", path, "-vn", "-af", "ebur128=peak=true", "-f", "null", "-"],
                         capture_output=True, text=True).stderr
    tail = err[err.rfind("Summary:"):] if "Summary:" in err else ""
    i = re.search(r"I:\s+(-?[\d.]+) LUFS", tail)
    p = re.search(r"Peak:\s+(-?[\d.]+) dBFS", tail)
    return (float(i.group(1)) if i else None), (float(p.group(1)) if p else None)


def main():
    ap = argparse.ArgumentParser(description="Full-screen showcase clip: chip for the first seconds, credit line, slow push, loudness to a target.",
                                 epilog=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("clip", help="the finished clip to show whole")
    ap.add_argument("-o", "--out", required=True, help="output .mov")
    ap.add_argument("--chip-eyebrow", help="small accented line of the chip")
    ap.add_argument("--chip-title", help="title of the chip; *word* is accented")
    ap.add_argument("--chip-seconds", type=float, default=5.0, help="how long the chip stays (default 5)")
    ap.add_argument("--credit", help="the small credit line shown after the chip")
    ap.add_argument("--credit-seconds", type=float, help="how long the credit stays (default: to the end)")
    ap.add_argument("--lufs", type=float, default=-17.0, help="integrated loudness target (default -17)")
    ap.add_argument("--push", type=float, default=1.06, help="end zoom of the slow push (default 1.06; 1 = none)")
    ap.add_argument("--size", default="1920x1080", help="output size (default 1920x1080)")
    ap.add_argument("--fps", type=int, default=30)
    ap.add_argument("--accent", default="#E2774E", help="accent colour (default #E2774E)")
    ap.add_argument("--font", help="a .woff2 file of your own to embed (none is bundled)")
    ap.add_argument("--font-family", default='"Helvetica Neue", Helvetica, Arial, sans-serif', help="CSS font stack used when --font is not given")
    ap.add_argument("--chrome", help="path to a Chrome/Chromium binary")
    a = ap.parse_args()

    clip, out = os.path.expanduser(a.clip), os.path.expanduser(a.out)
    av.guard_input(clip)
    W, H = (int(v) for v in a.size.lower().split("x"))
    dur = av.duration(clip, "v")
    has_audio = bool(subprocess.run(["ffprobe", "-v", "error", "-select_streams", "a:0", "-show_entries", "stream=index", "-of", "csv=p=0", clip],
                                    capture_output=True, text=True).stdout.strip())
    if a.font:
        face, family = f'@font-face{{font-family:ChipFont;src:url("file://{os.path.abspath(os.path.expanduser(a.font))}")}}', "ChipFont, " + a.font_family
    else:
        face, family = "", a.font_family
    head = (f'<html><head><meta charset="utf-8"><style>{face}body{{margin:0;width:{W}px;height:{H}px;background:transparent;font-family:{family};position:relative}}'
            f'.chip{{position:absolute;left:64px;top:60px;padding:22px 34px 24px 30px;border-radius:26px;background:rgba(24,23,22,.86);box-shadow:0 0 0 2px rgba(255,255,255,.08),0 18px 50px rgba(0,0,0,.35)}}'
            f'.e{{font-size:22px;font-weight:700;letter-spacing:.14em;color:{a.accent};display:flex;align-items:center;gap:12px}}'
            f'.e i{{width:12px;height:12px;border-radius:50%;background:{a.accent};display:inline-block}}'
            f'.t{{font-size:50px;font-weight:700;color:#f3efe8;margin-top:6px;letter-spacing:-.01em}}.t b{{color:{a.accent}}}'
            f'.s{{position:absolute;left:64px;top:60px;padding:10px 20px;border-radius:14px;background:rgba(24,23,22,.72);font-size:24px;font-weight:500;color:#d9d3ca}}'
            f'</style></head><body>')
    overlays = []                                                    # (png, start, end)
    os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        chrome = av.find_chrome(a.chrome) if (a.chip_title or a.chip_eyebrow or a.credit) else None
        chip_end = 0.0
        if a.chip_title or a.chip_eyebrow:
            title = re.sub(r"\*(.+?)\*", r"<b>\1</b>", html.escape(a.chip_title or ""))
            eyebrow = f'<div class="e"><i></i>{html.escape(a.chip_eyebrow)}</div>' if a.chip_eyebrow else ""
            page = os.path.join(tmp, "chip.html")
            open(page, "w", encoding="utf-8").write(f'{head}<div class="chip">{eyebrow}<div class="t">{title}</div></div></body></html>')
            av.screenshot(chrome, page, os.path.join(tmp, "chip.png"), W, H, transparent=True)
            chip_end = min(a.chip_seconds, dur)
            overlays.append((os.path.join(tmp, "chip.png"), 0.0, chip_end))
        if a.credit:
            page = os.path.join(tmp, "credit.html")
            open(page, "w", encoding="utf-8").write(f'{head}<div class="s">{html.escape(a.credit)}</div></body></html>')
            av.screenshot(chrome, page, os.path.join(tmp, "credit.png"), W, H, transparent=True)
            c_end = min(dur, chip_end + a.credit_seconds) if a.credit_seconds else dur
            if c_end - chip_end > 0.5:
                overlays.append((os.path.join(tmp, "credit.png"), chip_end, c_end))

        ins = ["-i", clip]
        n = max(1, int(round(dur * a.fps)))
        base = f"[0:v]fps={a.fps},scale={W}:{H}:force_original_aspect_ratio=decrease,pad={W}:{H}:(ow-iw)/2:(oh-ih)/2,setsar=1"
        if a.push > 1.0001:                                         # zoom on a 2x canvas so the push does not shimmer
            base += (f",scale={2 * W}:{2 * H}:flags=lanczos,zoompan=z='1+{a.push - 1:.5f}*on/{n}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'"
                     f":d=1:s={W}x{H}:fps={a.fps}")
        fc, last = [base + "[v0]"], "[v0]"
        for k, (png, t0, t1) in enumerate(overlays, 1):
            ins += ["-loop", "1", "-framerate", str(a.fps), "-t", f"{dur:.3f}", "-i", png]
            fade_out = f",fade=t=out:st={t1 - 0.35:.3f}:d=0.35:alpha=1" if t1 < dur - 0.05 else ""
            fc.append(f"[{k}:v]format=rgba,fade=t=in:st={t0:.3f}:d=0.35:alpha=1{fade_out}[o{k}]")
            fc.append(f"{last}[o{k}]overlay=0:0:enable='between(t,{t0:.3f},{t1:.3f})'[v{k}]")
            last = f"[v{k}]"
        fc.append(f"{last}format=yuv420p[v]")
        cmd = ["ffmpeg", "-v", "error", "-y"] + ins
        maps = ["-map", "[v]"]
        if has_audio:
            lufs, peak = loudness(clip)
            if lufs is None:
                sys.exit("could not measure the clip's loudness")
            gain = a.lufs - lufs
            fc.append(f"[0:a]aresample=48000,aformat=channel_layouts=stereo,volume={gain:.2f}dB,alimiter=limit=0.84:level=false[a]")
            maps += ["-map", "[a]"]
            print(f"loudness {lufs:.1f} LUFS, peak {peak:.1f} dBFS -> gain {gain:+.1f} dB for {a.lufs:g} LUFS")
        else:
            ins_idx = len(overlays) + 1
            cmd += ["-f", "lavfi", "-t", f"{dur:.3f}", "-i", "anullsrc=r=48000:cl=stereo"]
            maps += ["-map", f"{ins_idx}:a"]
            print("the clip has no audio: writing a silent track (assemble.py needs one)")
        av.run(cmd + ["-filter_complex", ";".join(fc)] + maps + ["-t", f"{dur:.3f}", "-r", str(a.fps), "-c:v", "libx264", "-preset", "medium", "-crf", "14",
                                                                    "-pix_fmt", "yuv420p", "-c:a", "pcm_s16le", "-ar", "48000", out])
    if has_audio:
        l2, p2 = loudness(out)
        print(f"wrote {out}: {dur:.2f} s, {l2:.1f} LUFS, peak {p2:.1f} dBFS")
        if abs(l2 - a.lufs) > 0.7:
            print(f"note: the result is {l2 - a.lufs:+.1f} LU from the target (the limiter held peaks back); check it by ear")
    else:
        print(f"wrote {out}: {dur:.2f} s")


if __name__ == "__main__":
    main()
