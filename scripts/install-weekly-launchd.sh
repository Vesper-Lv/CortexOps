#!/usr/bin/env bash
set -euo pipefail

# Install macOS launchd job for weekly Codex exec (Sunday 20:30 + login catch-up).
# Usage: ./scripts/install-weekly-launchd.sh

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PLIST_SRC="${ROOT}/launchd/com.cortexops.weekly-ai-pm.plist.example"
PLIST_DST="${HOME}/Library/LaunchAgents/com.cortexops.weekly-ai-pm.plist"

if [[ ! -f "$PLIST_SRC" ]]; then
  echo "Missing $PLIST_SRC" >&2
  exit 1
fi

mkdir -p "${ROOT}/state/weekly"

sed "s|/Users/jiexinlv/Documents/CortexOps|${ROOT}|g" "$PLIST_SRC" >"$PLIST_DST"

chmod +x "${ROOT}/scripts/codex-weekly-run.sh"

CODEX_BIN=""
for candidate in "$(command -v codex 2>/dev/null)" "${HOME}/.local/bin/codex" "${HOME}/.npm-global/bin/codex"; do
  [[ -n "$candidate" && -x "$candidate" ]] && CODEX_BIN="$candidate" && break
done
if [[ -n "$CODEX_BIN" ]]; then
  /usr/libexec/PlistBuddy -c "Add :EnvironmentVariables:CODEX_BIN string ${CODEX_BIN}" "$PLIST_DST" 2>/dev/null \
    || /usr/libexec/PlistBuddy -c "Set :EnvironmentVariables:CODEX_BIN ${CODEX_BIN}" "$PLIST_DST"
  echo "CODEX_BIN=${CODEX_BIN} (written to plist)"
fi

launchctl bootout "gui/$(id -u)/com.cortexops.weekly-ai-pm" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$PLIST_DST"
launchctl enable "gui/$(id -u)/com.cortexops.weekly-ai-pm"
launchctl kickstart -k "gui/$(id -u)/com.cortexops.weekly-ai-pm" 2>/dev/null || true

echo "Installed: $PLIST_DST"
echo "Logs: state/weekly/codex-weekly-run.log"
echo ""
echo "Important: do not configure a duplicate Codex App cron for 每周 AI PM 执行周报."
echo "Test now: FORCE=1 ${ROOT}/scripts/codex-weekly-run.sh"
