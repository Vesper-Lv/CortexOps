#!/usr/bin/env bash
set -euo pipefail

# Install macOS launchd job for daily prefetch + codex exec.
# Usage: ./scripts/install-daily-launchd.sh

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PLIST_SRC="${ROOT}/launchd/com.cortexops.daily-ai-pm.plist.example"
PLIST_DST="${HOME}/Library/LaunchAgents/com.cortexops.daily-ai-pm.plist"

if [[ ! -f "$PLIST_SRC" ]]; then
  echo "Missing $PLIST_SRC" >&2
  exit 1
fi

# Patch paths for this machine
sed "s|/Users/jiexinlv/Documents/CortexOps|${ROOT}|g" "$PLIST_SRC" >"$PLIST_DST"

chmod +x "${ROOT}/scripts/codex-daily-run.sh"
chmod +x "${ROOT}/scripts/codex-daily-prefetch.sh"
chmod +x "${ROOT}/scripts/ai-pm-ingest-prefetch.sh"

launchctl bootout "gui/$(id -u)/com.cortexops.daily-ai-pm" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$PLIST_DST"
launchctl enable "gui/$(id -u)/com.cortexops.daily-ai-pm"
launchctl kickstart -k "gui/$(id -u)/com.cortexops.daily-ai-pm" 2>/dev/null || true

echo "Installed: $PLIST_DST"
echo "Logs: state/daily/codex-daily-run.log"
echo ""
echo "Important: disable Codex App built-in cron for the same automation to avoid double runs."
echo "Test now: ${ROOT}/scripts/codex-daily-run.sh"
