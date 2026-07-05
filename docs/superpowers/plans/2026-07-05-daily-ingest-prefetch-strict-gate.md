# 日报 Terminal 预拉 + Strict 采集门禁 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 Codex 沙箱 DNS 不稳定时，通过 **Terminal 预拉 AIhot API（及 GitHub/arXiv 连通性探测）** 写入可审计 state 文件；测试阶段启用 **strict 模式**——任一必需源预拉失败则 **停止日报生成并报错**，禁止 silent Web fallback。

**Architecture:** 采集与生成解耦为两阶段：(1) `scripts/ai-pm-ingest-prefetch.sh` 在本机 Terminal 执行 curl，写入 `aihot-raw.json` + `ingest-manifest.json`；(2) Codex automation 只读 manifest/raw，通过 `scripts/verify-daily-ingest.py` 门禁后再映射 JSONL/report。strict 模式下 manifest `ready=false` 或文件缺失 → agent 必须 exit 1，**不得**写 `*-links.jsonl` / `*-report.md`。实施仅在 `codex/source-layering-policy`；完成后 merge `codex/web-workbench` 并按 `automations/SYNC-CHECKLIST.md` 同步 live runners。

**Tech Stack:** Bash、`curl`、`python3`（json/tomllib）、TOML automation prompt、现有 `docs/aihot-api.md` 契约

---

## 零、背景与动机

### 0.1 已确认问题（2026-07-05）

| 现象 | 根因 |
|------|------|
| Terminal curl → 200 | 本机网络 + Clash 规则正常 |
| Codex 沙箱 `dig`/`curl` → DNS 失败 | macOS Codex automation（`CODEX_CI=1`）子进程 DNS 不稳定 |
| `sandbox_mode=danger-full-access` 仍偶发失败 | 已知 automation 首跑 DNS 问题（openai/codex#16782） |
| Automation prompt 已 `in sync` | **不是** prompt 落后，是采集路径需外置 |

### 0.2 本计划改变的行为

| 之前 | 之后（strict 测试阶段） |
|------|-------------------------|
| Codex 内 curl 失败 → Web fallback + report 披露 | Terminal 预拉失败 → **不写 report**，写 `ingest-error` |
| `aihot-raw.json` 可选 | **必需**（strict 下） |
| SYNC-CHECKLIST 仅 Terminal 测 AIhot | 增加 **prefetch 脚本 + manifest 门禁** 为 Run 前必做 |
| fallback 允许 longlist 低于 25 | strict 下 **整 run 失败**，不产出半成品 |

### 0.3 分支 / 目录（强制）

```text
1) 主 worktree: /Users/jiexinlv/Documents/CortexOps
   分支: codex/source-layering-policy
2) push → merge codex/web-workbench
3) automations/SYNC-CHECKLIST.md → ~/.codex/automations + Cursor Automation
```

---

## 一、Change Request（change-protocol §3）

```md
## Change Intent
测试阶段日报必须基于 Terminal 预拉成功的 API 原文；预拉或门禁失败则停止生成，禁止 fallback 凑数。

## Target Output Contract（成功路径）
- state/daily/YYYY-MM-DD-ingest-manifest.json   （新增，采集门禁）
- state/daily/YYYY-MM-DD-aihot-raw.json         （必需，strict）
- state/daily/YYYY-MM-DD-links.jsonl
- state/daily/YYYY-MM-DD-report.md

## Target Output Contract（失败路径）
- state/daily/YYYY-MM-DD-ingest-error.json        （新增，机器可读）
- state/daily/YYYY-MM-DD-ingest-error.md          （新增，人可读）
- 不得创建或覆盖 links.jsonl / report.md

## Required Signal Fields（manifest）
ingest_mode, ready, prefetch_at, prefetch_host, sources.aihot|github|arxiv.{status,http_code,item_count?,raw_path?,error?}

## Policy Changes
- strict：AIhot raw 必需且 items≥min_items；GitHub/arXiv 探测 HTTP 200
- resilient（文档预留，本计划不默认启用）：允许 fallback + 披露

## Automation Binding
- scripts/ai-pm-ingest-prefetch.sh
- scripts/verify-daily-ingest.py
- automations/ai-pm.toml
- automations/SYNC-CHECKLIST.md
```

