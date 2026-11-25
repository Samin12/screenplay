"""Shared helpers for the borumi_*.py scripts (not a command; imported by them).

They talk to the Borumi editor through its local tool bridge: an HTTP endpoint that takes
{"tool": name, "args": {...}} and returns {"text": json, "isError": bool}. Every change happens
inside one project-edit transaction, which is aborted on any failure.
"""
import json
import os
import sys
import urllib.request

DEFAULT_BRIDGE = "http://127.0.0.1:47811/call"


def add_common_args(ap):
    ap.add_argument("--project", required=True, help="id of the editor project to change")
    ap.add_argument("--dry", action="store_true", help="do everything inside the transaction, verify, then ABORT instead of committing")
    ap.add_argument("--bridge", default=os.environ.get("BORUMI_BRIDGE", DEFAULT_BRIDGE),
                    help=f"URL of the editor's tool bridge (default $BORUMI_BRIDGE or {DEFAULT_BRIDGE})")
    ap.add_argument("--forbid", nargs="*", default=[], metavar="ID",
                    help="project ids this run must never touch (the creator's own project, raw backups); "
                         "also read from $BORUMI_FORBID (comma separated)")


def check_forbidden(a):
    forbid = set(a.forbid) | {p.strip() for p in os.environ.get("BORUMI_FORBID", "").split(",") if p.strip()}
    if a.project in forbid:
        sys.exit(f"refusing: project {a.project} is on the forbidden list (the creator's own project or a backup)")
    return forbid


class Bridge:
    def __init__(self, url, timeout=3600):
        self.url, self.timeout = url, timeout

    def call(self, tool, args):
        req = urllib.request.Request(self.url, json.dumps({"tool": tool, "args": args}).encode(), {"Content-Type": "application/json"})
        out = json.loads(urllib.request.urlopen(req, timeout=self.timeout).read())
        if out.get("isError"):
            raise RuntimeError(f"{tool}: {out.get('text')}")
        try:
            return json.loads(out.get("text") or "null")
        except ValueError:
            return out.get("text")

    def scenes(self, tx):
        return self.call("get_scenes", {"tx_id": tx})

    def import_media(self, tx, path):
        m = self.call("import_media", {"tx_id": tx, "file_path": path})
        while m.get("status") not in ("completed", None):
            m = self.call("get_media_import_status", {"tx_id": tx, "import_id": m["import_id"]})
        return m["media"]

    def segments(self, tx, end, kinds):
        """Every timeline segment on layers of the given kinds, as (layer id, segment), read in 3-minute windows."""
        out, seen = [], set()
        for s in range(0, max(end, 1), 180000):
            tl = self.call("get_timeline", {"tx_id": tx, "range": {"start_ms": s, "end_ms": min(end, s + 180000)}, "detail": "segments"})
            for layer in tl["layers"]:
                if layer["kind"] in kinds:
                    for g in layer.get("segments", []):
                        if g["id"] not in seen:
                            seen.add(g["id"])
                            out.append((layer["id"], g))
        return out

    def uncovered_scenes(self, tx, scene_list, layer_id="screen_1"):
        """Scenes not fully covered by picture: empty, or padded with the editor's 3 s wallpaper.

        Measures real coverage per scene, because a 3000 ms scene can be legitimate (a 3 s card scene).
        """
        pads = []
        for s in scene_list:
            tl = self.call("get_timeline", {"tx_id": tx, "range": {"start_ms": s["start_ms"], "end_ms": s["end_ms"]}, "detail": "segments"})
            cov = sum(min(g["end_ms"], s["end_ms"]) - max(g["start_ms"], s["start_ms"])
                      for layer in tl["layers"] if layer["id"] == layer_id for g in layer.get("segments", []))
            if cov < (s["end_ms"] - s["start_ms"]) - 5:
                pads.append((s["name"], s["end_ms"] - s["start_ms"], cov))
        return pads


def load_master(base):
    """(total_ms, scenes [[start_ms, name]...], bounds, numbered names, sfx list) from a master's plan files."""
    base = os.path.expanduser(base)
    for ext in (".segments.json", ".scenes.json", ".sfx.json", "-nosfx.mov"):
        if not os.path.exists(base + ext):
            sys.exit(f"missing {base + ext} (run assemble.py, then make_scenes.py)")
    total_ms = int(round(json.load(open(base + ".segments.json"))["total"] * 1000))
    new = [list(x) for x in json.load(open(base + ".scenes.json"))]          # finer than the YouTube chapters: cards and full clips are scenes
    new[0][0] = 0
    bounds = [c[0] for c in new] + [total_ms]
    names = [f"{i + 1:02d} {t}" for i, (_, t) in enumerate(new)]
    sfx = json.load(open(base + ".sfx.json"))
    missing = sorted({e["file"] for e in sfx if not os.path.exists(e["file"])})
    if missing:
        sys.exit(f"sound files missing: {missing}")
    return total_ms, new, bounds, names, sfx


def sfx_additions(sfx, snd):
    return [{"type": "sound_effect", "placement": {"at_ms": int(round(e["t"] * 1000))}, "content": {"media_id": snd[e["file"]]},
             "properties": {"volume_filter": float(e["db"])}} for e in sfx]
