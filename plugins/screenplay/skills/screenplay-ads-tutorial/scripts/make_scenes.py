#!/usr/bin/env python3
"""Turn a master's .segments.json into the editor's scene list (<base>.scenes.json).

  python3 make_scenes.py --master out/master-v1 [--config assemble.json] [-o scenes.json]

WHEN: right after assemble.py, before borumi_build.py / borumi_rebuild.py (they read the scene list).

The scene list is finer than the YouTube chapters: every chapter card is its own
"Card · <title>" scene, the part after a card is a scene named after the chapter, and full
clips (a finished ad shown whole) are their own scenes. Output: [[start_ms, "name"], ...].

Names come from the "scenes" block of the config (the same file assemble.py reads); nothing is
hard-coded here:

  "scenes": {
    "opening": "Opening · the finished ad",          name of the scene at 0 ms (default "Opening")
    "card_prefix": "Card · ",                        prefix of a card scene
    "after_card": {                                  the scene that starts when a card ends;
      "Level 1: Code only": "Product ad (full)"      default: the chapter title with ": " -> " · "
    },
    "at_segment": [                                  extra scene starts, applied last (they win)
      {"segment": "01-intro", "name": "Intro"},
      {"segment": "03-level1", "offset": 16.0, "name": "Level 1 · Code only"}
    ]
  }

"segment" is a segment id from the config; "offset" is seconds after that segment's start in
the master. Without a "scenes" block you still get the card scenes and the chapter scenes.
"""
import argparse
import os
import sys

sys.dont_write_bytecode = True
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import _avlib as av  # noqa: E402


def main():
    ap = argparse.ArgumentParser(description="master .segments.json -> scene list with a card scene before each chapter.",
                                 epilog=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--master", required=True, help="base path of the master, e.g. out/master-v1 (reads <base>.segments.json)")
    ap.add_argument("--config", help='the assemble config; its "scenes" block names the special scenes')
    ap.add_argument("-o", "--out", help="output file (default <base>.scenes.json)")
    a = ap.parse_args()

    base = os.path.expanduser(a.master)
    d = av.load_json(base + ".segments.json")
    seg = {p["id"]: p for p in d["segments"]}
    names = (av.load_json(os.path.expanduser(a.config)).get("scenes") or {}) if a.config else {}
    prefix = names.get("card_prefix", "Card · ")
    after = names.get("after_card", {})

    sc = {0.0: names.get("opening", "Opening")}
    for s0, s1, title, *_ in d["card_spans"]:
        sc[s0] = prefix + title
        sc[s1] = after.get(title, title.replace(": ", " · "))
    for e in names.get("at_segment", []):
        if e["segment"] not in seg:
            sys.exit(f'scenes.at_segment: no segment "{e["segment"]}" in {base}.segments.json')
        sc[seg[e["segment"]]["start"] + float(e.get("offset", 0.0))] = e["name"]

    out = [[int(round(t * 1000)), n] for t, n in sorted(sc.items())]
    short = [(n, b[0] - t) for (t, n), b in zip(out, out[1:]) if b[0] - t < 34]
    if short:
        sys.exit(f"two scene starts on the same frame: {short}")
    av.dump_json(out, a.out or base + ".scenes.json")
    for t, n in out:
        print(f"{t / 1000:8.2f} {n}")


if __name__ == "__main__":
    main()