---

## 二、文件清单

| 文件 | 操作 | 类别 |
|------|------|------|
| `scripts/ai-pm-ingest-prefetch.sh` | **Create** | Terminal 预拉 |
| `scripts/verify-daily-ingest.py` | **Create** | 门禁校验 |
| `state/daily/.ingest-mode` | **Create** | 默认 `strict`（测试阶段） |
| `automations/ai-pm.toml` | Modify prompt | strict 门禁 + 只读 raw |
| `docs/aihot-api.md` | Modify | Terminal 预拉流程 |
| `docs/ingestion-normalization.md` | Modify §4.2 | Gate 7 Ingest Manifest Gate |
| `docs/source-policy.md` | Modify | strict/resilient 规则 |
| `automations/SYNC-CHECKLIST.md` | Modify | prefetch 为 Run 前必做 |
| `automations/README.md` | Modify | 两阶段采集说明 |
| `state/README.md` | Modify | manifest / error 文件 |
| `docs/change-protocol.md` | Modify linkage 一行 | 文档 |

**不改：** `src/`（Web App）

---

## Task 0: 主 worktree 对齐

**Files:** 本地（无 repo 变更）

- [ ] **Step 1: 进入主 worktree 并拉最新**

```bash
cd /Users/jiexinlv/Documents/CortexOps
git checkout codex/source-layering-policy
git pull origin codex/source-layering-policy
```

Expected: 含 `docs/aihot-api.md`、`automations/ai-pm.toml` AIhot API 版。

- [ ] **Step 2: 创建实施分支**

```bash
git checkout -b cursor/daily-ingest-prefetch-strict-314f
```

---

## Task 1: 创建 ingest 模式默认值

**Files:**
- Create: `state/daily/.ingest-mode`

- [ ] **Step 1: 写入默认 strict**

```text
strict
```

- [ ] **Step 2: Commit**

```bash
git add state/daily/.ingest-mode
git commit -m "chore(state): default daily ingest mode to strict for testing"
```

---

## Task 2: 创建 Terminal 预拉脚本

**Files:**
- Create: `scripts/ai-pm-ingest-prefetch.sh`

- [ ] **Step 1: 创建脚本**

```bash
mkdir -p scripts
```

写入 `scripts/ai-pm-ingest-prefetch.sh`：

