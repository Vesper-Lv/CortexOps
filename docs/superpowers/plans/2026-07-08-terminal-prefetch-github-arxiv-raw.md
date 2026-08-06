# Terminal Prefetch 扩展：GitHub / arXiv raw + 禁止沙箱 curl

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将日报 Fetch 层从「仅 AIhot raw」扩展为 **AIhot + arXiv + GitHub 三路 Terminal raw**；Codex / Cursor Automation **一律禁止沙箱内外网 curl**，只读 prefetch 产物；解决「manifest 标 github/arxiv ok 但 Codex 沙箱 DNS 仍失败」的设计缺口。

**Architecture:** 在 PR #21 已落地的 Layer 1/2 分离上，补齐 supplemental 源的 raw 契约：

```text
Layer 1 — Fetch（macOS Terminal only）
  ai-pm-ingest-prefetch.sh
    → state/daily/YYYY-MM-DD-aihot-raw.json     (required, 已有)
    → state/daily/YYYY-MM-DD-arxiv-raw.xml      (supplemental, 新增)
    → state/daily/YYYY-MM-DD-github-raw.json    (supplemental, 新增)
    → state/daily/YYYY-MM-DD-ingest-manifest.json

Layer 2 — Analyze（Codex exec / Cursor Cloud）
  Phase 0: verify-daily-ingest.py
  Phase 1: 映射三路 raw → longlist（禁止 curl AIhot/GitHub/arXiv/任意外网）
  无 supplemental raw → skip + report 披露，不得伪造
```

**Tech Stack:** `scripts/ai-pm-ingest-prefetch.sh`、`scripts/verify-daily-ingest.py`、`scripts/cursor-push-ingest.sh`（新）、`automations/ai-pm.toml`、`prompts/daily-ai-pm.md`、`docs/aihot-api.md`（旁链新 doc）、`~/.codex/automations`、`~/.cortexops/cursor-webhook.env`

**Base branch:** `codex/source-layering-policy`（PR #21 已 merge）

---

## 零、问题陈述（2026-07-08 实测）

### 0.1 当前缺口

| 源 | Terminal prefetch 今天做了什么 | Automation 今天会做什么 | 结果 |
|----|-------------------------------|-------------------------|------|
| AIhot | 拉 API → `*-aihot-raw.json` | 读 raw | ✅ |
| GitHub | 仅 `curl api.github.com/zen` 探测 | manifest `ok` → Prompt 允许 curl | ❌ Codex 沙箱 DNS 失败 |
| arXiv | 仅 `export.arxiv.org` 探测 1 条 | 同上 | ❌ 同上 |

**根因：** `manifest.sources.github.status=ok` 表示 **Terminal 能连通**，不是 **已有 raw 可供读取**。Prompt 第 59 行仍写「manifest 为 ok 时允许 curl」，与 AIhot strict 策略不一致。

### 0.2 用户已对齐的共识

1. **GitHub / arXiv 应与 AIhot 同构**：在 Terminal 拉取，Automation 只读 raw。
2. **Codex 沙箱 DNS 不可修复为可靠默认**（Seatbelt；`network_access=true` 不保证）。
3. **Cursor 云端**同样不应依赖 agent 内 curl；Webhook 触发前需 push ingest（或专用 push 脚本）。
4. **A/B 测试**：同一套三路 raw，换模型对比；supplemental 缺失时允许 AIhot-only + 披露。

### 0.3 非目标（本期不做）

- 不在 Automation 内修复 DNS / Clash / Seatbelt
- 不把 GitHub Trending HTML 爬虫作为唯一数据源（易碎；仅作可选增强）
- 不强制 supplemental raw 阻断 `ready`（AIhot 仍 required；GitHub/arXiv 失败 → `skipped`，不 fail closed）
- 不自动 `git push` 日报 `links.jsonl` / `pools`（仍人工或另计划）

---

## 一、Change Request（change-protocol §3）

