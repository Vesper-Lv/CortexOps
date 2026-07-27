#!/usr/bin/env bash
set -euo pipefail

# CortexOps: Terminal prefetch → verify → trigger Codex headless run.
#
# Schedule via launchd (09:00 + RunAtLoad on login). Do not configure a
# duplicate Codex App automation cron for the same daily report.
#
# Usage:
#   ./scripts/codex-daily-run.sh              # today (Asia/Shanghai)
#   ./scripts/codex-daily-run.sh 2026-07-07
#   FORCE=1 ./scripts/codex-daily-run.sh      # re-run even if report exists
#   SKIP_CODEX=1 ./scripts/codex-daily-run.sh # prefetch only
#
# Requires Codex CLI for auto-run:
#   curl -fsSL https://chatgpt.com/codex/install.sh | sh
#   # or: npm install -g @openai/codex

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
# shellcheck source=lib/codex-automation-common.sh
source "${ROOT}/scripts/lib/codex-automation-common.sh"

DATE="${1:-$(TZ=Asia/Shanghai date +%Y-%m-%d)}"
LOG_DIR="${ROOT}/state/daily"
LOG_FILE="${LOG_DIR}/codex-daily-run.log"
ACTIVE_DIR="${ROOT}/state/daily/active"
LINKS="${ACTIVE_DIR}/${DATE}-links.jsonl"
REPORT="${ACTIVE_DIR}/${DATE}-report.md"
SIGNAL="${ACTIVE_DIR}/${DATE}-ingest-ready.signal"

mkdir -p "$LOG_DIR"
mkdir -p "$ACTIVE_DIR"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S %Z')] $*" | tee -a "$LOG_FILE"
}

if [[ "${FORCE:-0}" != "1" && -f "$LINKS" && -f "$REPORT" ]]; then
  log "SKIP: ${DATE} report already exists (set FORCE=1 to override)"
  exit 0
fi

log "START daily pipeline for ${DATE}"

chmod +x scripts/codex-daily-prefetch.sh scripts/ai-pm-ingest-prefetch.sh
if ! ./scripts/codex-daily-prefetch.sh "$DATE" >>"$LOG_FILE" 2>&1; then
  log "FAIL: prefetch/verify failed — see ${ACTIVE_DIR}/${DATE}-ingest-error.md"
  exit 1
fi

# Sentinel for operators / optional watchers
cat >"$SIGNAL" <<EOF
date=${DATE}
ready=true
prefetch_host=terminal
triggered_at=$(date -u +%Y-%m-%dT%H:%M:%SZ)
next_step=codex_exec_or_app_run
EOF
log "Wrote signal: ${SIGNAL}"

if [[ "${SKIP_CODEX:-0}" == "1" ]]; then
  log "SKIP_CODEX=1 — prefetch done; run Codex App automation manually"
  exit 0
fi

CODEX_BIN="$(resolve_codex_bin || true)"

if [[ -z "$CODEX_BIN" ]]; then
  log "WARN: codex CLI not found — prefetch OK; install or configure CODEX_BIN to run the report"
  log "Install: curl -fsSL https://chatgpt.com/codex/install.sh | sh"
  exit 0
fi

PROMPT_FILE="prompts/daily-ai-pm.md"
log "Reading prompt from ${PROMPT_FILE}"
PROMPT="$(read_prompt_file "$PROMPT_FILE")"

log "Launching: ${CODEX_BIN} exec (workspace-write, cwd=${ROOT})"
# workspace-write: write state/daily + pools; strict mode reads aihot raw only (no network).
set +e
printf '%s' "$PROMPT" | "$CODEX_BIN" -C "$ROOT" exec \
  --sandbox workspace-write \
  --full-auto \
  --ephemeral \
  - >>"$LOG_FILE" 2>&1
code=$?
set -e

if [[ $code -eq 0 ]]; then
  log "OK: codex exec finished for ${DATE}"
else
  log "FAIL: codex exec exit ${code} — see ${LOG_FILE}"
  exit "$code"
fi

log "END daily pipeline for ${DATE}"