```bash
#!/usr/bin/env bash
set -euo pipefail

# CortexOps daily ingest prefetch — run in macOS Terminal BEFORE Codex automation.
# Writes manifest + aihot raw JSON. Exits non-zero on strict failure.

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

DATE="${1:-$(TZ=Asia/Shanghai date +%Y-%m-%d)}"
MODE_FILE="state/daily/.ingest-mode"
MODE="strict"
if [[ -f "$MODE_FILE" ]]; then
  MODE="$(tr -d '[:space:]' < "$MODE_FILE")"
fi

MIN_AIHOT_ITEMS="${MIN_AIHOT_ITEMS:-1}"
MANIFEST="state/daily/${DATE}-ingest-manifest.json"
AIHOT_RAW="state/daily/${DATE}-aihot-raw.json"
ERR_JSON="state/daily/${DATE}-ingest-error.json"
ERR_MD="state/daily/${DATE}-ingest-error.md"

UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
PREFETCH_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

mkdir -p state/daily

# --- AIhot ---
AIHOT_STATUS="fail"
AIHOT_HTTP="000"
AIHOT_COUNT=0
AIHOT_ERR=""

if since=$(date -u -v-24H +%Y-%m-%dT%H:%M:%SZ 2>/dev/null); then
  :
else
  since=$(date -u -d '24 hours ago' +%Y-%m-%dT%H:%M:%SZ)
fi

AIHOT_URL="https://aihot.virxact.com/api/public/items?mode=selected&since=${since}&take=50"
AIHOT_HTTP=$(curl -4 -sS -o "$AIHOT_RAW" -w "%{http_code}" \
  -H "User-Agent: $UA" "$AIHOT_URL" || echo "000")

if [[ "$AIHOT_HTTP" == "200" ]]; then
  AIHOT_COUNT=$(python3 - "$AIHOT_RAW" <<'PY'
import json, sys
from pathlib import Path
p = Path(sys.argv[1])
try:
    d = json.loads(p.read_text())
    print(len(d.get("items", [])))
except Exception:
    print(0)
PY
)
  if [[ "$AIHOT_COUNT" -ge "$MIN_AIHOT_ITEMS" ]]; then
    AIHOT_STATUS="ok"
  else
    AIHOT_ERR="items count ${AIHOT_COUNT} < min ${MIN_AIHOT_ITEMS}"
  fi
else
  AIHOT_ERR="HTTP ${AIHOT_HTTP}"
  rm -f "$AIHOT_RAW"
fi

# --- GitHub probe ---
GITHUB_HTTP=$(curl -4 -sS -o /dev/null -w "%{http_code}" \
  "https://api.github.com/zen" || echo "000")
GITHUB_STATUS="ok"
[[ "$GITHUB_HTTP" == "200" ]] || GITHUB_STATUS="fail"

# --- arXiv probe ---
ARXIV_HTTP=$(curl -4 -sS -o /dev/null -w "%{http_code}" \
  "https://arxiv.org/list/cs.AI/recent?skip=0&show=1" || echo "000")
ARXIV_STATUS="ok"
[[ "$ARXIV_HTTP" == "200" ]] || ARXIV_STATUS="fail"

READY="true"
FAIL_REASONS=()
if [[ "$AIHOT_STATUS" != "ok" ]]; then
  READY="false"
  FAIL_REASONS+=("aihot: ${AIHOT_ERR:-unknown}")
fi
if [[ "$GITHUB_STATUS" != "ok" ]]; then
  READY="false"
  FAIL_REASONS+=("github: HTTP ${GITHUB_HTTP}")
fi
if [[ "$ARXIV_STATUS" != "ok" ]]; then
  READY="false"
  FAIL_REASONS+=("arxiv: HTTP ${ARXIV_HTTP}")
fi

python3 - <<PY
import json
from pathlib import Path

ready = "${READY}" == "true"
manifest = {
    "date": "${DATE}",
    "ingest_mode": "${MODE}",
    "ready": ready,
    "prefetch_at": "${PREFETCH_AT}",
    "prefetch_host": "terminal",
    "min_aihot_items": int("${MIN_AIHOT_ITEMS}"),
    "sources": {
        "aihot": {
            "status": "${AIHOT_STATUS}",
            "http_code": int("${AIHOT_HTTP}"),
            "item_count": int("${AIHOT_COUNT}"),
            "raw_path": "state/daily/${DATE}-aihot-raw.json",
            "error": "${AIHOT_ERR}" or None,
        },
        "github": {
            "status": "${GITHUB_STATUS}",
            "http_code": int("${GITHUB_HTTP}"),
        },
        "arxiv": {
            "status": "${ARXIV_STATUS}",
            "http_code": int("${ARXIV_HTTP}"),
        },
    },
}
Path("${MANIFEST}").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
PY

if [[ "$READY" != "true" ]]; then
  REASON_STR=$(printf '%s; ' "${FAIL_REASONS[@]}")
  python3 - <<PY
import json
from pathlib import Path
err = {
    "date": "${DATE}",
    "ingest_mode": "${MODE}",
    "ready": False,
    "reasons": [r.strip() for r in """${REASON_STR}""".split(";") if r.strip()],
    "action": "Fix network/Clash, re-run scripts/ai-pm-ingest-prefetch.sh, then retry Codex automation.",
}
Path("${ERR_JSON}").write_text(json.dumps(err, ensure_ascii=False, indent=2) + "\n")
md = """# Daily ingest failed (${DATE})

Mode: **${MODE}**

## Reasons
""" + "\n".join(f"- {r}" for r in err["reasons"]) + """

## Next steps
1. Run prefetch in Terminal: \`./scripts/ai-pm-ingest-prefetch.sh ${DATE}\`
2. Confirm \`state/daily/${DATE}-ingest-manifest.json\` has \`"ready": true\`
3. Re-run Codex daily automation

Do **not** generate report until manifest is ready.
"""
Path("${ERR_MD}").write_text(md)
PY
  echo "INGEST PREFETCH FAILED (${MODE}): ${REASON_STR}" >&2
  exit 1
fi

echo "INGEST PREFETCH OK: aihot_items=${AIHOT_COUNT} github=${GITHUB_HTTP} arxiv=${ARXIV_HTTP}"
echo "manifest: ${MANIFEST}"
exit 0
```

