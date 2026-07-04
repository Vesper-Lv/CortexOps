# AIhot API 嵌入 + 摘要 Provenance 修复实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复日报 `aihot_summary` / `display_summary` 字段语义污染，并将 AIhot 采集从 Web/HTML 抓取改为 **REST API 嵌入流程**（基于 [khazix-skills/aihot/SKILL.md](https://github.com/KKKKhazix/khazix-skills/blob/main/aihot/SKILL.md)），使 Codex/Cursor automation 在 `codex/source-layering-policy` 主 worktree 上稳定产出可审计的 JSONL + report。

**Architecture:** 所有 policy / schema / automation prompt 变更 **只在主 workflow 目录 + 分支 `codex/source-layering-policy` 上实施**（`/Users/jiexinlv/Documents/CortexOps`）；完成后 **merge 到 `codex/web-workbench`** 并 push GitHub，再按 `automations/SYNC-CHECKLIST.md` 同步 live Codex/Cursor。AIhot 层用 `curl /api/public/items?mode=selected` + 浏览器 UA 拉 JSON；CortexOps 层继续负责去重、候选池、阅读包、五段式 report。不安装 Skill 插件作 automation 触发器，只嵌入其 API 工作流。

**Tech Stack:** Git worktree、`docs/change-protocol.md`、TOML automation、`curl`+`jq`、AIhot Public API、`~/.codex/config.toml` network_access

---

## 零、背景与已完成的基线

### 0.1 7/4 诊断结论（必须写进 policy）

| 现象 | 根因 |
|------|------|
| `AIhot rows: 0` 但 `aggregator: 10` | 未走 AIhot API；agent 用 ai-bot.cn 冒充 aggregator |
| `aihot_id: None` 且 `aihot_summary` 有值 | **字段语义污染** |
| `source_url` 全是列表页 | source_url 用法错误 |
| 裸 `curl aihot.virxact.com` → SSL_ERROR_SYSCALL | 缺浏览器 UA；应调 `/api/public/*` |
| GitHub/arXiv curl 200 | Codex sandbox 网络已通 |

### 0.2 已在 `codex/source-layering-policy` 合并（PR #12）

- `display_summary` / `read_reason` / `known_facts` 等呈现字段（commit 链 `bf8bf6b` → `aba39ec`）
- prompt 仓库相对路径（`03f997b`）
- `automations/SYNC-CHECKLIST.md`、`automations/README.md` worktree 规则（`ef737c9`）

### 0.3 本计划新增范围（尚未实现）

- `docs/aihot-api.md` — API 采集契约 + CortexOps 字段映射
- `aihot_summary_status` / `discovery_summary` schema
- `aihot_id` ↔ `aihot_summary` 硬门禁 + AIhot API 嵌入 prompt
- AIhot 不可用 / fallback 强制披露
- 非 AIhot `display_summary` 最小信息量
- 可选 `state/daily/YYYY-MM-DD-aihot-raw.json` 审计缓存
- 同步到 web-workbench + GitHub + live runners

### 0.4 分支 / 目录优先级（强制）

```text
实施顺序：
  1) 主 worktree: /Users/jiexinlv/Documents/CortexOps
     分支: codex/source-layering-policy   ← 唯一编辑分支
  2) push origin/codex/source-layering-policy
  3) web worktree merge → codex/web-workbench
  4) automations/SYNC-CHECKLIST.md → Codex + Cursor live
```

**禁止**只在 `codex/web-workbench` 或 Cursor Cloud worktree 改 `docs/` / `automations/` 而不回主分支。

---

## 一、Change Request（change-protocol §3）

