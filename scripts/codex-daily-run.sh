#!/usr/bin/env bash
set -euo pipefail

# CortexOps: Terminal prefetch → verify → trigger Codex headless run.
#
# Use this instead of Codex App cron when local shell DNS is broken.
# Schedule via launchd (09:00 + RunAtLoad on login). Disable duplicate
# Codex App automation cron to avoid double runs.
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

DATE="${1:-$(TZ=Asia/Shanghai date +%Y-%m-%d)}"
LOG_DIR="${ROOT}/state/daily"
LOG_FILE="${LOG_DIR}/codex-daily-run.log"
LINKS="${ROOT}/state/daily/${DATE}-links.jsonl"
REPORT="${ROOT}/state/daily/${DATE}-report.md"
SIGNAL="${ROOT}/state/daily/${DATE}-ingest-ready.signal"

mkdir -p "$LOG_DIR"

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
  log "FAIL: prefetch/verify failed — see ${LOG_DIR}/${DATE}-ingest-error.md"
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

CODEX_BIN="${CODEX_BIN:-}"
if [[ -z "$CODEX_BIN" ]]; then
  if command -v codex >/dev/null 2>&1; then
    CODEX_BIN="$(command -v codex)"
  elif [[ -x "${HOME}/.npm-global/bin/codex" ]]; then
    CODEX_BIN="${HOME}/.npm-global/bin/codex"
  fi
fi

if [[ -z "$CODEX_BIN" ]]; then
  log "WARN: codex CLI not found — prefetch OK; open Codex App → 每日 AI PM → Run Now"
  log "Install: curl -fsSL https://chatgpt.com/codex/install.sh | sh"
  exit 0
fi

log "Extracting prompt from automations/ai-pm.toml"
PROMPT="$(
  python3 - <<'PY'
import tomllib
from pathlib import Path
p = Path("automations/ai-pm.toml")
print(tomllib.loads(p.read_text(encoding="utf-8"))["prompt"])
PY
)"

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
