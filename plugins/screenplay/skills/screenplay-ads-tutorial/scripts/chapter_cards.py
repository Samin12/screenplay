#!/usr/bin/env python3
"""Build the chapter-grid cards: one short movie per chapter that shows where the video is.

  python3 chapter_cards.py --chapters chapters.json -o cards/ [--heading "MY VIDEO · 3 LEVELS"] \
        [--accent "#E2774E"] [--bg "#141312"] [--text "#f3efe8"] [--font Inter.woff2]

WHEN: the video has parts that span several lanes (levels, tips, full clips) and one card style
must run through all of them. Run it before assemble.py; its "cards" pattern points here.
THE ENGINE'S `chapters.style: path` REPLACES THIS when your version has it and the whole
video is one lane; this script stays useful when the grid spans separately rendered lanes.

THE CARD (3 s, built from two HTML screenshots and a drawn line; assemble.py uses the first
2 s for an inserted card and all 3 s over a lane's own card):
  done chapters   dimmed, with their titles and a check
  the new chapter revealed by a line that travels ONE step, from the previous tile to its tile
                  (0.22-0.80 s), then it lights up and its title appears large (0.80-1.0 s)
  upcoming        LOCKED: a lock icon, no title. The card never reveals what is still to come.

--chapters is a JSON list, in video order. Each item is a title string or an object:
  {"title": "Tip 3: Transform shots", "kind": "tip", "row": 1, "short": "Transform shots"}
  kind   "level" (wide tile), "section" or "intro" (medium tile), "tip" (default)
  row    which grid row the tile sits in (default: the row of the last "level" before it;
         the first item sits alone in row 0)
  short  the tile text when the title is too long for a tile
A title "Eyebrow: Name" shows the eyebrow small above the name; the eyebrow is accented in the heading.

WRITES in -o: ch-01.mov ... ch-NN.mov (no card for chapter 0, the opening), ch-NN-a.png /
ch-NN-b.png (before / after stills) and chapters.json (the plain title list assemble.py reads).

Needs headless Chrome or Chromium for the screenshots (--chrome, or $CHROME, or a
binary on PATH). No font is bundled: the default is a system stack; pass --font <woff2> to
embed one of your own.
"""
import argparse
import html
import json
import math
import os
import re
import subprocess
import sys
import tempfile

sys.dont_write_bytecode = True
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np  # noqa: E402
import _avlib as av  # noqa: E402

W, H = 1920, 1080
CHECK = "✓"


def hex_rgb(c):
    c = c.lstrip("#")
    if len(c) == 3:
        c = "".join(ch * 2 for ch in c)
    return tuple(int(c[i:i + 2], 16) for i in (0, 2, 4))


def css(a, font_face, family):
    r, g, b = hex_rgb(a.accent)
    return f'''{font_face}
body{{margin:0;width:{W}px;height:{H}px;background:{a.bg};background-image:radial-gradient(rgba(255,255,255,.07) 1.6px,transparent 1.7px);background-size:36px 36px;font-family:{family};color:{a.text};display:flex;flex-direction:column;align-items:center;justify-content:center}}
.h{{font-size:30px;font-weight:700;letter-spacing:.22em;color:{a.accent};margin-bottom:18px}}
.now{{font-size:118px;font-weight:800;letter-spacing:-.03em;margin-bottom:60px;text-align:center;line-height:1.02}}
.now b{{color:{a.accent}}}
.row{{display:flex;gap:16px;margin:10px 0;align-items:stretch;justify-content:center}}
.t{{width:206px;height:112px;padding:17px 18px;border-radius:20px;background:rgba(255,255,255,.045);box-shadow:0 0 0 1.5px rgba(255,255,255,.08) inset;font-size:25px;font-weight:650;color:#8d877e;line-height:1.16;box-sizing:border-box;overflow:hidden}}
.t small{{display:block;font-size:16px;font-weight:700;letter-spacing:.14em;color:#6f6a62;margin-bottom:7px}}
.t.lv{{width:300px}}.t.wide{{width:290px}}
.t.done{{color:#bdb6ab;background:rgba(255,255,255,.06)}}.t.done small{{color:rgba({r},{g},{b},.72)}}
.t.lock{{display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,.025);box-shadow:0 0 0 1.5px rgba(255,255,255,.05) inset}}
.t.on{{background:rgba({r},{g},{b},.16);box-shadow:0 0 0 3px {a.accent} inset,0 0 44px rgba({r},{g},{b},.4);color:#fff}}.t.on small{{color:{a.accent}}}
#rects{{position:absolute;left:-9999px}}
'''


LOCK = ('<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#5a554e" stroke-width="2.2" stroke-linecap="round" '
        'stroke-linejoin="round"><rect x="4" y="11" width="16" height="10" rx="2.5"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>')
RECTS_JS = ('<script>window.onload=()=>{const o={};document.querySelectorAll(".t").forEach(e=>{const r=e.getBoundingClientRect();'
            'o[e.id]=[r.left,r.top,r.width,r.height]});const p=document.createElement("pre");p.id="rects";p.textContent=JSON.stringify(o);'
            'document.body.appendChild(p)}</script>')


