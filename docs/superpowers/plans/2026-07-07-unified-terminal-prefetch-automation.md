# 统一 Terminal 预拉取 + Automation 日报方案

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 无论 **Codex** 还是 **Cursor Automation**，日报都走同一条稳定链路：**确定性预拉取 AIhot raw → strict ingest 门禁 → Automation 只读 raw 写 JSONL/report**。定时统一为 **每天 09:00 Asia/Shanghai**；解决「Cursor 云端直接 curl 失败」「Codex 本地沙箱无 DNS」「9 点电脑未开机」三类问题。

**Architecture:** 将日报拆成两层：

```text
Layer 1 — Fetch（确定性，可审计）
  Terminal（macOS 系统 shell）或 Cloud setup script
  → state/daily/YYYY-MM-DD-aihot-raw.json
  → state/daily/YYYY-MM-DD-ingest-manifest.json (ready=true)

Layer 2 — Analyze（Automation，Codex 或 Cursor 均可）
  Phase 0: verify-daily-ingest.py → fail closed
  Phase 1: 映射 raw → links.jsonl + report.md + memory/pools
  禁止在 Automation 内 curl AIhot（strict 模式）
```

**Tech Stack:** `scripts/daily-prefetch.sh`、`scripts/verify-daily-ingest.py`、`automations/ai-pm.toml`、`prompts/daily-ai-pm.md`、macOS `launchd`、Cursor Cloud `environment.json` setup、Codex `~/.codex/automations`

---

## 零、背景与问题陈述

### 0.1 已观察到的失败模式

| 场景 | 现象 | 根因 |
|------|------|------|
| Codex App shell | `scutil --dns` 无配置；所有域名 `curl (6)` | Seatbelt 沙箱拿不到 macOS/Clash DNS |
| Cursor Cloud Automation | 今日云端直接跑，AIhot API 获取失败 | 云端 egress/UA/域名策略或 agent 内 curl 不可靠 |
| 本地 `./scripts/codex-daily-prefetch.sh` | `zsh: no such file or directory` | **脚本在分支 `cursor/codex-terminal-prefetch-314f` / PR #21，本地主分支尚未 pull** |
| 8:30 cron + 9 点后开机 | Codex 补跑时网络仍可能失败 | 触发时机 ≠ DNS 修复；仍需 Layer 1 与 Layer 2 解耦 |

### 0.2 方案共识（用户与维护者已对齐）

**赞同**：无论 Cursor 还是 Codex，**都优先 Terminal（或等价确定性 fetch）预拉取**，Automation 只负责分析与落盘。理由：

1. **Provenance**：raw JSON 由 shell 写入，LLM 只映射，便于审计 `aihot_summary` verbatim。
2. **稳定性**：不依赖 Codex 沙箱 DNS，也不依赖 Cursor agent 内多轮 curl。
3. **A/B 公平**：同一 `*-aihot-raw.json` 可换模型跑多次对比。
4. **Fail closed**：`ready=false` 时不生成 report，避免 fallback 污染。

### 0.3 「9 点没开电脑」会怎样？

| Runner | 9:00 电脑关闭时 | 没有 Terminal prefetch 时 |
|--------|----------------|---------------------------|
| **Cursor Automation** | **仍会在云端按 cron 触发**（不依赖本机开机） | strict 下 `verify` 失败 → **应 fail closed**；或 resilient 下劣质 fallback |
| **Codex App cron** | **不会跑**；开机后可能补跑 | 同上，且 Codex shell DNS 可能仍失败 |

**结论：** 仅把 cron 改成 9:00 **不能**保证 prefetch。必须增加 **Fetch 触发器**（见 §二）：

- **本机在线**：`launchd` 8:55 跑 prefetch（或登录时补跑）
- **本机离线、Cursor 云端跑**：Cloud Agent **setup script** 在 VM 内跑同一 prefetch（云端有 DNS）
- **两者皆无**：Automation **必须失败并写 ingest-error**，不得静默 fallback

---

## 一、Change Request（change-protocol §3）