```md
## Change Intent
扩展 Terminal prefetch 写入 GitHub/arXiv raw；统一 Automation 禁止沙箱 curl 外网；修正 manifest 语义（connectivity probe vs raw_ready）。

## Target Output Contract
- state/daily/YYYY-MM-DD-aihot-raw.json（required）
- state/daily/YYYY-MM-DD-arxiv-raw.xml（supplemental, Atom XML）
- state/daily/YYYY-MM-DD-github-raw.json（supplemental, 结构化 JSON）
- state/daily/YYYY-MM-DD-ingest-manifest.json（含各源 raw_path、item_count、fetch_status）
- report §1 披露：aihot_items、arxiv_items、github_items、各 supplement 状态

## Policy Changes
- docs/source-policy.md：补充源改为 Terminal prefetch raw，Automation 禁止 curl
- automations/ai-pm.toml Phase 1：三路 raw 映射规则
- 删除「manifest github ok → 允许 curl」表述

## Automation Bindings
- automations/ai-pm.toml → ~/.codex/automations/ai-pm.toml（用户手动 cp）
- prompts/daily-ai-pm.md 同步
- Cursor Automation UI Prompt（用户手动粘贴）

## Verification
- ./scripts/codex-daily-prefetch.sh → aihot ok；arxiv/github ok 或 skipped
- python3 scripts/verify-daily-ingest.py DATE → exit 0（aihot 门禁）
- Codex exec → 无 curl 外网；report 披露 supplement 状态
- Cursor webhook + push ingest → Phase 0 通过
```

---

## 二、Manifest Schema v2

### 2.1 字段扩展

在现有 `sources.aihot` 旁，为 `github` / `arxiv` 增加与 aihot 对齐的字段：

```json
{
  "date": "2026-07-08",
  "ingest_mode": "strict",
  "ready": true,
  "prefetch_at": "2026-07-08T00:10:00Z",
  "prefetch_host": "terminal",
  "min_aihot_items": 1,
  "sources": {
    "aihot": {
      "required": true,
      "status": "ok",
      "http_code": 200,
      "item_count": 26,
      "raw_path": "state/daily/2026-07-08-aihot-raw.json",
      "error": null
    },
    "arxiv": {
      "required": false,
      "status": "ok",
      "http_code": 200,
      "item_count": 20,
      "raw_path": "state/daily/2026-07-08-arxiv-raw.xml",
      "fetch_mode": "export_api",
      "error": null
    },
    "github": {
      "required": false,
      "status": "ok",
      "http_code": 200,
      "item_count": 15,
      "raw_path": "state/daily/2026-07-08-github-raw.json",
      "fetch_mode": "search_api",
      "error": null
    }
  }
}
```

### 2.2 `status` 语义（修正）

| status | 含义 | Automation 行为 |
|--------|------|-----------------|
| `ok` | raw 文件存在且 `item_count >= 1` | 读 raw 映射 supplemental 条目 |
| `skipped` | Terminal fetch 失败或未配置 | **禁止 curl**；report 披露 skip |
| `warn` | **废弃用于 github/arxiv**（原 probe-only） | 改为 `skipped` 或 `ok`，不再表示「可 curl」 |

**Breaking change：** 旧 manifest 仅含 `http_code` 无 `raw_path` 时，verify 对 supplemental 视为 `skipped`（不阻断 ready）。

---

## 三、Fetch 契约

### 3.1 arXiv（Phase 1 必做，契约清晰）

**端点：**

```text
GET https://export.arxiv.org/api/query
  ?search_query=cat:cs.AI+OR+cat:cs.LG+OR+cat:cs.CL
  &sortBy=submittedDate
  &sortOrder=descending
  &max_results=20
```

**写入：** `state/daily/YYYY-MM-DD-arxiv-raw.xml`（响应原文）

**解析（Automation 或 prefetch 内可选预解析）：**

| arXiv 字段 | JSONL 字段 | 规则 |
|------------|------------|------|
| `<id>` | `original_url` | `https://arxiv.org/abs/{id}` |
| `<title>` | `title` | 去换行 |
| `<summary>` | `discovery_summary` | verbatim 或轻度 trim |
| — | `source_origin` | `primary` |
| — | `source_role` | `daily_discovery` |
| — | `aihot_id` | 空 |
| — | `aihot_summary` | 空 |
| — | `source_mix_note` | `arxiv_export_supplement` |

**失败：** `status=skipped`，`item_count=0`，不写 raw 或写空占位 `{ "skipped": true, "reason": "..." }`（二选一，实现时统一）。

### 3.2 GitHub（Phase 1 必做，MVP 契约）

**问题：** Trending 无稳定公开 API；未认证 Search API 限流 10 req/min。

