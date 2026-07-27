#!/usr/bin/env bash
set -euo pipefail

# CortexOps: generic Codex CLI runner for weekly/monthly automations (no prefetch).
#
# Usage:
#   ./scripts/codex-automation-run.sh paper-radar [YYYY-MM-DD]
#   ./scripts/codex-automation-run.sh monthly [YYYY-MM-01]
#   FORCE=1 ./scripts/codex-automation-run.sh paper-radar
#
# Weekly automations use the week's Sunday date (Mon–Sat catch-up → last Sunday).
# Monthly uses YYYY-MM-01 of the current month unless a date is passed.

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
# shellcheck source=lib/codex-automation-common.sh
source "${ROOT}/scripts/lib/codex-automation-common.sh"

KEY="${1:-}"
DATE_ARG="${2:-}"

usage() {
  cat <<'EOF'
Usage: ./scripts/codex-automation-run.sh <key> [date]

Keys:
  paper-radar   → state/weekly/paper/YYYY-MM-DD-paper-radar.md
  monthly       → state/monthly/YYYY-MM-DD-monthly-review.md

Weekly keys default to last Sunday's date. Monthly defaults to YYYY-MM-01.
EOF
  exit 1
}

[[ -n "$KEY" ]] || usage

case "$KEY" in
  paper-radar)
    PROMPT_FILE="prompts/ai-paper-radar.md"
    LOG_DIR="${ROOT}/state/weekly/paper"
    LOG_FILE="${LOG_DIR}/codex-paper-radar-run.log"
    DATE="$(resolve_week_sunday "$DATE_ARG")"
    REPORT="${LOG_DIR}/${DATE}-paper-radar.md"
    REPORT_REL="state/weekly/paper/${DATE}-paper-radar.md"
    ;;
  monthly)
    PROMPT_FILE="prompts/monthly-review.md"
    LOG_DIR="${ROOT}/state/monthly"
    LOG_FILE="${LOG_DIR}/codex-monthly-run.log"
    DATE="$(resolve_month_first "$DATE_ARG")"
    REPORT="${LOG_DIR}/${DATE}-monthly-review.md"
    REPORT_REL="state/monthly/${DATE}-monthly-review.md"
    ;;
  *)
    usage
    ;;
esac

mkdir -p "$LOG_DIR"

RUN_DATE="$(TZ=Asia/Shanghai date +%Y-%m-%d)"
log_automation "$LOG_FILE" "START ${KEY} — run_date=${RUN_DATE} report_date=${DATE} target=${REPORT_REL}"

if [[ "${FORCE:-0}" != "1" && -f "$REPORT" ]]; then
  log_automation "$LOG_FILE" "SKIP: report exists at ${REPORT} (set FORCE=1 to override)"
  exit 0
fi

CODEX_BIN="$(resolve_codex_bin || true)"
if [[ -z "$CODEX_BIN" ]]; then
  log_automation "$LOG_FILE" "WARN: codex CLI not found — install or configure CODEX_BIN to run ${KEY}"
  exit 0
fi

log_automation "$LOG_FILE" "Reading prompt from ${PROMPT_FILE}"
PROMPT="$(build_prompt_with_header "$RUN_DATE" "$DATE" "$REPORT_REL" "$PROMPT_FILE")"

log_automation "$LOG_FILE" "Launching: ${CODEX_BIN} exec (workspace-write, cwd=${ROOT})"
code="$(run_codex_automation "$CODEX_BIN" "$ROOT" "$PROMPT" "$LOG_FILE")"

if [[ "$code" -eq 0 ]]; then
  if [[ -f "$REPORT" ]]; then
    log_automation "$LOG_FILE" "OK: report written to ${REPORT}"
  else
    log_automation "$LOG_FILE" "WARN: codex exec finished but ${REPORT} not found"
    log_automation "$LOG_FILE" "HINT: FORCE=1 ./scripts/codex-automation-run.sh ${KEY} ${DATE}"
    exit 1
  fi
else
  log_automation "$LOG_FILE" "FAIL: codex exec exit ${code}"
  exit "$code"
fi

log_automation "$LOG_FILE" "END ${KEY} for ${DATE}"
