#!/usr/bin/env bash
# Link NLP and YOLO models (and data) from the original harmful-content-detector
# project so the SafeLink backend can use them without copying ~3GB+ of files.
#
# Run from repo root: ./scripts/link-hcd-models.sh
#
# Prereq: Set HCD_SOURCE to the path of the harmful-content-detector project,
#         or it will default to the sibling path used below.
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

# Default: sibling of SafeLink_Dashboardd (e.g. same parent as "DashBoard")
HCD_SOURCE="${HCD_SOURCE:-$(cd "$ROOT_DIR/../.." 2>/dev/null && pwd)/Testing/harmful-content-detector}"

if [ ! -d "$HCD_SOURCE" ]; then
  echo "Error: harmful-content-detector not found at: $HCD_SOURCE"
  echo "Set HCD_SOURCE to the correct path, e.g.:"
  echo "  export HCD_SOURCE=/path/to/harmful-content-detector"
  echo "  ./scripts/link-hcd-models.sh"
  exit 1
fi

echo "Source (original project): $HCD_SOURCE"
echo "Target (this project):     $ROOT_DIR"
echo ""

# Replace placeholder dirs (empty or only .gitkeep) with symlinks to the original project
for dir in models data; do
  if [ -L "$ROOT_DIR/$dir" ]; then
    echo "Already linked: $dir"
    continue
  fi
  if [ -d "$ROOT_DIR/$dir" ]; then
    # Replace only if empty or only has .gitkeep
    count=$(find "$ROOT_DIR/$dir" -type f ! -name .gitkeep 2>/dev/null | wc -l | tr -d ' ')
    if [ "$count" -eq 0 ]; then
      rm -rf "$ROOT_DIR/$dir"
    else
      echo "Warning: $dir/ has $count file(s); skipping. Remove or move them first to link."
      continue
    fi
  fi
  ln -s "$HCD_SOURCE/$dir" "$ROOT_DIR/$dir"
  echo "Linked: $dir -> $HCD_SOURCE/$dir"
done

echo ""
echo "Done. Backend (npm run dev:backend) will use the same models as the original project."