- [ ] **Step 2: 可执行权限**

```bash
chmod +x scripts/ai-pm-ingest-prefetch.sh
```

- [ ] **Step 3: 本地验证（Terminal）**

```bash
./scripts/ai-pm-ingest-prefetch.sh
echo exit:$?
cat state/daily/$(TZ=Asia/Shanghai date +%Y-%m-%d)-ingest-manifest.json | python3 -m json.tool | head -30
```

Expected: `exit:0`；manifest `"ready": true`；`aihot-raw.json` 含 `items` 数组。

- [ ] **Step 4: Commit**

```bash
git add scripts/ai-pm-ingest-prefetch.sh
git commit -m "feat(scripts): add Terminal daily ingest prefetch with manifest"
```

---

## Task 3: 创建门禁校验脚本

**Files:**
- Create: `scripts/verify-daily-ingest.py`

- [ ] **Step 1: 写入校验器**

```python
#!/usr/bin/env python3
"""Verify daily ingest manifest + aihot raw before report generation."""

from __future__ import annotations

import json
import sys
from pathlib import Path


def main() -> int:
    date = sys.argv[1] if len(sys.argv) > 1 else None
    root = Path(__file__).resolve().parents[1]
    daily = root / "state" / "daily"
    if date is None:
        mode_file = daily / ".ingest-mode"
        # default today Asia/Shanghai via env or UTC date fallback
        import os
        date = os.environ.get("CORTEXOPS_DATE")
        if not date:
            print("usage: verify-daily-ingest.py YYYY-MM-DD", file=sys.stderr)
            return 2

    mode = (daily / ".ingest-mode").read_text().strip() if (daily / ".ingest-mode").exists() else "strict"
    manifest_path = daily / f"{date}-ingest-manifest.json"
    raw_path = daily / f"{date}-aihot-raw.json"

    if not manifest_path.exists():
        print(f"FAIL: missing manifest {manifest_path}", file=sys.stderr)
        return 1

    manifest = json.loads(manifest_path.read_text())
    if manifest.get("ingest_mode") != mode:
        print(f"WARN: manifest mode {manifest.get('ingest_mode')} != .ingest-mode {mode}")

    if not manifest.get("ready"):
        print(f"FAIL: manifest ready=false for {date}", file=sys.stderr)
        return 1

    aihot = manifest.get("sources", {}).get("aihot", {})
    if aihot.get("status") != "ok":
        print(f"FAIL: aihot status={aihot.get('status')}", file=sys.stderr)
        return 1

    if not raw_path.exists():
        print(f"FAIL: missing raw {raw_path}", file=sys.stderr)
        return 1

    raw = json.loads(raw_path.read_text())
    items = raw.get("items", [])
    min_items = int(manifest.get("min_aihot_items", 1))
    if len(items) < min_items:
        print(f"FAIL: aihot items {len(items)} < min {min_items}", file=sys.stderr)
        return 1

    for src in ("github", "arxiv"):
        s = manifest.get("sources", {}).get(src, {})
        if s.get("status") != "ok":
            print(f"FAIL: {src} status={s.get('status')}", file=sys.stderr)
            return 1

    print(f"OK: ingest ready for {date} (aihot={len(items)} items, mode={mode})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
```

- [ ] **Step 2: 可执行权限 + 验证**

```bash
chmod +x scripts/verify-daily-ingest.py
./scripts/verify-daily-ingest.py $(TZ=Asia/Shanghai date +%Y-%m-%d)
echo exit:$?
```

Expected: `OK: ingest ready...`；`exit:0`

- [ ] **Step 3: Commit**

```bash
git add scripts/verify-daily-ingest.py
git commit -m "feat(scripts): add strict daily ingest manifest verifier"
```

---

## Task 4: 更新 `docs/aihot-api.md`

**Files:**
- Modify: `docs/aihot-api.md`

- [ ] **Step 1: 在「API 不可用时的 fallback」之前插入新节**