def page(ch, k, lit, a, style):
    rows = {}
    for i, c in enumerate(ch):
        cls = "t" + (" lv" if c["kind"] == "level" else "") + (" wide" if c["kind"] in ("section", "intro") else "")
        if ": " in c["title"]:
            eb, ti = c["title"].split(": ", 1)
        else:
            eb, ti = a.plain_eyebrow, c["title"]
        ti = c.get("short") or ti
        if i < k:
            inner, cls = f"<small>{CHECK} {html.escape(eb.upper())}</small>{html.escape(ti)}", cls + " done"
        elif i == k and lit:
            inner, cls = f"<small>{html.escape(eb.upper())}</small>{html.escape(ti)}", cls + " on"
        else:
            inner, cls = LOCK, cls + " lock"
        rows.setdefault(c["row"], []).append(f'<div class="{cls}" id="t{i}">{inner}</div>')
    name = ch[k]["title"]
    if ": " in name:
        p, q = name.split(": ", 1)
        now = f"<b>{html.escape(p)}</b> · {html.escape(q)}"
    else:
        now = html.escape(name)
    body = "".join(f'<div class="row">{"".join(rows[r])}</div>' for r in sorted(rows))
    return (f'<html><head><meta charset="utf-8"><style>{style}</style></head><body><div class="h">{html.escape(a.heading)}</div>'
            f'<div class="now" style="opacity:{1 if lit else 0}">{now}</div>{body}{RECTS_JS}</body></html>')


def rects(chrome, html_path):
    d = subprocess.run([chrome, "--headless=new", "--disable-gpu", f"--window-size={W},{H}", "--virtual-time-budget=2000", "--dump-dom",
                        "file://" + os.path.abspath(html_path)], capture_output=True, text=True).stdout
    m = re.search(r'<pre id="rects">(.*?)</pre>', d, re.S)
    if not m:
        sys.exit("Chrome did not return the tile positions")
    return json.loads(html.unescape(m.group(1)))


def dist_to_polyline(pts, x0, y0, x1, y1):
    """Distance from every pixel of the box to the polyline, as an array (y1 - y0, x1 - x0)."""
    yy, xx = np.mgrid[y0:y1, x0:x1].astype(np.float32)
    best = np.full(xx.shape, 1e9, dtype=np.float32)
    for (ax, ay), (bx, by) in zip(pts, pts[1:]):
        dx, dy = bx - ax, by - ay
        ln = dx * dx + dy * dy
        t = np.clip(((xx - ax) * dx + (yy - ay) * dy) / ln, 0, 1) if ln > 1e-9 else np.zeros_like(xx)
        best = np.minimum(best, np.hypot(xx - (ax + t * dx), yy - (ay + t * dy)))
    return best


def with_line(img, pts, frac, accent, alpha=1.0):
    """The frame with the first `frac` of the path drawn: a 7 px line, a soft glow, a bright head."""
    if frac <= 0:
        return img
    seg = [math.dist(pts[i], pts[i + 1]) for i in range(len(pts) - 1)]
    left, part = frac * sum(seg), [pts[0]]
    for i, ln in enumerate(seg):
        if left >= ln:
            part.append(pts[i + 1])
            left -= ln
        else:
            t = left / ln if ln else 0
            part.append((pts[i][0] + (pts[i + 1][0] - pts[i][0]) * t, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * t))
            break
    pad = 44
    x0 = max(0, int(min(p[0] for p in part)) - pad)
    x1 = min(W, int(max(p[0] for p in part)) + pad)
    y0 = max(0, int(min(p[1] for p in part)) - pad)
    y1 = min(H, int(max(p[1] for p in part)) + pad)
    if len(part) < 2:
        part = part * 2
    d = dist_to_polyline(part, x0, y0, x1, y1)
    hx, hy = part[-1]
    yy, xx = np.mgrid[y0:y1, x0:x1].astype(np.float32)
    dh = np.hypot(xx - hx, yy - hy)
    line = np.clip(4.0 - d, 0, 1) * alpha
    glow = np.exp(-(d / 11.0) ** 2) * 0.55 * alpha
    head = np.clip(11.5 - dh, 0, 1) * alpha
    col = np.array(accent, dtype=np.float32)
    head_col = np.clip(col * 0.45 + np.array([255, 255, 255], dtype=np.float32) * 0.55, 0, 255)
    out = img.copy()
    box = out[y0:y1, x0:x1].astype(np.float32)
    box = box * (1 - glow[..., None]) + col * glow[..., None]
    box = box * (1 - line[..., None]) + col * line[..., None]
    box = box * (1 - head[..., None]) + head_col * head[..., None]
    out[y0:y1, x0:x1] = np.clip(box, 0, 255).astype(np.uint8)
    return out


def blend(p, q, t):
    return (p.astype(np.float32) * (1 - t) + q.astype(np.float32) * t).astype(np.uint8)


