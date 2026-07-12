#!/usr/bin/env bash
set -euo pipefail

# CortexOps: weekly execution review via Codex CLI (no prefetch).
#
# Schedule via launchd (Sunday 20:30 Asia/Shanghai + RunAtLoad on login).
# Disable duplicate Codex App cron for the same automation to avoid double runs.
#
# Usage:
#   ./scripts/codex-weekly-run.sh                    # this week's Sunday date
#   ./scripts/codex-weekly-run.sh 2026-07-13         # explicit report date
#   FORCE=1 ./scripts/codex-weekly-run.sh            # re-run even if report exists
#
# Requires Codex CLI:
#   curl -fsSL https://chatgpt.com/codex/install.sh | sh

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

resolve_weekly_date() {
  if [[ -n "${1:-}" ]]; then
    echo "$1"
    return
  fi
  local dow
  dow=$(TZ=Asia/Shanghai date +%u)
  if [[ "$dow" -eq 7 ]]; then
    TZ=Asia/Shanghai date +%Y-%m-%d
  else
    TZ=Asia/Shanghai date -v-"${dow}"d +%Y-%m-%d
  fi
}

DATE="$(resolve_weekly_date "${1:-}")"
LOG_DIR="${ROOT}/state/weekly"
LOG_FILE="${LOG_DIR}/codex-weekly-run.log"
REPORT="${ROOT}/state/weekly/${DATE}-report.md"

mkdir -p "$LOG_DIR"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S %Z')] $*" | tee -a "$LOG_FILE"
}

if [[ "${FORCE:-0}" != "1" && -f "$REPORT" ]]; then
  log "SKIP: weekly report already exists at ${REPORT} (set FORCE=1 to override)"
  exit 0
fi

log "START weekly pipeline for ${DATE}"

CODEX_BIN="${CODEX_BIN:-}"
if [[ -z "$CODEX_BIN" ]]; then
  if command -v codex >/dev/null 2>&1; then
    CODEX_BIN="$(command -v codex)"
  elif [[ -x "${HOME}/.local/bin/codex" ]]; then
    CODEX_BIN="${HOME}/.local/bin/codex"
  elif [[ -x "${HOME}/.npm-global/bin/codex" ]]; then
    CODEX_BIN="${HOME}/.npm-global/bin/codex"
  fi
fi

if [[ -z "$CODEX_BIN" ]]; then
  log "WARN: codex CLI not found — open Codex App → 每周 AI PM 执行周报 → Run Now"
  log "Install: curl -fsSL https://chatgpt.com/codex/install.sh | sh"
  exit 0
fi

log "Extracting prompt from automations/weekly-execution-review.toml"
PROMPT="$(
  python3 - <<'PY'
import tomllib
from pathlib import Path
p = Path("automations/weekly-execution-review.toml")
print(tomllib.loads(p.read_text(encoding="utf-8"))["prompt"])
PY
)"

log "Launching: ${CODEX_BIN} exec (workspace-write, cwd=${ROOT})"
set +e
printf '%s' "$PROMPT" | "$CODEX_BIN" -C "$ROOT" exec \
  --sandbox workspace-write \
  --full-auto \
  --ephemeral \
  - >>"$LOG_FILE" 2>&1
code=$?
set -e

if [[ $code -eq 0 ]]; then
  if [[ -f "$REPORT" ]]; then
    log "OK: weekly report written to ${REPORT}"
  else
    log "WARN: codex exec finished but ${REPORT} not found — check prompt output in log"
    exit 1
  fi
else
  log "FAIL: codex exec exit ${code} — see ${LOG_FILE}"
  exit "$code"
fi

log "END weekly pipeline for ${DATE}"