```markdown
## Terminal 预拉（Codex 沙箱 DNS 不稳定时）

当 Codex automation 内 curl/DNS 失败时，**不要**在 agent 内 Web 抓取冒充 API。先在 macOS Terminal 执行：

```bash
cd /path/to/CortexOps
./scripts/ai-pm-ingest-prefetch.sh
./scripts/verify-daily-ingest.py $(TZ=Asia/Shanghai date +%Y-%m-%d)
```

成功产物：
- `state/daily/YYYY-MM-DD-aihot-raw.json` — API 原文（mandatory in strict）
- `state/daily/YYYY-MM-DD-ingest-manifest.json` — 采集门禁（`ready: true` 才可生成日报）

Automation 必须从 raw JSON 映射字段；禁止绕过 manifest 直接 curl 或 Web fallback（strict 模式）。
```

- [ ] **Step 2: 修改 fallback 节首行**

将「API 不可用时的 fallback」改为：

```markdown
## API 不可用时的 fallback（仅 resilient 模式）

`state/daily/.ingest-mode` 为 `resilient` 时适用。默认测试阶段为 `strict`：预拉失败则 **停止日报**，见 ingest-error 文件。
```

- [ ] **Step 3: Commit**

```bash
git add docs/aihot-api.md
git commit -m "docs: add Terminal prefetch workflow and strict ingest mode"
```

---

## Task 5: 更新 schema / policy gates

**Files:**
- Modify: `docs/ingestion-normalization.md`（§4.2 追加 Gate 7）
- Modify: `docs/source-policy.md`（新增规则 25–26）

- [ ] **Step 1: Gate 7 — Ingest Manifest Gate（ingestion-normalization.md §4.2）**

```markdown
7. Ingest Manifest Gate（strict 模式强制）
   - 生成 `YYYY-MM-DD-links.jsonl` 或 `YYYY-MM-DD-report.md` 前必须存在：
     - `state/daily/YYYY-MM-DD-ingest-manifest.json` 且 `ready=true`
     - `state/daily/YYYY-MM-DD-aihot-raw.json` 且 `items.length >= min_aihot_items`
   - 运行 `scripts/verify-daily-ingest.py YYYY-MM-DD` 必须 exit 0
   - strict 下校验失败：只写 ingest-error，**禁止**写 links/report
   - AIhot 字段映射 **仅允许**来自 raw JSON 的 `items[]`，不得 agent 重写
```

- [ ] **Step 2: source-policy.md 规则 25–26**

```markdown
25. Daily radar strict ingest: run `scripts/ai-pm-ingest-prefetch.sh` in Terminal before Codex automation when sandbox DNS is unreliable. Do not generate daily outputs unless manifest `ready=true`.
26. In strict mode, forbid Web/HTML fallback for AIhot discovery. On ingest failure, emit ingest-error and stop; do not partially publish report.
```

- [ ] **Step 3: Commit**

```bash
git add docs/ingestion-normalization.md docs/source-policy.md
git commit -m "docs(policy): add strict ingest manifest gate and prefetch rules"
```

---

## Task 6: 重写 `automations/ai-pm.toml` 采集段

**Files:**
- Modify: `automations/ai-pm.toml`

- [ ] **Step 1: 在「AIhot API 采集」块之前插入 Phase 0**

在 prompt 的 `AIhot API 采集（强制）` 之前插入：

```text
Phase 0 — Ingest 门禁（strict，必须先于任何采集/写入）：
0. 读取 state/daily/.ingest-mode（默认 strict）。
1. 运行：python3 scripts/verify-daily-ingest.py <今日 YYYY-MM-DD>
   - exit 0 → 继续 Phase 1
   - exit 非 0 → **立即停止**：
     a. 若 manifest 不存在或 ready=false，读取 state/daily/YYYY-MM-DD-ingest-error.json（若存在）总结原因
     b. 写入/更新 state/daily/YYYY-MM-DD-ingest-error.md（人可读，说明需在 Terminal 运行 ./scripts/ai-pm-ingest-prefetch.sh）
     c. **不得**创建或覆盖 state/daily/YYYY-MM-DD-links.jsonl、state/daily/YYYY-MM-DD-report.md、pools 写入
     d. 向用户返回明确错误并 exit
2. strict 模式下 **禁止**在 Codex 内 curl AIhot/GitHub/arXiv 作为替代；不得 Web fallback 凑 longlist。
```