```md
## Change Intent
日报采集与推理解耦：Fetch 由 Terminal/setup script 完成；Codex 与 Cursor Automation 共用 strict ingest 门禁与同一 prompt 契约。定时改为 09:00 Asia/Shanghai。

## Target Output Contract
- state/daily/YYYY-MM-DD-aihot-raw.json（Fetch 层写入）
- state/daily/YYYY-MM-DD-ingest-manifest.json（ready 门禁）
- state/daily/YYYY-MM-DD-links.jsonl（Automation 层）
- state/daily/YYYY-MM-DD-report.md（Automation 层）

## Policy Changes
- strict 默认：Automation 禁止 curl AIhot；manifest ready=false 禁止写 report
- ingest manifest 记录 prefetch_host: terminal | cloud_setup
- 日报 §1 必须披露 ingest_mode、manifest_ready、prefetch_host、aihot_items

## Automation Bindings
- automations/ai-pm.toml（Codex）
- prompts/daily-ai-pm.md + Cursor Automation UI（Cursor）
- 两者 prompt 正文保持同步（npm run prompts:sync）

## Verification
- ./scripts/daily-prefetch.sh → exit 0 + manifest ready
- python3 scripts/verify-daily-ingest.py DATE → exit 0
- Codex/Cursor Run → links.jsonl 中 AIhot 行均有 aihot_id + verified summary
```

---

## 二、目标运行时序（09:00 Shanghai）

### 2.1 推荐：双通道 Fetch（本机 + 云端）

```text
08:55  [macOS launchd] daily-prefetch.sh（仅当 Mac 唤醒/已登录）
         → 写 raw + manifest 到本地 repo
         → 可选：git commit + push ingest 文件（见 Task 6 决策）

09:00  [Cursor Automation / Codex cron]
         → Cloud setup: 若 manifest 不存在或 stale，先跑 daily-prefetch.sh
         → verify-daily-ingest.py
         → 映射 raw → report

09:05  人工 / Web import 审核
```

### 2.2 Cursor 云端 setup 行为（关键）

Cursor Cloud Agent 启动前可配置 **setup script**（`environment.json` 或 Dashboard Environment）：

```bash
cd "$REPO_ROOT"
./scripts/daily-prefetch.sh || true   # 失败时由 verify 挡下
python3 scripts/verify-daily-ingest.py "$(TZ=Asia/Shanghai date +%Y-%m-%d)"
```

这样 **9 点 Mac 未开机** 时：

- Cursor Automation **仍会执行**
- Fetch 在 **云端 VM** 完成（通常有 DNS）
- 不依赖你本机 Terminal

若 Cloud egress 拦 `aihot.virxact.com`：在 Cursor Dashboard → Cloud Agents → Network 加入 allowlist。

### 2.3 Codex 路径（本机为主）

Codex **没有**与 Cursor 等价的默认可编程 cloud setup；推荐：

1. **手动/launchd prefetch** → Codex Run Now；或
2. Codex cron 设为 9:00，且 **launchd 8:55 prefetch** 作为前置条件；或
3. 长期：弃用 Codex cron，改「launchd prefetch + 短脚本唤起 Codex」——本计划 **Phase 1 不强制**。

---

## 三、文件与命名（Runner 无关）

| 当前（PR #21） | 目标名 | 说明 |
|----------------|--------|------|
| `scripts/codex-daily-prefetch.sh` | `scripts/daily-prefetch.sh` | 主入口；`codex-daily-prefetch.sh` 保留为 symlink 或薄包装 |
| `docs/codex-terminal-prefetch.md` | `docs/daily-ingest-prefetch.md` | Codex + Cursor 共用操作手册 |
| `automations/ai-pm.toml` | 同左 | `rrule` → `BYHOUR=9;BYMINUTE=0` |
| `prompts/daily-ai-pm.md` | 同左 | 与 toml prompt 同步 |

---

## 四、实现任务

### Task 0：合并基线并修复「本地 no such file」

**背景：** 用户本地 `codex/source-layering-policy` 尚无 `scripts/`，因 PR #21 未 merge。

- [ ] Merge PR #21（`cursor/codex-terminal-prefetch-314f`）→ `codex/source-layering-policy`
- [ ] 用户本地：

```bash
cd /Users/jiexinlv/Documents/CortexOps
git pull origin codex/source-layering-policy
ls -la scripts/daily-prefetch.sh   # 或 codex-daily-prefetch.sh（Task 1 前）
chmod +x scripts/*.sh
./scripts/daily-prefetch.sh
```

**验收：** 不再出现 `no such file`；manifest `ready: true`。

