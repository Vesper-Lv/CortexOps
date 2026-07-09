#!/usr/bin/env bash
set -euo pipefail

# Copy CortexOps daily command runbook into Obsidian "09 CODE" folder.
#
# Usage:
#   ./scripts/sync-runbook-to-obsidian.sh
#   OBSIDIAN_CODE_DIR="/path/to/vault/09 CODE" ./scripts/sync-runbook-to-obsidian.sh
#
# Default: ~/Documents/Obsidian/09 CODE
# Override if your vault lives elsewhere (iCloud, different vault name).

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="${ROOT}/docs/codex-daily-runbook.md"
DEST_DIR="${OBSIDIAN_CODE_DIR:-${HOME}/Documents/Obsidian/09 CODE}"
DEST_FILE="${DEST_DIR}/CortexOps-日报命令速查.md"

if [[ ! -f "$SRC" ]]; then
  echo "Missing $SRC — git pull first" >&2
  exit 1
fi

mkdir -p "$DEST_DIR"
cp "$SRC" "$DEST_FILE"
echo "OK: copied to ${DEST_FILE}"