def main():
    ap = argparse.ArgumentParser(description="Build the chapter-grid card movies (done dimmed, line travels one step, upcoming locked).",
                                 epilog=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--chapters", required=True, help="JSON list of chapters in video order (strings or objects; see below)")
    ap.add_argument("-o", "--out", required=True, help="output folder")
    ap.add_argument("--heading", default="CHAPTERS", help="the small heading over the grid")
    ap.add_argument("--plain-eyebrow", default="Chapter", help='eyebrow of a tile whose title has no "Eyebrow: Name" form (default "Chapter")')
    ap.add_argument("--accent", default="#E2774E", help="accent colour (default #E2774E)")
    ap.add_argument("--bg", default="#141312", help="background colour (default #141312)")
    ap.add_argument("--text", default="#f3efe8", help="text colour (default #f3efe8)")
    ap.add_argument("--font", help="a .woff2 file of your own to embed (none is bundled)")
    ap.add_argument("--font-family", default='"Helvetica Neue", Helvetica, Arial, sans-serif', help="CSS font stack used when --font is not given")
    ap.add_argument("--fps", type=int, default=30)
    ap.add_argument("--only", type=int, nargs="*", help="build only these chapter indices")
    ap.add_argument("--chrome", help="path to a Chrome/Chromium binary")
    a = ap.parse_args()

    raw = av.load_json(os.path.expanduser(a.chapters))
    ch, row = [], 0
    for i, c in enumerate(raw):
        c = {"title": c} if isinstance(c, str) else dict(c)
        c.setdefault("kind", "intro" if i == 0 else ("level" if re.match(r"(level|part|act)\b", c["title"], re.I) else "tip"))
        if "row" not in c:
            if c["kind"] == "level":
                row += 1
            c["row"] = 0 if i == 0 else max(row, 1)
        row = max(row, c["row"])
        ch.append(c)
    out = os.path.abspath(os.path.expanduser(a.out))
    os.makedirs(out, exist_ok=True)
    chrome = av.find_chrome(a.chrome)
    if a.font:
        font_face = f'@font-face{{font-family:CardFont;src:url("file://{os.path.abspath(os.path.expanduser(a.font))}")}}'
        family = "CardFont, " + a.font_family
    else:
        font_face, family = "", a.font_family
    style = css(a, font_face, family)
    accent, bg = hex_rgb(a.accent), hex_rgb(a.bg)
    av.dump_json([c["title"] for c in ch], os.path.join(out, "chapters.json"))
    tmp = tempfile.TemporaryDirectory()
    page_html = os.path.join(tmp.name, "page.html")
    ease = lambda v: 1 - (1 - v) ** 3
    black = np.zeros((H, W, 3), dtype=np.uint8) + np.array(bg, dtype=np.uint8)
    n_frames = 3 * a.fps

    for k in range(1, len(ch)):
        if a.only and k not in a.only:
            continue
        pa, pb = os.path.join(out, f"ch-{k:02d}-a.png"), os.path.join(out, f"ch-{k:02d}-b.png")
        open(page_html, "w", encoding="utf-8").write(page(ch, k, 1, a, style))
        av.screenshot(chrome, page_html, pb, W, H)
        open(page_html, "w", encoding="utf-8").write(page(ch, k, 0, a, style))
        av.screenshot(chrome, page_html, pa, W, H)
        R = rects(chrome, page_html)
        p, c = R[f"t{k - 1}"], R[f"t{k}"]
        pc, cc = (p[0] + p[2] / 2, p[1] + p[3] / 2), (c[0] + c[2] / 2, c[1] + c[3] / 2)
        if abs(pc[1] - cc[1]) < 5:       # same row: under the tiles, from the last chapter to the new one
            y = p[1] + p[3]
            pts = [(pc[0], y), (pc[0], y + 11), (cc[0], y + 11), (cc[0], y)]
        else:                            # next row: down, across in the gap, down
            midy = (p[1] + p[3] + c[1]) / 2
            pts = [(pc[0], p[1] + p[3]), (pc[0], midy), (cc[0], midy), (cc[0], c[1])]
        base, fin = av.read_image(pa, W, H), av.read_image(pb, W, H)
        base_line, fin_line = with_line(base, pts, 1.0, accent), with_line(fin, pts, 1.0, accent, 0.55)
        mov = os.path.join(out, f"ch-{k:02d}.mov")
        enc = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-framerate", str(a.fps), "-i", "-",
                                "-r", str(a.fps), "-c:v", "libx264", "-crf", "12", "-pix_fmt", "yuv420p", mov], stdin=subprocess.PIPE)
        for f in range(n_frames):
            t = f / a.fps
            if t < 0.22:
                im = blend(black, base, t / 0.22)
            elif t < 0.80:
                im = with_line(base, pts, ease((t - 0.22) / 0.58), accent)
            elif t < 1.0:
                im = blend(base_line, fin_line, (t - 0.80) / 0.20)
            else:
                im = fin_line
            enc.stdin.write(im.tobytes())
        enc.stdin.close()
        if enc.wait():
            sys.exit(f"ffmpeg failed writing {mov}")
        print(k, ch[k]["title"])
    tmp.cleanup()
    print(f"wrote {out}/ch-NN.mov and chapters.json ({len(ch)} chapters)")


if __name__ == "__main__":
    main()
