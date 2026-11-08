#!/bin/bash
# Lives in <work>/tools/ next to merge.sh. A private copy of the work dir for one part writer: shares the media (symlinks), owns its edit.yaml and .screenplay.
#   tools/lane.sh C            -> (re)build lanes/C/edit.yaml from edit.header.yaml + parts/C.yaml
#   tools/lane.sh C check      -> ... then `screenplay check lanes/C`
#   tools/lane.sh C sheet --every 1s --from w100 --to w300   -> ... then `screenplay sheet lanes/C ...`
set -euo pipefail
W="$(cd "$(dirname "$0")/.." && pwd)"
X="$1"; shift
L="$W/lanes/$X"
mkdir -p "$L"
for f in source.json words.json words.out.json aroll.json aroll.mp4 face.json cuts.yaml media proof clips src; do
  [ -e "$W/$f" ] && [ ! -e "$L/$f" ] && ln -s "$W/$f" "$L/$f"
done
[ -f "$W/parts/$X.yaml" ] || { echo "parts/$X.yaml missing" >&2; exit 1; }
OUT="$L" PARTS="$X" "$W/tools/merge.sh" >/dev/null
echo "lane $X: $(grep -c '^  - kind:' "$L/edit.yaml") scenes"
if [ $# -gt 0 ]; then cmd="$1"; shift; screenplay "$cmd" "$L" "$@"; fi