```md
## Change Intent
下一次日报 run 后：AIhot 条目必须有 aihot_id + API summary provenance；
禁止 ai-bot.cn 等内容写入 aihot_summary；AIhot 采集走 REST API；
API 失败时在 report 明确披露，不伪造 aggregator 条目。

## Target Output Contract
- state/daily/YYYY-MM-DD-links.jsonl
- state/daily/YYYY-MM-DD-report.md
- 可选 state/daily/YYYY-MM-DD-aihot-raw.json

## Required Signal Fields
aihot_summary_status (verified | missing | not_applicable)
discovery_summary (非 AIhot 聚合器 verbatim 摘要，可选)
既有：display_summary, aihot_summary, aihot_id, source_url, source_mix_note

## Policy Changes
- aihot_summary 仅允许来自 AIhot API 的 summary 字段（verbatim）
- 无 aihot_id 禁止填 aihot_summary
- 禁止「AIhot 摘要称…」措辞除非 aihot_summary_status=verified
- AIhot API 不可用必须披露；禁止 ai-bot.cn 假 AIhot
- 非 AIhot display_summary 至少 2 个可核验事实点

## Automation Binding
- automations/ai-pm.toml（主 prompt）
- ~/.codex/automations/ai-pm.toml（live）
- Cursor Automation AI 日报 prompt（live）
```

---

## 二、文件清单

| 文件 | 操作 | 类别 |
|------|------|------|
| `docs/aihot-api.md` | **Create** | API 契约 + 映射 + UA + 端点选择 |
| `docs/ingestion-normalization.md` | Modify §4, §4.1, §4.2 | Schema + gates |
| `docs/source-policy.md` | Modify §9, §12 | Policy |
| `docs/change-protocol.md` | Modify linkage matrix 一行 | 文档 |
| `automations/ai-pm.toml` | Modify prompt | Output + automation binding |
| `automations/README.md` | Append AIhot API 说明 | 文档 |
| `automations/SYNC-CHECKLIST.md` | Fix tomllib 命令 + AIhot 验证步骤 | 文档 |
| `state/README.md` | 可选追加 aihot-raw.json 说明 | 文档 |

**不改：** `src/`（Web App）、pools 历史数据（除非验收 run 产生新 state）

---

## Task 0: 主 worktree 对齐（实施前）

**Files:** 本地主目录（无 repo 文件变更）

- [ ] **Step 1: 进入主 worktree**

```bash
cd /Users/jiexinlv/Documents/CortexOps
git checkout codex/source-layering-policy
git pull origin codex/source-layering-policy
```

Expected: `HEAD` 在 `aba39ec` 或更新；含 `automations/SYNC-CHECKLIST.md`。

- [ ] **Step 2: 创建实施分支（从 source-layering-policy）**

```bash
git checkout -b cursor/aihot-api-summary-impl-314f
```

- [ ] **Step 3: 确认 Codex 网络**

`~/.codex/config.toml` 含：

```toml
[sandbox_workspace_write]
network_access = true
```

- [ ] **Step 4: 预检 AIhot API（本机 Terminal）**

```bash
UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
since=$(date -u -v-24H +%Y-%m-%dT%H:%M:%SZ)
curl -sS -H "User-Agent: $UA" \
  "https://aihot.virxact.com/api/public/items?mode=selected&since=${since}&take=3" \
  | python3 -m json.tool | head -40
```

Expected: JSON 含 `items[].id`, `items[].summary`, `items[].url`；非 SSL 错误。

---

## Task 1: 创建 `docs/aihot-api.md`

**Files:**
- Create: `docs/aihot-api.md`

- [ ] **Step 1: 写入 API 契约文档**

创建 `docs/aihot-api.md`，内容如下（完整写入，非摘要）：

