#!/usr/bin/env bash
# Shared helpers for Codex CLI automation runners (weekly / monthly, no prefetch).

resolve_week_sunday() {
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

resolve_month_first() {
  if [[ -n "${1:-}" ]]; then
    echo "$1"
    return
  fi
  TZ=Asia/Shanghai date +%Y-%m-01
}

resolve_codex_bin() {
  local bin="${CODEX_BIN:-}"
  if [[ -n "$bin" ]]; then
    echo "$bin"
    return
  fi
  if command -v codex >/dev/null 2>&1; then
    command -v codex
  elif [[ -x "${HOME}/.local/bin/codex" ]]; then
    echo "${HOME}/.local/bin/codex"
  elif [[ -x "${HOME}/.npm-global/bin/codex" ]]; then
    echo "${HOME}/.npm-global/bin/codex"
  fi
}

log_automation() {
  local log_file="$1"
  shift
  echo "[$(date '+%Y-%m-%d %H:%M:%S %Z')] $*" | tee -a "$log_file"
}

build_prompt_with_header() {
  local run_date="$1"
  local report_date="$2"
  local target_rel="$3"
  local toml_path="$4"

  RUN_DATE="$run_date" REPORT_DATE="$report_date" TARGET_REL="$target_rel" TOML_PATH="$toml_path" python3 - <<'PY'
import os
import tomllib
from pathlib import Path

run_date = os.environ["RUN_DATE"]
report_date = os.environ["REPORT_DATE"]
target_rel = os.environ["TARGET_REL"]
toml_path = Path(os.environ["TOML_PATH"])
base = tomllib.loads(toml_path.read_text(encoding="utf-8"))["prompt"]
header = f"""【运行指令 — 优先于下文占位符】
- 运行日（Asia/Shanghai）：{run_date}
- 本报告文件名日期：{report_date}
- 必须将完整报告写入此确切路径（不要用 YYYY-MM-DD 占位符、不要改日期）：
  {target_rel}
- 禁止写到 state/daily/、仓库根目录、或用运行日代替上述日期。

"""
print(header + base)
PY
}

run_codex_automation() {
  local codex_bin="$1"
  local root="$2"
  local prompt="$3"
  local log_file="$4"

  set +e
  printf '%s' "$prompt" | "$codex_bin" -C "$root" exec \
    --sandbox workspace-write \
    --full-auto \
    --ephemeral \
    - >>"$log_file" 2>&1
  local code=$?
  set -e
  echo "$code"
}
