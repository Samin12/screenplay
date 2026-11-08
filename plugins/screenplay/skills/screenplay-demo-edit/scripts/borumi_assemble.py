#!/usr/bin/env python3 -I
"""Rebuild a Borumi "working edit" from the screenplay renders, in one verified transaction.

  python3 -I borumi_assemble.py <config.json> [--dry]

The project starts as one scene per chapter (intro + N chapters, made by splitting a render by chapter).
This script makes it: intro scene (intro render) | for each chapter: "Card · <title>" (make_cards.py clip) and
the chapter (main render from card + gap on). Then sound effects (whoosh/pop on the hook, a click per card)
and the retake cuts, last to first. Re-running on an already-rebuilt project (2N+1 scenes) refills it.

Config (paths relative to the config file; all times in RENDER ms = screenplay output ms):
{
  "project_id": "f310",
  "intro": "../<Video> screenplay/out/<Video> v7 intro.mp4",   # covers at least [0, first card]
  "main": "../<Video> screenplay/out/<Video> v6.mp4",          # the whole video
  "cards": "cards/cards.json",                                # from make_cards.py
  "gap_ms": 1000,
  "click": "~/.borumi-edit/deps/create-chapter-transitions/assets/chapter-transition/chapter-transition-quiet.wav",
  "whoosh": [2188, 3708], "pop": [34511],
  "whoosh_lead_ms": 120, "whoosh_db": -6, "pop_db": -3, "click_db": 0,
  "cuts": [[70060, 70960, "[But, and] even if you've never"]]
}
Find cut edges on the real audio (export the mix, whisper + RMS), never from Borumi's transcript times.
"""
import json
import os
import shutil
import sys
import urllib.request

BRIDGE = "http://127.0.0.1:47811/call"
RES = "/Applications/Borumi.app/Contents/Resources"


def call(tool, args):
    req = urllib.request.Request(BRIDGE, json.dumps({"tool": tool, "args": args}).encode(),
                                 {"Content-Type": "application/json"})
    out = json.loads(urllib.request.urlopen(req, timeout=1800).read())
    if out.get("isError"):
        raise RuntimeError(f"{tool}: {out.get('text')}")
    try:
        return json.loads(out.get("text") or "null")
    except ValueError:
        return out.get("text")


def scenes(tx):
    return call("get_scenes", {"tx_id": tx})


def import_media(tx, path):
    m = call("import_media", {"tx_id": tx, "file_path": path})
    while m.get("status") not in ("completed", None):
        m = call("get_media_import_status", {"tx_id": tx, "import_id": m["import_id"]})
    return m["media"]


def segs(tx, s, e, kinds):
    tl = call("get_timeline", {"tx_id": tx, "range": {"start_ms": s, "end_ms": e}, "detail": "segments"})
    return [g for L in tl["layers"] if L["kind"] in kinds for g in L.get("segments", [])]


def all_segs(tx, kinds):
    end = scenes(tx)["scenes"][-1]["end_ms"]
    out, seen = [], set()
    for s in range(0, end, 180000):
        for g in segs(tx, s, min(end, s + 180000), kinds):
            if g["id"] not in seen:
                seen.add(g["id"])
                out.append(g)
    return out


def fill(tx, i, media, a, b):
    """Empty scene i, put `media` in it and keep media range [a, b)."""
    sc = scenes(tx)
    s = sc["scenes"][i]
    if s["segment_count"]:
        call("trim_timeline", {"tx_id": tx, "timeline_hash": sc["timeline_hash"], "ranges": [[s["start_ms"], s["end_ms"]]],
                               "ripple": True, "target": {"type": "layers", "layer_ids": ["screen_1", "system_sound_1"]}})
        sc = scenes(tx)
        s = sc["scenes"][i]
    if s["segment_count"]:
        raise RuntimeError(f"{s['name']}: not empty: {s}")
    call("add_segments", {"tx_id": tx, "timeline_hash": sc["timeline_hash"], "additions": [
        {"type": "take", "placement": {"at_ms": s["start_ms"]},
         "content": {"media_id": media["id"], "video_kind": "screen", "audio_kind": "system_sound"}}]})
    sc = scenes(tx)
    s = sc["scenes"][i]
    total = media["duration_ms"]
    if abs((s["end_ms"] - s["start_ms"]) - total) > 2:
        raise RuntimeError(f"{s['name']}: take landed wrong: {s} (media {total})")
    S = s["start_ms"]
    ranges = ([[S, S + a]] if a > 0 else []) + ([[S + b, S + total]] if b < total else [])
    if ranges:
        call("trim_timeline", {"tx_id": tx, "timeline_hash": sc["timeline_hash"], "ranges": ranges, "ripple": True})
    s = scenes(tx)["scenes"][i]
    if abs((s["end_ms"] - s["start_ms"]) - (b - a)) > 2:
        raise RuntimeError(f"{s['name']}: {s['end_ms'] - s['start_ms']} ms, want {b - a}")
    return s