```markdown
# AIhot Public API — CortexOps 采集契约

CortexOps 日报 automation 通过 AIhot REST API 获取 daily_discovery 主清单。
参考上游 Skill：https://github.com/KKKKhazix/khazix-skills/blob/main/aihot/SKILL.md

## 端点选择（CortexOps 默认）

日报 automation **默认不用** `/api/public/daily`（UTC 日切片成品）。
使用滚动窗口精选池：

```text
GET /api/public/items?mode=selected&since=<ISO8601 UTC>&take=50
```

`since` 默认：Asia/Shanghai 运行时「过去 24 小时」对应的 UTC ISO8601。
需要更多条目时用 `cursor` 翻页，串行请求，遵守 600 req/min。

## 强制 User-Agent

`/api/public/*` 必须带浏览器 UA，裸 curl 会被拒绝：

```bash
UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
curl -sS -H "User-Agent: $UA" "https://aihot.virxact.com/api/public/items?mode=selected&take=5"
```

## API → CortexOps JSONL 映射

| API 字段 | JSONL 字段 | 规则 |
|----------|------------|------|
| `id` | `aihot_id` | 必填（AIhot 条目） |
| `summary` | `aihot_summary` | verbatim，禁止 agent 改写/压缩 |
| `summary` | `display_summary` | AIhot 条目与 aihot_summary 相同 |
| `url` | `original_url` | 一手来源 |
| `https://aihot.virxact.com/items/{id}` | `source_url` | AIhot item 页 |
| `source` | `source_name` | 如 OpenAI Blog |
| `category` | 内部 category 参考 | ai-models / ai-products / industry / paper / tip |
| `publishedAt` | `published_at` | ISO8601 |
| — | `source_origin` | `aggregator` |
| — | `source_role` | `daily_discovery` |
| — | `aihot_summary_status` | `verified` |

## 禁止行为

- 禁止裸 curl `https://aihot.virxact.com` 首页代替 API
- 禁止用 ai-bot.cn 或其他聚合站内容填入 `aihot_summary`
- 禁止无 `aihot_id` 时填写 `aihot_summary`
- 禁止在摘要中写「AIhot 摘要称…」除非 `aihot_summary_status=verified`

## API 不可用时的 fallback

1. report 必须披露：「AIhot API 不可用，今日未生成 AIhot 长清单」
2. 可用 Web/Chrome 或 GitHub/arXiv 补充，但不得伪造 AIhot 字段
3. 补充条目标 `source_origin: primary` 或 `community_index`，`aihot_summary` 为空

## 可选审计文件

`state/daily/YYYY-MM-DD-aihot-raw.json` — 保存 API 响应原文，便于 provenance 审计。
```

- [ ] **Step 2: Commit**

```bash
git add docs/aihot-api.md
git commit -m "docs: add AIhot public API contract for CortexOps daily radar"
```

---

## Task 2: 更新 Schema（`docs/ingestion-normalization.md`）

**Files:**
- Modify: `docs/ingestion-normalization.md`

- [ ] **Step 1: §4 字段清单追加**

在标准 signal schema 字段块追加：

```text
aihot_summary_status
discovery_summary
```

- [ ] **Step 2: §4 Field Values 追加定义**

在 `known_facts` / `open_questions` 定义之后追加：

```markdown
`aihot_summary_status`:

- `verified`: `aihot_id` present, `source_url` is AIhot item page, and
  `aihot_summary` was copied verbatim from AIhot API `summary`.
- `missing`: AIhot-sourced item expected but API summary unavailable; keep
  `aihot_summary` empty.
- `not_applicable`: non-AIhot item; `aihot_summary` must remain empty.

`discovery_summary`:

Verbatim or extracted summary from a non-AIhot discovery source (e.g. GitHub
changelog entry, arXiv abstract). Never store this in `aihot_summary`.
```

- [ ] **Step 3: 强化 `aihot_summary` 规则**

在 AIhot Discovery Item Rules 段追加：

```markdown
- `aihot_summary` MUST come only from AIhot Public API field `summary` or the
  AIhot item page summary block when API is unavailable. Never store agent-
  compressed one-liners, ai-bot.cn text, or codex judgment in `aihot_summary`.
- If `aihot_id` is absent, `aihot_summary` MUST be empty and
  `aihot_summary_status` MUST be `not_applicable`.
```

- [ ] **Step 4: §4.1 最小字段追加**

```text
aihot_id
aihot_summary_status
discovery_summary
published_at
```

- [ ] **Step 5: §4.2 新增 Gate 6 — AIhot Summary Provenance Gate**

```markdown
6. AIhot Summary Provenance Gate
   - For any row with `aihot_id` or AIhot item `source_url`:
     - `aihot_summary_status` must be `verified`
     - `aihot_summary` must be verbatim API `summary`
     - `display_summary` must equal `aihot_summary`
   - For rows without `aihot_id`:
     - `aihot_summary` must be empty
     - `aihot_summary_status` must be `not_applicable`
   - Reject rows where `aihot_summary` is non-empty but `aihot_id` is missing.
   - Reject rows where `source_url` is a list page (e.g. ai-bot.cn/daily-ai-news/)
     shared by multiple items.
```

- [ ] **Step 6: Commit**

```bash
git add docs/ingestion-normalization.md
git commit -m "docs(schema): add aihot provenance fields and AIhot summary gate"
```

---

## Task 3: 更新 Policy（`docs/source-policy.md`）

**Files:**
- Modify: `docs/source-policy.md`

- [ ] **Step 1: §9 追加规则 21–24**

在规则 20 之后、`The daily radar is the entry point` 之前追加：

```markdown
21. Collect AIhot daily_discovery items via the Public API documented in
    `docs/aihot-api.md`, not by scraping HTML list pages. Use
    `GET /api/public/items?mode=selected&since=<24h>&take=50` with browser UA.
22. `aihot_summary` is only for verbatim AIhot API `summary`. If the API cannot
    be reached, do not backfill with agent text or third-party aggregators into
    `aihot_summary`. Disclose API failure in the report.
23. Never label ai-bot.cn or other aggregators as AIhot. Do not reuse one list
    page URL as `source_url` for multiple items.
24. Non-AIhot `display_summary` must include at least two verifiable fact points
    or ~120+ characters of factual content; do not substitute a one-line codex
    judgment.
```

- [ ] **Step 2: §12 输出质量追加一条**

```markdown
- Verify AIhot provenance before writing JSONL: `aihot_id` + `verified` status
  for AIhot rows; empty `aihot_summary` otherwise.
```

- [ ] **Step 3: Commit**

```bash
git add docs/source-policy.md
git commit -m "docs(policy): require AIhot API collection and summary provenance"
```

---

## Task 4: 重写 `automations/ai-pm.toml` 采集段

**Files:**
- Modify: `automations/ai-pm.toml`

- [ ] **Step 1: 基础规则追加 aihot-api 引用**

在「基础规则」列表追加一行：

```text
- AIhot 采集契约优先遵循 docs/aihot-api.md（Public API + UA + 字段映射）。
```

- [ ] **Step 2: 替换/追加「AIhot API 采集（强制）」块**

在「采集与长清单规则」第 1 条之前插入：

```text
AIhot API 采集（强制，优先于任何 Web 抓取）：
0. 预检：带浏览器 UA 请求 AIhot API（见 docs/aihot-api.md）。预检失败则进入 fallback 模式并在 report 披露，禁止伪造 AIhot 条目。
1. 拉取精选池（默认路径，不是 /api/public/daily）：
   UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
   since=$(date -u -v-24H +%Y-%m-%dT%H:%M:%SZ)   # Asia/Shanghai 过去 24h 对应 UTC
   curl -sS -H "User-Agent: $UA" \
     "https://aihot.virxact.com/api/public/items?mode=selected&since=${since}&take=50"
2. 可选：将原始 JSON 保存到 state/daily/YYYY-MM-DD-aihot-raw.json 便于审计。
3. 字段映射（每条 AIhot item）：
   - aihot_id ← item.id
   - source_url ← https://aihot.virxact.com/items/{item.id}
   - original_url ← item.url
   - title ← item.title
   - aihot_summary ← item.summary（verbatim，禁止改写/压缩）
   - display_summary ← item.summary（同 aihot_summary）
   - aihot_summary_status ← verified
   - source_origin ← aggregator；source_role ← daily_discovery
4. 硬门禁（写入 JSONL 前自检）：
   - 无 aihot_id → aihot_summary 必须为空，aihot_summary_status=not_applicable
   - 有 aihot_id → aihot_summary 非空且来自 API summary；禁止自写一句压缩
   - 禁止用 ai-bot.cn 内容填入 aihot_summary；禁止 10 条共用同一列表 source_url
5. API 不可用 fallback：
   - report 必须写「AIhot API 不可用」及失败原因
   - 仅允许 GitHub/arXiv/官方等补充源；aihot_summary 全空
   - 目标 longlist 可低于 25，不得伪造 AIhot 凑数
```

- [ ] **Step 3: 更新 JSONL 字段清单说明**

将字段行改为包含：

```text
..., aihot_id, aihot_summary, aihot_summary_status, discovery_summary, display_summary, ...
```

并追加：

```text
其中：aihot_summary 仅 AIhot API verified 条目；discovery_summary 供非 AIhot 聚合页摘要；
display_summary：verified AIhot 条目等于 aihot_summary；非 AIhot 从 discovery_summary 或原文事实提取。
```

- [ ] **Step 4: 报告 §1 追加采集披露**

在「五段式日报」说明中追加：

```text
§1 开头必须包含一行采集状态：AIhot API 成功/失败、入库条数、Web 补充条数。
```

- [ ] **Step 5: 验证 TOML**

```bash
python3 -c 'import tomllib, pathlib; tomllib.loads(pathlib.Path("automations/ai-pm.toml").read_text()); print("ai-pm.toml ok")'
rg -n "aihot-api|aihot_summary_status|User-Agent" automations/ai-pm.toml docs
```

- [ ] **Step 6: Commit**

```bash
git add automations/ai-pm.toml
git commit -m "feat(automation): embed AIhot Public API workflow and summary provenance gates"
```

---

## Task 5: 更新 automation 文档

**Files:**
- Modify: `automations/README.md`, `automations/SYNC-CHECKLIST.md`, optional `state/README.md`

- [ ] **Step 1: README 追加 AIhot API 段落**

```markdown
## AIhot collection

Daily radar collects AIhot items via Public API (`docs/aihot-api.md`), not HTML
scraping. Requires Codex sandbox `network_access = true` and browser User-Agent
on `/api/public/*` requests.
```

- [ ] **Step 2: 修复 SYNC-CHECKLIST tomllib 命令**

将 Step 1 导出命令改为：

```bash
git show codex/source-layering-policy:automations/ai-pm.toml | \
  python3 -c "import sys,tomllib; print(tomllib.load(sys.stdin.buffer)['prompt'])"
```

- [ ] **Step 3: SYNC-CHECKLIST 追加 AIhot API 预检**

```bash
UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
curl -sS -H "User-Agent: $UA" "https://aihot.virxact.com/api/public/items?mode=selected&take=1" | python3 -c "import sys,json; d=json.load(sys.stdin); print('ok', len(d.get('items',[])))"
```

- [ ] **Step 4: Commit**

```bash
git add automations/README.md automations/SYNC-CHECKLIST.md
git commit -m "docs: document AIhot API collection and fix sync checklist export"
```

---

## Task 6: 主分支验证 + push GitHub

**Files:** 无新增

- [ ] **Step 1: change-protocol 验证**

```bash
python3 -c 'import tomllib, pathlib; [tomllib.loads(p.read_text()) for p in pathlib.Path("automations").glob("*.toml")]; print("all toml ok")'
rg -n "aihot_summary_status|docs/aihot-api" docs automations
```

Expected: `all toml ok`；rg 在 `docs/aihot-api.md`, `ingestion-normalization.md`, `source-policy.md`, `ai-pm.toml` 有命中。

- [ ] **Step 2: Push 实施分支并开 PR → source-layering-policy**

```bash
git push -u origin cursor/aihot-api-summary-impl-314f
gh pr create --base codex/source-layering-policy --head cursor/aihot-api-summary-impl-314f \
  --title "feat: AIhot API embedding and summary provenance gates" \
  --body "Implements docs/superpowers/plans/2026-07-04-aihot-api-and-summary-provenance.md"
```

- [ ] **Step 3: Merge PR 到 codex/source-layering-policy**

```bash
gh pr merge --merge
```

---

## Task 7: 同步 web-workbench + GitHub

**Files:** web worktree merge only

- [ ] **Step 1: web worktree merge**

```bash
cd /Users/jiexinlv/Documents/CortexOps.worktrees/web-workbench
git fetch origin
git merge origin/codex/source-layering-policy -m "chore: merge AIhot API and summary provenance from source-layering-policy"
git push origin codex/web-workbench
```

冲突规则：`docs/`, `automations/`, `state/README.md` → 取 source-layering-policy；`src/` → 保留 web-workbench。

- [ ] **Step 2: 确认 web-workbench 含新文件**

```bash
test -f docs/aihot-api.md && rg -n "aihot_summary_status" docs/ingestion-normalization.md
```

- [ ] **Step 3: 主 worktree 也 pull 最新 source-layering-policy**

```bash
cd /Users/jiexinlv/Documents/CortexOps
git checkout codex/source-layering-policy
git pull origin codex/source-layering-policy
```

---

## Task 8: 同步 live Codex + Cursor

**Files:** 仓库外 live runners

- [ ] **Step 1: 按 SYNC-CHECKLIST 同步**

```bash
cd /Users/jiexinlv/Documents/CortexOps
cp automations/ai-pm.toml ~/.codex/automations/ai-pm.toml
diff automations/ai-pm.toml ~/.codex/automations/ai-pm.toml && echo "Codex in sync"
git show codex/source-layering-policy:automations/ai-pm.toml | \
  python3 -c "import sys,tomllib; print(tomllib.load(sys.stdin.buffer)['prompt'])" | pbcopy
```

粘贴到 Cursor Automation → AI 日报；Environment：`Vesper-Lv/CortexOps` + `codex/source-layering-policy`。

---

## Task 9: 验收 run + JSONL 审计脚本

**Files:**
- Create: `state/daily/YYYY-MM-DD-aihot-raw.json`（run 时）
- Create: `state/daily/YYYY-MM-DD-links.jsonl`, `report.md`

- [ ] **Step 1: Codex Desktop Run Now**（主 worktree，network_access 已开）

- [ ] **Step 2: 运行 provenance 审计**

```bash
python3 <<'PY'
import json, pathlib, sys
p = sorted(pathlib.Path("state/daily").glob("*-links.jsonl"))[-1]
rows = [json.loads(l) for l in p.read_text().splitlines() if l.strip()]
aihot = [r for r in rows if r.get("aihot_id")]
bad1 = [r for r in rows if r.get("aihot_summary") and not r.get("aihot_id")]
bad2 = [r for r in aihot if r.get("aihot_summary_status") != "verified"]
bad3 = [r for r in aihot if r.get("display_summary") != r.get("aihot_summary")]
dup_url = {}
for r in rows:
    u = r.get("source_url") or ""
    dup_url[u] = dup_url.get(u, 0) + 1
list_pages = [u for u,c in dup_url.items() if c > 3 and "daily-ai-news" in u]
print("file:", p.name)
print("total:", len(rows), "aihot:", len(aihot))
print("aihot_summary without aihot_id:", len(bad1), "FAIL" if bad1 else "OK")
print("aihot not verified:", len(bad2), "FAIL" if bad2 else "OK")
print("display != aihot_summary:", len(bad3), "FAIL" if bad3 else "OK")
print("suspicious list source_url:", list_pages, "FAIL" if list_pages else "OK")
sys.exit(1 if (bad1 or bad2 or bad3 or list_pages) else 0)
PY
```

Expected: 全部 OK，exit 0；`aihot` count ≥ 10（目标 18–24）。

- [ ] **Step 3: 人工检查 report**

- §1 含 AIhot API 采集状态行
- 阅读包摘要为 AIhot 长摘要（非一句话）
- 无「AIhot 摘要称」误用
- knowledge_gap 仍为 known_facts + open_questions

- [ ] **Step 4: commit state（若需入库）**

```bash
git add state/daily/
git commit -m "chore: daily radar with AIhot API provenance"
git push origin codex/source-layering-policy
# web-workbench 再 merge 一次 state（可选）
```

---

## 三、API 端点选择备忘

| 场景 | 端点 | CortexOps 用法 |
|------|------|----------------|
| 日报 automation 默认 | `items?mode=selected&since=24h` | ✅ 主 longlist |
| 用户说「AIhot 日报」 | `/api/public/daily` | ❌ 不作唯一机器源 |
| 全量/次要条目 | `mode=all` | ❌ 默认不用 |
| 公众号 mp | 前端 `/mp` only | ❌ API 不含 |

---

## 四、Self-Review

| 需求 | Task |
|------|------|
| 摘要 provenance / 禁止污染 | Task 2, 3, 4 |
| AIhot API 嵌入 | Task 1, 4 |
| 主文件夹优先 | Task 0, 6 |
| 同步 web-workbench + GitHub | Task 7 |
| live Codex/Cursor | Task 8 |
| 验收 | Task 9 |

无 TBD / 占位符。

---

**Plan complete.** 保存路径：`docs/superpowers/plans/2026-07-04-aihot-api-and-summary-provenance.md`

**Two execution options:**

1. **Subagent-Driven (recommended)** — 按 Task 0→9 分派子 agent，每 task 后 review
2. **Inline Execution** — 本 session 连续执行，checkpoint 合并 PR

**Which approach?**