**MVP 策略（推荐）：GitHub Search API + 可选 token**

```text
GET https://api.github.com/search/repositories
  ?q={query}+created:>{since_date}+pushed:>{since_date}
  &sort=stars
  &order=desc
  &per_page=15
```

默认 query（可配置）：

```text
(topic:agent OR topic:llm OR topic:mcp) stars:>50
```

**配置（新文件）：** `state/daily/github-prefetch.toml` 或 `config/github-prefetch.toml`：

```toml
[search]
query = "(topic:agent OR topic:llm OR topic:mcp) stars:>50"
per_page = 15
since_days = 7

# 可选：release 监视列表（第二数据源，后续 Task）
# [[watch_repos]]
# owner = "anthropics"
# repo = "anthropic-sdk-python"
```

**认证（可选，用户本机）：**

```bash
# ~/.cortexops/github-prefetch.env（gitignore）
GITHUB_TOKEN=ghp_...
```

无 token 时：仍尝试 Search；失败 → `github.status=skipped`（不阻断日报）。

**写入：** `state/daily/YYYY-MM-DD-github-raw.json`

```json
{
  "fetched_at": "ISO8601",
  "query": "...",
  "items": [
    {
      "full_name": "owner/repo",
      "html_url": "https://github.com/owner/repo",
      "description": "...",
      "stargazers_count": 123,
      "pushed_at": "ISO8601",
      "topics": ["agent", "mcp"]
    }
  ]
}
```

**JSONL 映射：**

| GitHub 字段 | JSONL | 规则 |
|-------------|-------|------|
| `html_url` | `original_url` | repo 主页 |
| `full_name` | `title` 候选 | 或 `description` 首行 |
| `description` | `discovery_summary` | 非空则 verbatim |
| — | `source_origin` | `primary` |
| — | `source_mix_note` | `github_search_supplement` |

### 3.3 GitHub Phase 2（选做）

- `watch_repos` release/changelog API 拉取
- 与 `pools/demo-replication.jsonl` 交叉去重
- Trending HTML 解析（仅当 Search 不够且用户明确要求）

---

## 四、脚本改动清单

### Task 1：扩展 `ai-pm-ingest-prefetch.sh`

**Files:**
- Modify: `scripts/ai-pm-ingest-prefetch.sh`
- Create: `config/github-prefetch.toml`（默认 query）
- Create: `scripts/github-prefetch.env.example`

**Steps:**
- [ ] 抽取共用 `curl_json` / `curl_save` 函数（UA、`-4`、HTTP code）
- [ ] 实现 arXiv fetch → `*-arxiv-raw.xml`；解析 `item_count`（entry 数）
- [ ] 实现 GitHub Search fetch → `*-github-raw.json`；读 `config/github-prefetch.toml`
- [ ] 可选 `source ~/.cortexops/github-prefetch.env` 注入 `GITHUB_TOKEN`
- [ ] 更新 manifest 写入逻辑：`raw_path`、`item_count`、`fetch_mode`；移除「probe ok = 可 curl」语义
- [ ] 终端输出一行摘要：`arxiv_items=N github_items=M`（skipped 时显式打印）
- [ ] AIhot 仍 required；arxiv/github 失败不 `exit 1`

**验收：**

```bash
./scripts/codex-daily-prefetch.sh
ls state/daily/$(TZ=Asia/Shanghai date +%Y-%m-%d)-{aihot-raw.json,arxiv-raw.xml,github-raw.json}
python3 -c "import json; m=json.load(open('state/daily/DATE-ingest-manifest.json')); print(m['sources']['arxiv'], m['sources']['github'])"
```

---

### Task 2：更新 `verify-daily-ingest.py`

**Files:**
- Modify: `scripts/verify-daily-ingest.py`

**Steps:**
- [ ] aihot 门禁不变（required）
- [ ] 对 arxiv/github：若 `status==ok`，断言 `raw_path` 文件存在且非空
- [ ] 若 `status==skipped`，打印 `WARN: arxiv skipped`（exit 0）
- [ ] 删除「probe http 200 即视为 supplemental 可用」的逻辑
- [ ] 输出：`OK: ingest ready ... aihot=N arxiv=M|skipped github=K|skipped`

**验收：**

