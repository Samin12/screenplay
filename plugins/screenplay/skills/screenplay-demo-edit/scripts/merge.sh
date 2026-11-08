#!/bin/bash
# Builds edit.yaml from edit.header.yaml + parts/*.yaml (each a top-level list of scenes). Lives in <work>/tools/.
#   tools/merge.sh                       -> <work>/edit.yaml from every part, in name order (PARTS="A B" to pick)
#   OUT=<dir> PARTS="C" tools/merge.sh   -> <dir>/edit.yaml (a lane)
set -euo pipefail
W="$(cd "$(dirname "$0")/.." && pwd)"
OUT="${OUT:-$W}"
PARTS="${PARTS:-$(cd "$W/parts" && ls *.yaml | sed 's/\.yaml$//' | tr '\n' ' ')}"
{
  cat "$W/edit.header.yaml"
  echo
  echo "scenes:"
  for p in $PARTS; do
    f="$W/parts/$p.yaml"
    [ -f "$f" ] || { echo "missing $f" >&2; exit 1; }
    echo "  # ---------- part $p ----------"
    sed 's/^/  /' "$f"
    echo
  done
} > "$OUT/edit.yaml"
echo "wrote $OUT/edit.yaml ($(grep -c '^  - kind:' "$OUT/edit.yaml") scenes)"
