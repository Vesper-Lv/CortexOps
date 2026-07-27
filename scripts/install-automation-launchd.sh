#!/usr/bin/env bash
set -euo pipefail

# Install macOS launchd jobs for paper radar and monthly Codex automations.
# Usage: ./scripts/install-automation-launchd.sh

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

install_one() {
  local label="$1"
  local src="$2"
  local dst="${HOME}/Library/LaunchAgents/${label}.plist"
  local log_dir="$3"

  mkdir -p "${ROOT}/${log_dir}"
  sed "s|/Users/jiexinlv/Documents/CortexOps|${ROOT}|g" "${ROOT}/${src}" >"$dst"

  CODEX_BIN=""
  for candidate in "$(command -v codex 2>/dev/null)" "${HOME}/.local/bin/codex" "${HOME}/.npm-global/bin/codex"; do
    [[ -n "$candidate" && -x "$candidate" ]] && CODEX_BIN="$candidate" && break
  done
  if [[ -n "$CODEX_BIN" ]]; then
    /usr/libexec/PlistBuddy -c "Add :EnvironmentVariables:CODEX_BIN string ${CODEX_BIN}" "$dst" 2>/dev/null \
      || /usr/libexec/PlistBuddy -c "Set :EnvironmentVariables:CODEX_BIN ${CODEX_BIN}" "$dst"
  fi

  launchctl bootout "gui/$(id -u)/${label}" 2>/dev/null || true
  launchctl bootstrap "gui/$(id -u)" "$dst"
  launchctl enable "gui/$(id -u)/${label}"
  echo "Installed: $dst"
}

chmod +x "${ROOT}/scripts/codex-automation-run.sh"

install_one com.cortexops.paper-radar launchd/com.cortexops.paper-radar.plist.example state/weekly/paper
install_one com.cortexops.monthly-review launchd/com.cortexops.monthly-review.plist.example state/monthly

echo ""
echo "Also run ./scripts/install-weekly-launchd.sh for Sunday execution review."
echo "Do not configure duplicate Codex App crons for these terminal runners."
echo "Test: FORCE=1 ${ROOT}/scripts/codex-automation-run.sh paper-radar"
