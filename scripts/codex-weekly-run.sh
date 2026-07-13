#!/usr/bin/env bash
set -euo pipefail

# CortexOps: weekly execution review via Codex CLI (no prefetch).
#
# Schedule via launchd (Sunday 20:30 Asia/Shanghai + RunAtLoad on login).
# Disable duplicate Codex App cron for the same automation to avoid double runs.
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
  RUN_DATE="$RUN_DATE" REPORT_DATE="$DATE" python3 - <<'PY'
import os
import tomllib
from pathlib import Path

run_date = os.environ["RUN_DATE"]
report_date = os.environ["REPORT_DATE"]
p = Path("automations/weekly-execution-review.toml")
base = tomllib.loads(p.read_text(encoding="utf-8"))["prompt"]
header = f"""【运行指令 — 优先于下文占位符】
- 运行日（Asia/Shanghai）：{run_date}
- 本周周报文件名日期（周日）：{report_date}
- 必须将完整周报写入此确切路径（不要用 YYYY-MM-DD 占位符、不要改日期）：
  state/weekly/{report_date}-report.md
- 禁止写到 state/daily/、仓库根目录、或用运行日代替周日日期。

"""
print(header + base)
PY
)"

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
