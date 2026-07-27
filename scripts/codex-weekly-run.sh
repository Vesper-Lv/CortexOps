#!/usr/bin/env bash
set -euo pipefail

# CortexOps: weekly execution review via Codex CLI (no prefetch).
#
# Schedule via launchd (Sunday 20:30 Asia/Shanghai + RunAtLoad on login).
# Do not configure a duplicate Codex App cron for the same weekly report.
#
# Usage:
#   ./scripts/codex-weekly-run.sh                    # last Sunday's date (Mon–Sat catch-up)
#   ./scripts/codex-weekly-run.sh 2026-07-12       # explicit Sunday report date
#   FORCE=1 ./scripts/codex-weekly-run.sh            # re-run even if report exists
#
# Requires Codex CLI:
#   curl -fsSL https://chatgpt.com/codex/install.sh | sh

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
# shellcheck source=lib/codex-automation-common.sh
source "${ROOT}/scripts/lib/codex-automation-common.sh"

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
REPORT_REL="state/weekly/${DATE}-report.md"

mkdir -p "$LOG_DIR"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S %Z')] $*" | tee -a "$LOG_FILE"
}

if [[ "${FORCE:-0}" != "1" && -f "$REPORT" ]]; then
  log "SKIP: weekly report already exists at ${REPORT} (set FORCE=1 to override)"
  exit 0
fi

RUN_DATE="$(TZ=Asia/Shanghai date +%Y-%m-%d)"
log "START weekly pipeline — run_date=${RUN_DATE} report_sunday=${DATE} target=${REPORT_REL}"

CODEX_BIN="$(resolve_codex_bin || true)"

if [[ -z "$CODEX_BIN" ]]; then
  log "WARN: codex CLI not found — install or configure CODEX_BIN to run the weekly report"
  log "Install: curl -fsSL https://chatgpt.com/codex/install.sh | sh"
  exit 0
fi

PROMPT_FILE="prompts/weekly-execution-review.md"
log "Reading prompt from ${PROMPT_FILE}"
PROMPT="$(build_prompt_with_header "$RUN_DATE" "$DATE" "$REPORT_REL" "$PROMPT_FILE")"

log "Launching: ${CODEX_BIN} exec (workspace-write, cwd=${ROOT}, target=${REPORT_REL})"
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
    log "WARN: codex exec finished but ${REPORT} not found"
    shopt -s nullglob
    recent=( "$LOG_DIR"/*-report.md )
    shopt -u nullglob
    if [[ ${#recent[@]} -gt 0 ]]; then
      log "WARN: found other weekly reports (wrong date?): ${recent[*]}"
    fi
    log "HINT: re-run with explicit Sunday date, e.g. FORCE=1 ./scripts/codex-weekly-run.sh ${DATE}"
    exit 1
  fi
else
  log "FAIL: codex exec exit ${code} — see ${LOG_FILE}"
  exit "$code"
fi

log "END weekly pipeline for ${DATE}"