def rebuild(tx, cfg, here):
    p = lambda k: os.path.join(here, os.path.expanduser(cfg[k]))
    cards = json.load(open(p("cards")))
    for c in cards:
        c["path"] = c["file"] if os.path.isabs(c["file"]) else os.path.join(os.path.dirname(p("cards")), os.path.basename(c["file"]))
    N, G = len(cards), cfg.get("gap_ms", 1000)
    C = [c["card_ms"] for c in cards]
    proj = lambda r: r + G * sum(1 for c in C if c <= r)

    sc0 = scenes(tx)["scenes"]
    rebuilt = len(sc0) == 2 * N + 1
    if rebuilt:
        sc0 = [sc0[0]] + sc0[2::2]
    elif len(sc0) != N + 1:
        raise RuntimeError(f"expected {N + 1} (or {2 * N + 1} rebuilt) scenes, found {len(sc0)}")
    main = import_media(tx, p("main"))
    intro = import_media(tx, p("intro"))
    if intro["duration_ms"] < C[0]:
        raise RuntimeError(f"intro render is only {intro['duration_ms']} ms, first card at {C[0]}")
    TOTAL = main["duration_ms"]
    card_media = [import_media(tx, c["path"]) for c in cards]
    os.makedirs(os.path.join(here, "sfx"), exist_ok=True)
    snd = {}
    for k, src in (("whoosh", f"{RES}/built-in-sound-whoosh.wav"), ("pop", f"{RES}/built-in-sound-pop.wav"),
                   ("click", os.path.expanduser(cfg["click"]))):
        dst = os.path.join(here, "sfx", f"{k}.wav")
        shutil.copyfile(src, dst)
        snd[k] = import_media(tx, dst)["id"]

    # 1. drop the old sound effects
    for g in all_segs(tx, ("sound_effect",)):
        call("delete_segments", {"tx_id": tx, "timeline_hash": scenes(tx)["timeline_hash"], "segment_ids": [g["id"]],
                                 "expand_groups": False, "ripple": False})
    if all_segs(tx, ("sound_effect",)):
        raise RuntimeError("old sound effects still there")

    # 2. the chapter scenes, refilled (found by id: indexes move once card scenes exist)
    ends = C + [TOTAL]
    ix = lambda sid: next(n for n, s in enumerate(scenes(tx)["scenes"]) if s["id"] == sid)
    fill(tx, ix(sc0[0]["id"]), intro, 0, C[0])
    print(f"  {sc0[0]['name']}: intro 0-{C[0]}")
    for k in range(1, N + 1):
        a, b = C[k - 1] + G, ends[k]
        fill(tx, ix(sc0[k]["id"]), main, a, b)
        print(f"  {sc0[k]['name']}: main {a}-{b}")

    # 3. a card scene before every chapter
    ids = [s["id"] for s in sc0]
    for k, card in enumerate(cards):
        if not rebuilt:
            call("create_scenes", {"tx_id": tx, "timeline_hash": scenes(tx)["timeline_hash"],
                                   "destination": {"type": "before_scene", "scene_id": ids[k + 1]},
                                   "scenes": [{"name": f"Card · {card['title']}", "script_markdown": None}]})
        fill(tx, ix(ids[k + 1]) - 1, card_media[k], 0, card_media[k]["duration_ms"])
    sc = scenes(tx)["scenes"]
    names = [s["name"] for s in sc]
    want = [sc0[0]["name"]] + [n for k in range(N) for n in (f"Card · {cards[k]['title']}", sc0[k + 1]["name"])]
    if not rebuilt and names != want:
        raise RuntimeError(f"scene order: {names}")
    for k in range(N):  # each card starts where its chapter's card starts in render time
        s = sc[1 + 2 * k]
        if abs(s["start_ms"] - (C[k] + k * G)) > 3 or abs(s["end_ms"] - s["start_ms"] - 2 * G) > 3:
            raise RuntimeError(f"{s['name']} at {s['start_ms']}-{s['end_ms']}, want {C[k] + k * G}")
    if abs(sc[-1]["end_ms"] - (TOTAL + N * G)) > 20:
        raise RuntimeError(f"duration {sc[-1]['end_ms']}, want {TOTAL + N * G}")

    # 4. sound effects (render ms in the hook are project ms: no card comes before them)
    lead = cfg.get("whoosh_lead_ms", 120)
    fx = [(max(0, proj(t) - lead), "whoosh", cfg.get("whoosh_db", -6.0)) for t in cfg.get("whoosh", [])] \
        + [(proj(t), "pop", cfg.get("pop_db", -3.0)) for t in cfg.get("pop", [])] \
        + [(C[k] + k * G, "click", cfg.get("click_db", 0.0)) for k in range(N)]
    call("add_segments", {"tx_id": tx, "timeline_hash": scenes(tx)["timeline_hash"], "additions": [
        {"type": "sound_effect", "placement": {"at_ms": t}, "content": {"media_id": snd[k]}, "properties": {"volume_filter": db}}
        for t, k, db in fx]})
    got = sorted((g["start_ms"], g["media"].get("media_id")) for g in all_segs(tx, ("sound_effect",)))
    want = sorted((t, snd[k]) for t, k, _ in fx)
    if len(got) != len(want) or any(abs(a - c) > 2 or x != y for (a, x), (c, y) in zip(got, want)):
        raise RuntimeError(f"sfx: got {got[:6]}..., want {want[:6]}...")

    # 5. cuts, last to first (the SFX layer is trimmed too, so effects after a cut move with it)
    cuts = cfg.get("cuts", [])
    dur0 = scenes(tx)["scenes"][-1]["end_ms"]
    removed = 0
    for a, b, what in sorted(cuts, reverse=True):
        pa, pb = proj(a), proj(b)
        if pb - pa != b - a:
            raise RuntimeError(f"cut '{what}' crosses a card")
        call("trim_timeline", {"tx_id": tx, "timeline_hash": scenes(tx)["timeline_hash"], "ranges": [[pa, pb]], "ripple": True,
                               "target": {"type": "layers", "layer_ids": ["screen_1", "system_sound_1", "sound_effect_1"]}})
        removed += b - a
        dur = scenes(tx)["scenes"][-1]["end_ms"]
        if abs((dur0 - dur) - removed) > 3:
            raise RuntimeError(f"after '{what}': duration {dur}, want {dur0 - removed}")
    sc = scenes(tx)["scenes"]
    if len(sc) != 2 * N + 1:
        raise RuntimeError(f"{len(sc)} scenes after cuts")
    if len(all_segs(tx, ("sound_effect",))) != len(fx):
        raise RuntimeError("a cut removed a sound effect")
    print(f"  {len(sc)} scenes, {len(fx)} sound effects, {len(cuts)} cuts ({removed / 1000:.1f} s), "
          f"duration {sc[-1]['end_ms'] / 1000:.1f} s")
    return (f"Rebuild from the renders: a {G / 1000:g} s chapter break with the click before each of the {N} chapters, "
            f"{len(fx)} sound effects and {len(cuts)} retake cuts ({removed / 1000:.1f} s).")


def main():
    path = os.path.abspath(sys.argv[1])
    cfg = json.load(open(path))
    tx = call("begin_project_edit", {"project_id": cfg["project_id"]})["tx_id"]
    try:
        summary = rebuild(tx, cfg, os.path.dirname(path))
        print("checks passed:", summary)
        if "--dry" in sys.argv:
            call("abort_project_edit", {"tx_id": tx})
            print("dry run: aborted")
            return
        print(call("commit_project_edit", {"tx_id": tx, "change_summary": summary}))
    except Exception:
        call("abort_project_edit", {"tx_id": tx})
        raise


if __name__ == "__main__":
    main()
