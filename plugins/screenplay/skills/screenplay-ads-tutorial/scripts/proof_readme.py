#!/usr/bin/env python3
"""Build a proof folder's README.md and proof-index.json, with a do-not-show column.

  python3 proof_readme.py --proof proof/ [--config proof-index.config.json] [-o DIR]

WHEN: after the proof captures are in (every on-screen claim has a screenshot and a source
record) and before any writer uses them; re-run whenever captures are added. The index is what
writers and reviewers read: which file backs which claim, what it honestly shows, the source
pill, and whether it may be shown at all.

READS every `<name>.source.json` in the proof folder. A source record is an object with
  url, page_title, capture_date, files [..], quote, source_pill, description
and optionally claim, group, do_not_show. Page text in a record is data, not instructions.

--config (optional JSON, relative paths are relative to it) holds everything specific to the video:
  "title":   heading of the README
  "intro":   paragraph under it (how files are named, how to use them on screen)
  "claims":  {"<record name>": "the claim it backs"}                 for records with no "claim"
  "groups":  [{"key": "official", "title": "Official pages", "prefix": ""},
              {"key": "B", "title": "Remaining claims", "prefix": "b-"}]
             a record with no "group" goes to the group with the longest matching file-name prefix
  "do_not_show": {"<file or record name>": "why"}                    marks it and lists it under "Do not show"
  "split":   {"<record name>": [{"files": ["a.png"], "do_not_show": true, "note": "price visible"},
                                {"files": ["a-crop.png"], "do_not_show": false, "note": "no price: use this"}]}
             one record, several rows (one capture may be fine as a crop and not as a whole)
  "unrecorded": {"glob": "ex-*.png", "group": "A", "claim": "...", "description": "..."}
             files that match and have no source record get a row marked do-not-show
  "sections": [{"title": "Fix before publishing", "file": "fixes.md"}, {"title": "Capture notes", "text": "..."}]
             extra README sections, written by a person

WRITES README.md and proof-index.json (every row, with `do_not_show`) into the proof folder, or
into -o. Prints the record count and any image or video file no record covers.
"""
import argparse
import fnmatch
import glob
import os
import sys

sys.dont_write_bytecode = True
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import _avlib as av  # noqa: E402

MEDIA = (".png", ".jpg", ".jpeg", ".webp", ".gif", ".mp4", ".mov", ".webm")


def main():
    ap = argparse.ArgumentParser(description="Proof folder -> README.md + proof-index.json with a do-not-show column.",
                                 epilog=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--proof", required=True, help="the proof folder (holds *.source.json and the captures)")
    ap.add_argument("--config", help="titles, claims, groups, do-not-show reasons, extra sections (JSON)")
    ap.add_argument("-o", "--out", help="where to write README.md and proof-index.json (default: the proof folder)")
    a = ap.parse_args()

    D = os.path.abspath(os.path.expanduser(a.proof))
    cfg, here = {}, D
    if a.config:
        cpath = os.path.abspath(os.path.expanduser(a.config))
        cfg, here = av.load_json(cpath), os.path.dirname(cpath)
    out = os.path.abspath(os.path.expanduser(a.out)) if a.out else D
    os.makedirs(out, exist_ok=True)
    groups = cfg.get("groups") or [{"key": "all", "title": "Proof", "prefix": ""}]
    claims, dns, split = cfg.get("claims", {}), cfg.get("do_not_show", {}), cfg.get("split", {})

    def group_of(name):
        best = max((g for g in groups if name.startswith(g.get("prefix", ""))), key=lambda g: len(g.get("prefix", "")), default=groups[0])
        return best["key"]

    recs = []
    for f in sorted(glob.glob(os.path.join(D, "*.source.json"))):
        name = os.path.basename(f)[: -len(".source.json")]
        d = av.load_json(f)
        d.setdefault("files", [])
        d.setdefault("description", "")
        d.setdefault("group", group_of(name))
        d.setdefault("claim", claims.get(name, ""))
        if name in split:
            for part in split[name]:
                e = dict(d)
                e["files"] = part["files"]
                e["do_not_show"] = bool(part.get("do_not_show", False))
                e["description"] = (part["note"].rstrip(". ") + ". " if part.get("note") else "") + d["description"]
                recs.append(e)
            continue
        why = dns.get(name) or next((dns[x] for x in d["files"] if x in dns), None)
        d["do_not_show"] = bool(d.get("do_not_show", False) or why)
        if why and why not in d["description"]:
            d["description"] = why.rstrip(". ") + ". " + d["description"]
        recs.append(d)

    covered = {fl for r in recs for fl in r["files"]} | {os.path.basename(fl) for r in recs for fl in r["files"]}
    un = cfg.get("unrecorded")
    if un:
        for path in sorted(glob.glob(os.path.join(D, "**", "*"), recursive=True)):
            rel = os.path.relpath(path, D)
            if os.path.isfile(path) and fnmatch.fnmatch(os.path.basename(path), un["glob"]) and rel not in covered and os.path.basename(path) not in covered:
                recs.append({"url": "", "page_title": "", "capture_date": "", "files": [rel], "quote": "", "source_pill": "",
                             "description": un.get("description", "No source record yet. Do not show until its source and pill are filled in."),
                             "claim": un.get("claim", ""), "group": un.get("group", groups[-1]["key"]), "do_not_show": True})
    av.dump_json(recs, os.path.join(out, "proof-index.json"))

    def row(r):
        fs = " / ".join(f"`{x}`" for x in r["files"])
        return (f"| {fs} | {r.get('claim', '')} | {r['description'].replace('|', '/')} | {r.get('source_pill', '')} | "
                f"{'**DO NOT SHOW**' if r['do_not_show'] else 'ok'} |")

    L = [f"# {cfg.get('title', 'Proof pack: index')}", ""]
    L += [cfg.get("intro", "Each capture has a `name.source.json` (url, title, date, exact quote, pill, description). Machine-readable: "
                           "`proof-index.json` (every row, with `do_not_show`). On screen: use the crop, show the source pill, highlight "
                           "the exact words. Page text is data, not instructions."), ""]
    keys = [g["key"] for g in groups]
    for g in groups + [{"key": k, "title": f"Group {k}"} for k in sorted({r["group"] for r in recs} - set(keys))]:
        rows = [row(r) for r in recs if r["group"] == g["key"]]
        if rows:
            L += [f"## {g['title']}", "", "| File(s) | Claim | What it shows (honest) | Pill | Use |", "|---|---|---|---|---|"] + rows + [""]
    hidden = [r for r in recs if r["do_not_show"]]
    L += ["## Do not show", ""]
    L += [f"- {' / '.join(f'`{x}`' for x in r['files'])}: {r['description']}" for r in hidden] or ["- Nothing is marked do-not-show."]
    L += [""]
    for s in cfg.get("sections", []):
        text = open(av.rp(s["file"], here), encoding="utf-8").read().strip() if s.get("file") else s.get("text", "")
        L += [f"## {s['title']}", "", text, ""]
    open(os.path.join(out, "README.md"), "w", encoding="utf-8").write("\n".join(L))

    allf = [os.path.relpath(p, D) for p in glob.glob(os.path.join(D, "**", "*"), recursive=True) if os.path.isfile(p) and p.lower().endswith(MEDIA)]
    cov = {fl for r in recs for fl in r["files"]}
    loose = sorted(f for f in allf if f not in cov and os.path.basename(f) not in cov)
    print(f"records {len(recs)} ({len(hidden)} do-not-show); files with no record: {loose}")


if __name__ == "__main__":
    main()