---

### Task 1：Runner 无关命名与入口统一

**Files:**
- Create: `scripts/daily-prefetch.sh`（自 `codex-daily-prefetch.sh` 改名）
- Modify: `scripts/codex-daily-prefetch.sh` → 调用 `daily-prefetch.sh` 的 one-liner 包装
- Modify: `docs/codex-terminal-prefetch.md` → `docs/daily-ingest-prefetch.md`
- Modify: `automations/SYNC-CHECKLIST.md`、`README.md` 链接

- [ ] `daily-prefetch.sh` 输出 `prefetch_host=terminal`；增加环境变量 `PREFETCH_HOST=cloud_setup` 供 Cloud setup 设置
- [ ] 帮助文本改为「Codex 与 Cursor 通用」
- [ ] `ai-pm-ingest-prefetch.sh` 错误信息中的脚本名改为 `daily-prefetch.sh`

**验收：**

```bash
./scripts/daily-prefetch.sh
./scripts/codex-daily-prefetch.sh   # 仍可用，exit 同 daily-prefetch
```

---

### Task 2：定时统一 09:00 + prompt 同步

**Files:**
- Modify: `automations/ai-pm.toml` — `rrule = "FREQ=DAILY;BYHOUR=9;BYMINUTE=0;BYSECOND=0"`
- Modify: `prompts/daily-ai-pm.md` — 与 toml 中 Phase 0/1 strict 段落一致
- Modify: Cursor Automation UI（人工）— schedule 09:00 Asia/Shanghai

- [ ] `automations/ai-pm.toml` Phase 0 引用 `scripts/daily-prefetch.sh`（非 codex- 前缀）
- [ ] `npm run prompts:sync`（在 web-workbench 或 CI）更新 PromptTemplate
- [ ] `cp automations/ai-pm.toml ~/.codex/automations/ai-pm.toml`

**验收：** `rg 'BYHOUR=9' automations/ai-pm.toml`；toml 与 `prompts/daily-ai-pm.md` 均含 `verify-daily-ingest`。

---

### Task 3：Cursor Cloud setup 集成 prefetch

**Files:**
- Create: `.cursor/environment.json` 或追加到现有 Cloud Environment 配置
- Create: `scripts/cloud-automation-setup.sh`
- Modify: `automations/README.md` — Cursor 日报前置步骤

**`scripts/cloud-automation-setup.sh` 草案：**

```bash
#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
export PREFETCH_HOST=cloud_setup
DATE="$(TZ=Asia/Shanghai date +%Y-%m-%d)"
./scripts/daily-prefetch.sh "$DATE"
python3 scripts/verify-daily-ingest.py "$DATE"
```

- [ ] 在 Cursor Dashboard → Cloud Agents → Environment 将 setup 指向上述脚本
- [ ] Network allowlist 加入：`aihot.virxact.com`、`api.github.com`、`export.arxiv.org`（若需补充源）
- [ ] Automation prompt 顶部加一句：「setup 已 prefetch 时直接 Phase 0 verify，禁止重复 curl AIhot」

**验收：** Cursor Automation Run Test（云端）在 **Mac 终端未开** 时仍能 `verify` 通过并生成 report（或明确 ingest-error）。

---

### Task 4：macOS launchd（本机在线时的 8:55 prefetch）

**Files:**
- Create: `scripts/install-daily-prefetch-launchd.sh`
- Create: `launchd/com.cortexops.daily-prefetch.plist.example`

- [ ] plist：`StartCalendarInterval` Hour=8 Minute=55；`WorkingDirectory` = CortexOps 路径
- [ ] `StandardOutPath` / `StandardErrorPath` → `state/daily/prefetch.log`
- [ ] 文档说明：笔记本合盖时 **不会** 执行；唤醒后可用 `RunAtLoad` 或登录钩子补跑

**验收：** 手动 `launchctl load` 后，`launchctl list | grep cortexops` 可见；到点生成 manifest。

---

### Task 5：Policy 与 ingest 契约文档

**Files:**
- Modify: `docs/ingestion-normalization.md` — §4.1 增加 Ingest Manifest 契约
- Modify: `docs/source-policy.md` — Daily strict ingest：Terminal/cloud_setup prefetch 优先
- Modify: `docs/aihot-api.md` — Automation 不得 curl；指向 `daily-prefetch.sh`