```bash
python3 scripts/verify-daily-ingest.py $(TZ=Asia/Shanghai date +%Y-%m-%d)
echo $?
```

---

### Task 3：新增 `docs/supplemental-prefetch-api.md`

**Files:**
- Create: `docs/supplemental-prefetch-api.md`
- Modify: `docs/aihot-api.md`（链到 supplemental doc）
- Modify: `docs/source-policy.md`（§ AIhot API contract 旁增加 supplemental 说明）
- Modify: `docs/codex-terminal-prefetch.md`（三路 raw 表）

**内容：**
- arXiv / GitHub 端点、字段映射、禁止 Automation curl
- `GITHUB_TOKEN` 可选配置
- skip 披露模板

---

### Task 4：重写 Automation Prompt（strict 三路 raw）

**Files:**
- Modify: `automations/ai-pm.toml`
- Modify: `prompts/daily-ai-pm.md`（与 toml 对齐；去掉绝对路径 `/Users/...`）

**Prompt 变更要点：**

```text
Phase 0 — 不变（verify-daily-ingest.py）

Phase 1 — 映射（修订）
1. AIhot：读 *-aihot-raw.json（已有）
2. arXiv：仅当 manifest.sources.arxiv.status==ok 且 *-arxiv-raw.xml 存在 → 解析 Atom 补充 longlist
3. GitHub：仅当 manifest.sources.github.status==ok 且 *-github-raw.json 存在 → 映射 items[] 补充
4. **禁止**在 Codex/Cursor 内 curl 任何外网 URL（AIhot、GitHub、arXiv、官网、Trending）
5. supplemental 缺失 → longlist 可仅 AIhot；report §1 必须写：
   arxiv_supplement=ok|skipped
   github_supplement=ok|skipped
6. 删除原句：「manifest github/arxiv ok 时允许 curl」
```

**验收：**

```bash
python3 -c 'import tomllib; tomllib.loads(open("automations/ai-pm.toml").read())'
rg '禁止.*curl' automations/ai-pm.toml prompts/daily-ai-pm.md
rg '允许 curl' automations/ai-pm.toml  # 应无命中
```

---

### Task 5：Cursor push ingest 一键脚本

**Files:**
- Create: `scripts/cursor-push-ingest.sh`
- Modify: `scripts/daily-ingest-pipeline.sh`（`RUNNER=cursor` 时可选 `PUSH_INGEST=1`）
- Modify: `.gitignore` 注释说明 ingest push 时用 `git add -f`

**行为：**

```bash
# prefetch 成功后
git add -f state/daily/${DATE}-ingest-manifest.json \
           state/daily/${DATE}-aihot-raw.json \
           state/daily/${DATE}-arxiv-raw.xml \
           state/daily/${DATE}-github-raw.json
git commit -m "chore(ingest): daily prefetch ${DATE}" || true
git push origin codex/source-layering-policy
./scripts/cursor-trigger-daily.sh "${DATE}"
```

**验收：** Cursor Cloud Phase 0 能读到三路 raw（用户本机试跑）。

---

### Task 6：文档与 SYNC-CHECKLIST

**Files:**
- Modify: `automations/SYNC-CHECKLIST.md`
- Modify: `docs/daily-orchestration-cursor-codex.md`（GitHub/arXiv raw 段落）

**用户操作清单（写入 SYNC-CHECKLIST）：**

1. `git pull`
2. `./scripts/codex-daily-prefetch.sh`
3. `cp automations/ai-pm.toml ~/.codex/automations/ai-pm.toml`
4. Codex App：粘贴新 Prompt；关 cron
5. Cursor：粘贴新 Prompt；关 Schedule；Webhook only
6. 可选：`~/.cortexops/github-prefetch.env` 配置 `GITHUB_TOKEN`

---

### Task 7：测试与验收

- [ ] Mac Terminal：`./scripts/codex-daily-prefetch.sh` → 三路文件存在或 skipped 明确
- [ ] `verify-daily-ingest.py` → exit 0
- [ ] Codex `codex-daily-run.sh`：日志无 `curl https://api.github.com` / `export.arxiv`（可 grep log）
- [ ] report §1 含 supplement 状态
- [ ] A/B：同一 prefetch raw，两次 model，`compare-daily-links.py` 对比
- [ ] Cursor：`PUSH_INGEST=1 RUNNER=cursor ./scripts/daily-ingest-pipeline.sh` → webhook 200 → cloud run 成功