- [ ] **Step 2: 替换 AIhot 采集块 0–5 为 Phase 1（只读 raw）**

```text
Phase 1 — 从预拉 raw 映射 AIhot（禁止 sandbox curl）：
1. 读取 state/daily/YYYY-MM-DD-aihot-raw.json（manifest 已验证）。
2. 对 raw.items[] 逐条映射（见 docs/aihot-api.md）：
   - aihot_id, source_url, original_url, title, aihot_summary, display_summary
   - aihot_summary_status=verified, source_origin=aggregator, source_role=daily_discovery
3. 硬门禁不变（无 aihot_id 不得填 aihot_summary；禁止 ai-bot.cn）。
4. §1 采集状态行必须写：ingest_mode=strict, prefetch_host=terminal, aihot_items=N, manifest_ready=true。
5. GitHub/arXiv 补充：仅当 manifest.sources.github/arxiv 为 ok 时允许 curl 或 Web；若 Codex 内 curl 仍 DNS 失败，可仅用 AIhot longlist 继续，但须在 report 披露「GitHub/arXiv 沙箱补充 skipped」——不得伪造链接。
6. 删除原「API 不可用 fallback 凑 longlist」在 strict 下的适用性；fallback 整段仅在 ingest_mode=resilient 时生效（当前默认 strict）。
```

- [ ] **Step 3: 验证 TOML 语法**

```bash
python3 -c 'import tomllib, pathlib; tomllib.loads(pathlib.Path("automations/ai-pm.toml").read_text()); print("toml ok")'
```

Expected: `toml ok`

- [ ] **Step 4: Commit**

```bash
git add automations/ai-pm.toml
git commit -m "feat(automation): strict ingest gate and Terminal raw-only AIhot mapping"
```

---

## Task 7: 更新 SYNC-CHECKLIST / README / state README

**Files:**
- Modify: `automations/SYNC-CHECKLIST.md`
- Modify: `automations/README.md`
- Modify: `state/README.md`

- [ ] **Step 1: SYNC-CHECKLIST 在 §2 之前插入 §1.5 Prefetch（必做）**

```markdown
## 1.5 Terminal ingest prefetch (required in strict mode)

From main worktree, **before** Codex Run:

```bash
cd /Users/jiexinlv/Documents/CortexOps
./scripts/ai-pm-ingest-prefetch.sh
./scripts/verify-daily-ingest.py $(TZ=Asia/Shanghai date +%Y-%m-%d)
```

Expected: `INGEST PREFETCH OK` and verifier `OK: ingest ready`. If exit non-zero, **do not run** Codex automation.

Replace old §2 note: "If precheck fails, automation may enter fallback" → "In strict mode, fix prefetch first; no fallback report."
```

- [ ] **Step 2: README 追加两阶段采集段**

```markdown
## Two-phase daily ingest (strict testing)

1. Terminal: `scripts/ai-pm-ingest-prefetch.sh` → manifest + aihot-raw
2. Codex: automation reads manifest/raw only; fails closed if not ready

See `docs/aihot-api.md` and `state/daily/.ingest-mode`.
```

- [ ] **Step 3: state/README.md 追加 manifest / error**

```markdown
- `daily/YYYY-MM-DD-ingest-manifest.json`: prefetch gate (`ready` must be true before report)
- `daily/YYYY-MM-DD-ingest-error.json` / `.md`: written when strict prefetch fails
- `daily/.ingest-mode`: `strict` (default) or `resilient`
```

- [ ] **Step 4: Commit**

```bash
git add automations/SYNC-CHECKLIST.md automations/README.md state/README.md
git commit -m "docs: document strict prefetch workflow in sync checklist"
```

---

## Task 8: 验收（Task 9 风格）

**Files:**
- Create at run time: `state/daily/YYYY-MM-DD-*`

- [ ] **Step 1: 模拟失败路径**

```bash
# 临时破坏：移走 manifest
mv state/daily/$(TZ=Asia/Shanghai date +%Y-%m-%d)-ingest-manifest.json /tmp/manifest.bak 2>/dev/null || true
./scripts/verify-daily-ingest.py $(TZ=Asia/Shanghai date +%Y-%m-%d); echo exit:$?
mv /tmp/manifest.bak state/daily/$(TZ=Asia/Shanghai date +%Y-%m-%d)-ingest-manifest.json 2>/dev/null || true
```