- [ ] Manifest 字段：`prefetch_host`、`prefetch_at`、`sources.aihot.required`
- [ ] 明确：`github`/`arxiv` probe 为 supplemental，`warn` 不阻断 `ready`

**验收：** `rg 'prefetch_host|daily-prefetch' docs/` 有命中。

---

### Task 6（可选）：prefetch 结果 push 到 Git 供纯云端消费

若希望 **Mac 8:55 prefetch 的 raw 被 9:00 云端 Automation 直接 pull**（避免云端重复拉）：

- [ ] launchd 成功后 `git add state/daily/*-aihot-raw.json state/daily/*-ingest-manifest.json && git commit && git push`
- [ ] Cursor Automation 绑分支后先 `git pull`
- [ ] `.gitignore` **不** 忽略 manifest/raw（或单独 `state/daily/ingest/` 跟踪目录）

**风险：** 仓库体积、并发写入。Phase 1 可 **不做**，依赖云端 setup 自行 prefetch。

---

### Task 7：验证清单

- [ ] `./scripts/daily-prefetch.sh` → exit 0
- [ ] `python3 scripts/verify-daily-ingest.py $(TZ=Asia/Shanghai date +%Y-%m-%d)` → exit 0
- [ ] Codex Run Now → `links.jsonl` 含 `aihot_summary_status: verified`
- [ ] Cursor Automation Run（云端，Mac 关闭）→ 同上或 ingest-error 明确
- [ ] manifest `ready=false` 时 Automation **不** 创建 `*-report.md`
- [ ] `python3 -c 'import tomllib; tomllib.loads(open("automations/ai-pm.toml").read())'`
- [ ] A/B：`./scripts/daily-prefetch.sh --ab` + `compare-daily-links.py`

---

## 五、操作速查（实施后）

### 5.1 每日手动（最稳）

```bash
cd /Users/jiexinlv/Documents/CortexOps
git pull
./scripts/daily-prefetch.sh
cp automations/ai-pm.toml ~/.codex/automations/ai-pm.toml   # Codex 用户
# Cursor：Automation 已绑 repo + setup script
# Codex App 或 Cursor Automation → Run
```

### 5.2 为何你之前 `no such file`

```bash
# 检查脚本是否存在
ls scripts/daily-prefetch.sh scripts/codex-daily-prefetch.sh

# 若不存在 → 未 pull 含 PR #21 的分支
git fetch origin
git checkout codex/source-layering-policy
git pull
# 或：git checkout cursor/codex-terminal-prefetch-314f
```

### 5.3 9:00 电脑未开时的预期

| 配置 | 结果 |
|------|------|
| 仅改 cron 9:00，无 launchd/setup | Cursor 云端可能 **无 raw** → strict **失败**（正确行为） |
| Cursor Cloud setup script | 云端 **自行 prefetch** → 可成功 |
| launchd 8:55 + 开机 | 本机 raw 就绪 → Codex/Cursor 均可消费 |
| resilient 模式 | 不推荐；会回到 fallback 老问题 |

---

## 六、风险与决策

| 风险 | 缓解 |
|------|------|
| Cursor Cloud 拦 AIhot 域名 | Dashboard network allowlist |
| Mac 长期关机 | 依赖 Cloud setup prefetch，不依赖本机 |
| 双端 prompt 漂移 | `prompts/daily-ai-pm.md` + `prompts:sync` + SYNC-CHECKLIST |
| API 额度 | prefetch 一次；Automation 少 curl，省 token |
| git 跟踪 raw 膨胀 | Task 6 可选；默认 gitignore runtime |

---

## 七、Recommended MVP Cut（本计划第一期）

**必做：** Task 0–3、5、7（merge 脚本、统一命名、9:00、Cursor setup、文档）

**选做：** Task 4 launchd、Task 6 git push ingest

**不做：** 回退 resilient 为默认；Automation 内 curl AIhot

---

## 八、Assumptions

- 主 worktree：`/Users/jiexinlv/Documents/CortexOps`，分支 `codex/source-layering-policy`
- 用户时区：Asia/Shanghai
- AIhot API 在 **系统 Terminal** 与 **Cursor Cloud VM** 可访问（需 UA）
- Codex App 本地 shell DNS **不可靠**；不假设修复