---

## 五、分工：Agent 改代码 vs 用户手动

| 项 | Agent（仓库 PR） | 用户（Mac / Dashboard） |
|----|------------------|-------------------------|
| prefetch 脚本扩展 | ✅ | 跑 `./scripts/codex-daily-prefetch.sh` |
| verify / manifest schema | ✅ | — |
| ai-pm.toml / prompts 同步 | ✅ | `cp` + Codex App 粘贴 Prompt |
| github-prefetch.toml 默认值 | ✅ | 可按需改 query |
| GITHUB_TOKEN | example 文件 | 写入 `~/.cortexops/github-prefetch.env` |
| Cursor webhook env | — | 已有 `~/.cortexops/cursor-webhook.env` |
| Cursor push ingest | ✅ 脚本 | 执行 `cursor-push-ingest.sh` 或 `PUSH_INGEST=1` |
| 关 Codex/Cursor cron | — | App / Dashboard |
| git push 日报 report | — | 仍手动（本期） |

---

## 六、风险与缓解

| 风险 | 缓解 |
|------|------|
| GitHub Search 无 token 限流 | optional token；失败 → skipped，AIhot-only |
| arXiv XML 解析差异 | raw 保留原文；Automation 用保守解析 |
| ingest push 撑大 repo | 仅 manifest+raw；`.gitignore` 默认忽略，push 用 `-f` 短命 commit |
| Prompt 双端漂移 | 同一 PR 改 toml + prompts/daily-ai-pm.md + SYNC-CHECKLIST |
| 旧 manifest 无 raw_path | verify 对 supplemental 宽松；仅 aihot 硬门禁 |

---

## 七、MVP Cut（第一期必做 vs 选做）

**必做（合并后即可用）：**
- Task 1 arXiv raw + manifest v2
- Task 1 GitHub Search MVP + manifest
- Task 2 verify 更新
- Task 4 Prompt 禁止 curl（**可先于 prefetch 扩展单独 merge，解今日 Codex 痛点**）
- Task 3 文档最小集

**选做（第二期）：**
- Task 5 cursor-push-ingest 自动化
- GitHub watch_repos releases
- `codex-daily-run.sh` 日志断言「零外网 curl」

**不做：**
- Automation 内 DNS 修复
- resilient 回退为默认

---

## 八、实施顺序（推荐）

```text
PR-A（快速缓解，可先发）
  → Task 4 only：Prompt 禁止 curl supplemental；允许 AIhot-only + 披露
  → 用户 cp toml + 粘贴 Codex/Cursor Prompt（今日可止血）

PR-B（完整方案）
  → Task 1 + 2 + 3 + 6 + 7
  → 用户 git pull + prefetch + 同步 Prompt

PR-C（Cursor 便利）
  → Task 5 push ingest 集成
```

---

## 九、操作速查（实施后）

### 9.1 Codex 每日

```bash
cd ~/Documents/CortexOps
git pull
./scripts/codex-daily-prefetch.sh
cp automations/ai-pm.toml ~/.codex/automations/ai-pm.toml
./scripts/codex-daily-run.sh
# 或 Codex App Run Now（Prompt 已同步）
```

### 9.2 Cursor 每日

```bash
./scripts/codex-daily-prefetch.sh
PUSH_INGEST=1 RUNNER=cursor ./scripts/daily-ingest-pipeline.sh
# 或：./scripts/cursor-push-ingest.sh && ./scripts/cursor-trigger-daily.sh
```

### 9.3 检查 supplemental 是否生效

```bash
DATE=$(TZ=Asia/Shanghai date +%Y-%m-%d)
python3 -c "import json; m=json.load(open(f'state/daily/{DATE}-ingest-manifest.json')); print(m['sources']['arxiv'], m['sources']['github'])"
rg 'arxiv_supplement|github_supplement' state/daily/${DATE}-report.md
```

---

## 十、相关文档

- 前置：`docs/superpowers/plans/2026-07-07-unified-terminal-prefetch-automation.md`（PR #21）
- 操作：`docs/codex-terminal-prefetch.md`
- Cursor：`docs/daily-orchestration-cursor-codex.md`
- 变更协议：`docs/change-protocol.md`