Expected: verifier `exit:1`

- [ ] **Step 2: Codex Run（manifest ready 时）**

1. `./scripts/ai-pm-ingest-prefetch.sh`
2. `cp automations/ai-pm.toml ~/.codex/automations/ai-pm.toml`
3. Codex Run automation
4. 检查：

```bash
DATE=$(TZ=Asia/Shanghai date +%Y-%m-%d)
./scripts/verify-daily-ingest.py "$DATE"
python3 - <<PY
import json
from pathlib import Path
rows=[json.loads(l) for l in Path(f"state/daily/{DATE}-links.jsonl").read_text().splitlines() if l.strip()]
aihot=[r for r in rows if r.get("aihot_id")]
bad=[r for r in rows if r.get("aihot_summary") and not r.get("aihot_id")]
print("total", len(rows), "aihot", len(aihot), "bad", len(bad))
PY
```

Expected: links.jsonl 存在；aihot>0；bad=0；report §1 含 `manifest_ready=true`

- [ ] **Step 3: 模拟 Codex 无 manifest**

删除 manifest 后再 Run → 应只有 ingest-error，**无**新 report/links

- [ ] **Step 4: Push + PR**

```bash
git push -u origin cursor/daily-ingest-prefetch-strict-314f
gh pr create --base codex/source-layering-policy \
  --title "feat: strict Terminal prefetch gate for daily AIhot ingest" \
  --body "Implements docs/superpowers/plans/2026-07-05-daily-ingest-prefetch-strict-gate.md"
```

---

## Task 9: Merge web-workbench + live sync

- [ ] **Step 1: Merge to codex/web-workbench**（web worktree）

- [ ] **Step 2: 用户 live sync**

```bash
cp automations/ai-pm.toml ~/.codex/automations/ai-pm.toml
diff automations/ai-pm.toml ~/.codex/automations/ai-pm.toml && echo in sync
```

- [ ] **Step 3: 每日 Run 前固定命令**（可加入 cron/Shortcuts）

```bash
cd /Users/jiexinlv/Documents/CortexOps && \
  ./scripts/ai-pm-ingest-prefetch.sh && \
  ./scripts/verify-daily-ingest.py $(TZ=Asia/Shanghai date +%Y-%m-%d) && \
  open -a Codex
```

---

## 三、Self-Review（计划自检）

| 需求 | 任务 |
|------|------|
| Terminal 预拉 AIhot | Task 2 |
| GitHub/arXiv 探测 | Task 2 manifest |
| strict 失败停止、无 report | Task 2 exit 1 + Task 6 Phase 0 + Task 3 |
| 禁止 silent fallback | Task 4/5/6 |
| Automation 读 raw 不 curl | Task 6 Phase 1 |
| SYNC 流程更新 | Task 7 |
| 测试阶段默认 strict | Task 1 |
| resilient 预留 | Task 4/5 文档提及，不实现切换 UI |

**Placeholder 扫描：** 无 TBD；脚本为完整可粘贴版本。

---

## 四、用户日常操作（计划实施后）

```bash
# 每天 8:25（automation 8:30 前）
cd /Users/jiexinlv/Documents/CortexOps
git pull origin codex/source-layering-policy
./scripts/ai-pm-ingest-prefetch.sh
./scripts/verify-daily-ingest.py $(TZ=Asia/Shanghai date +%Y-%m-%d)
# exit 0 后再让 Codex 跑 AI 日报
```

Clash：保持规则模式 + AIhot DIRECT + GitHub/arXiv 代理（prefetch 在 Terminal 跑，不受 Codex 沙箱 DNS 影响）。

---

**Plan complete.** 保存路径：`docs/superpowers/plans/2026-07-05-daily-ingest-prefetch-strict-gate.md`

**Two execution options:**

1. **Subagent-Driven（推荐）** — 每 Task 派生子 agent，Task 间 review  
2. **Inline Execution** — 本会话按 Task 0→9 顺序实施，检查点验收

**Which approach?**
