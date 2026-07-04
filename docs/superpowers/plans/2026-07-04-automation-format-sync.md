# Automation 输出格式跨 Worktree 同步实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 web-workbench 分支上已设计的「日报文本呈现修复」同步到 automation 实际运行的 `codex/source-layering-policy` 分支，并统一 Cursor / Codex 两套 automation 的 prompt 与 live 配置，使后续日报输出符合新格式契约。

**Architecture:** 以 `docs/change-protocol.md` 的默认编辑顺序为唯一变更路径；automation 内核（policy + schema + TOML snapshot）只在 `codex/source-layering-policy` 上维护；web-workbench 通过定期 merge/cherry-pick 消费这些变更，而不是反过来。格式改动已存在于远程分支 `origin/cursor/daily-report-text-presentation-a012`（commit `4e940e0`），本计划以 cherry-pick 为主、手工 diff 为辅，避免把 Web App 代码误带入 automation 分支。

**Tech Stack:** Git worktree、TOML automation snapshots、Codex Desktop live automations（`~/.codex/automations`）、Cursor Automations（Cloud Agent）

---

## 一、问题诊断（根因）

### 1.1 当前分支 / 目录职责（设计意图 vs 实际）

| 位置 | 分支 | 实际用途 | automation 是否读取 |
|------|------|----------|---------------------|
| `/Users/.../Documents/CortexOps` | `codex/source-layering-policy` | automation 内核 baseline | **是**（Codex cwd + Cursor branch） |
| `/Users/.../CortexOps.worktrees/web-workbench` | `codex/web-workbench` | Web App 开发 | **否**（除非 merge 回 baseline） |
| GitHub `Vesper-Lv/CortexOps` | Cursor 绑定 `codex/source-layering-policy` | Cloud Agent checkout | **是** |
| `~/.codex/automations/ai-pm.toml` | 仓库外 live 副本 | Codex Desktop 实际执行 | **是**（若未同步则仍用旧 prompt） |

### 1.2 格式改动在哪里、automation 在哪里跑

已确认的格式修复 commit（**尚未进入 automation 分支**）：

```text
4e940e0 feat(prompt): daily report per-link summary, knowledge_gap facts/questions, single dedup note, restrained P0
分支: origin/cursor/daily-report-text-presentation-a012
基于: 7dce647 (baseline)
```

该 commit 修改了 3 个 automation 内核文件（共 +69 / -7 行）：

| 文件 | 变更摘要 |
|------|----------|
| `docs/ingestion-normalization.md` | 新增 `display_summary`, `read_reason`, `focus_direction`, `known_facts`, `open_questions`；明确 `novelty_reason` 为去重唯一说明 |
| `docs/source-policy.md` | 新增规则 16–20：每条链接事实摘要、knowledge_gap 双段呈现、去重单一说明、P0 深度约束 |
| `automations/ai-pm.toml` | 更新 JSONL 字段清单、§2 阅读包 / §3 剩余链接渲染契约、质量要求 |

`codex/source-layering-policy` 与 `codex/web-workbench` 在 `docs/`、`automations/`、`state/`、`pools/` 上**当前无 diff**——说明格式改动只存在于 `cursor/daily-report-text-presentation-a012`，从未 merge 到任一长期分支。

### 1.3 导致的症状

- 日报仍出现旧格式：模板化「读的时候看 / 读完判断」、去重说明重复、剩余链接无摘要、浅页标 P0
- Web App 若已按新字段设计 importer/UI，读到的 JSONL 缺少 `display_summary` 等字段
- Cursor / Codex automation prompt 仍引用旧输出契约

### 1.4 附带问题：绝对路径 vs Cloud Agent

`automations/ai-pm.toml` 与 Cursor automation prompt 仍含 `/Users/jiexinlv/Documents/CortexOps/...` 绝对路径。Cloud Agent 在 Linux VM（`/workspace`）运行，**路径本身无效**（与格式无关，但会加剧「改了也不生效」的错觉）。同步时必须一并改为**仓库相对路径**。

---

## 二、目标状态（同步完成后）

```text
[cursor/daily-report-text-presentation-a012 的 3 文件改动]
        ↓ cherry-pick
[codex/source-layering-policy]  ← automation 唯一真相源
        ↓ push
[GitHub Vesper-Lv/CortexOps]
        ↓ 自动/手动
[Cursor Automation prompt] + [~/.codex/automations/ai-pm.toml]
        ↓ merge（仅 docs/automations/state/pools）
[codex/web-workbench]  ← Web App 可读新 schema
```

**Acceptance（change-protocol §6）：**

- [ ] `codex/source-layering-policy` 含 commit `4e940e0` 的全部 3 文件改动 + 相对路径 patch
- [ ] `python3 -c 'import tomllib...'` → `all toml ok`
- [ ] `rg -n "display_summary|novelty_reason|known_facts" docs automations` 有命中
- [ ] Cursor Automation 与 `automations/ai-pm.toml` prompt 内容一致（除 runner 特有说明）
- [ ] `~/.codex/automations` live 副本与 snapshot 一致
- [ ] 手动跑一次日报，`2026-07-0X-report.md` 符合「三、目标输出契约」（见 `docs/superpowers/plans/2026-07-03-daily-report-text-presentation.md` 或本计划附录）

---

## 三、长期治理规则（防止再次分叉）

写入 `docs/change-protocol.md` 附录或 `automations/README.md` 的 **Worktree Sync Rule**（Task 6）：

1. **凡改日报/周报格式、signal 字段、automation prompt** → 只在主 worktree + `codex/source-layering-policy` 上改
2. **Web App 只改 `src/`、`prisma/` 等** → 在 web-workbench worktree 上改
3. **web-workbench 需要新 schema 时** → `git merge origin/codex/source-layering-policy`（或 cherry-pick 特定 commit），不要只在 web-workbench 改 `docs/` / `automations/`
4. **每次改 `automations/ai-pm.toml` 后** → 同步三处：Git snapshot、Cursor Automation UI、`~/.codex/automations`

---

## Task 1: 在 automation 分支 cherry-pick 格式 commit

**Files:**
- Modify: `docs/ingestion-normalization.md`, `docs/source-policy.md`, `automations/ai-pm.toml`（via cherry-pick）

**前置：** 在主 worktree 操作，不在 web-workbench worktree。

- [ ] **Step 1: 切换到主 worktree 与 automation 分支**

```bash
cd /Users/jiexinlv/Documents/CortexOps
git fetch origin
git checkout codex/source-layering-policy
git pull origin codex/source-layering-policy
```

Expected: `On branch codex/source-layering-policy`, clean or only expected local changes.

- [ ] **Step 2: Cherry-pick 格式 commit**

```bash
git cherry-pick 4e940e0
```

Expected: 3 files changed, no conflicts.若冲突，用 `git show 4e940e0` 手工解决后 `git cherry-pick --continue`。

- [ ] **Step 3: 验证 diff 范围**

```bash
git diff HEAD~1 --stat
```

Expected: 仅 `docs/ingestion-normalization.md`, `docs/source-policy.md`, `automations/ai-pm.toml`。

- [ ] **Step 4: 运行 change-protocol 验证**

```bash
python3 -c 'import tomllib, pathlib; [tomllib.loads(p.read_text()) for p in pathlib.Path("automations").glob("*.toml")]; print("all toml ok")'
rg -n "display_summary|novelty_reason|known_facts|open_questions" docs automations
```

Expected: `all toml ok`；rg 在 3 个文件中有命中。

- [ ] **Step 5: Push automation 分支**

```bash
git push origin codex/source-layering-policy
```

- [ ] **Step 6: Commit message（若 cherry-pick 需 amend）**

```bash
git commit --amend -m "feat(prompt): sync daily report text presentation to automation branch"
```

---

## Task 2: 将 prompt 绝对路径改为仓库相对路径

**Files:**
- Modify: `automations/ai-pm.toml`（prompt 与 `cwds` 说明）

- [ ] **Step 1: 替换 prompt 内所有绝对路径**

在 `automations/ai-pm.toml` 的 `prompt = """..."""` 中，将：

```text
/Users/jiexinlv/Documents/CortexOps/docs/source-policy.md
/Users/jiexinlv/Documents/CortexOps/docs/ingestion-normalization.md
/Users/jiexinlv/Documents/CortexOps/docs/focus-policy.md
/Users/jiexinlv/Documents/CortexOps/state/memory/ai-pm-7d.jsonl
/Users/jiexinlv/Documents/CortexOps/state/daily/...
/Users/jiexinlv/Documents/CortexOps/pools/...
```

统一改为（相对于仓库根目录）：

```text
docs/source-policy.md
docs/ingestion-normalization.md
docs/focus-policy.md
state/memory/ai-pm-7d.jsonl
state/daily/YYYY-MM-DD-links.jsonl
state/daily/YYYY-MM-DD-report.md
pools/product-inspiration.jsonl
pools/paper-candidates.jsonl
pools/demo-replication.jsonl
pools/knowledge-gap.jsonl
pools/personal-work.jsonl
pools/archive.jsonl
```

- [ ] **Step 2: 在 prompt 顶部追加路径说明**

```text
所有文件路径均相对于仓库根目录（CortexOps 项目根）。不要使用 /Users/... 绝对路径。
运行时工作目录即为仓库根目录。
```

- [ ] **Step 3: 保留 `cwds` 供 Codex Desktop 本地使用**

`cwds = ["/Users/jiexinlv/Documents/CortexOps"]` 可保留（Codex Desktop 本地 runner 需要），但 prompt 正文不再引用该绝对路径。

- [ ] **Step 4: 验证 TOML**

```bash
python3 -c 'import tomllib; tomllib.loads(open("automations/ai-pm.toml","rb").read()); print("ai-pm.toml ok")'
rg -n "/Users/jiexinlv" automations/ai-pm.toml
```

Expected: `ai-pm.toml ok`；rg **无**命中（prompt 内已无绝对路径）。

- [ ] **Step 5: Commit**

```bash
git add automations/ai-pm.toml
git commit -m "fix(automation): use repo-relative paths in ai-pm prompt for cloud and local runners"
git push origin codex/source-layering-policy
```

---

## Task 3: 同步 Cursor Automation prompt

**Files:**
- Modify: Cursor UI → Automations → AI 日报 → Prompt（仓库外，无 Git 路径）
- Reference: `automations/ai-pm.toml`（同步后版本）

- [ ] **Step 1: 从 snapshot 导出 prompt**

```bash
cd /Users/jiexinlv/Documents/CortexOps
git show codex/source-layering-policy:automations/ai-pm.toml | \
  python3 -c "import sys,tomllib; print(tomllib.loads(sys.stdin.buffer.read())['prompt'])"
```

复制输出全文。

- [ ] **Step 2: 粘贴到 Cursor Automation**

Cursor → Automations → AI 日报 → Settings → Prompt：粘贴 Step 1 全文。

确认 Environment：

```text
Repository: Vesper-Lv/CortexOps
Branch: codex/source-layering-policy
```

- [ ] **Step 3: Run Test（非 08:00 高峰）**

若仍 `resource_exhausted`，见 Task 5 降级方案；格式同步与 BC 启动失败是独立问题。

- [ ] **Step 4: 记录同步日期**

在 Cursor Automation 描述或 `automations/README.md` 加一行：

```md
- Cursor AI 日报 prompt 最后与 snapshot 同步：YYYY-MM-DD（commit `<short-sha>`）
```

---

## Task 4: 同步 Codex Desktop live automation

**Files:**
- Modify: `~/.codex/automations/ai-pm.toml`（或等价 live 路径）

- [ ] **Step 1: Diff live vs snapshot**

```bash
diff automations/ai-pm.toml ~/.codex/automations/ai-pm.toml
```

- [ ] **Step 2: 覆盖 live 副本**

```bash
cp automations/ai-pm.toml ~/.codex/automations/ai-pm.toml
```

- [ ] **Step 3: 再次 diff 确认一致**

```bash
diff automations/ai-pm.toml ~/.codex/automations/ai-pm.toml && echo "in sync"
```

Expected: `in sync`

- [ ] **Step 4: 可选 — 开启 sandbox 网络（终端预检 AIhot 用）**

`~/.codex/config.toml`：

```toml
[sandbox_workspace_write]
network_access = true
```

---

## Task 5: 将 automation 内核 merge 到 web-workbench

**Files:**
- Merge into: `codex/web-workbench`（仅消费 `docs/`, `automations/`, `state/`, `pools/`）

**前置：** Task 1–2 已 push 到 `origin/codex/source-layering-policy`。

- [ ] **Step 1: 在 web-workbench worktree merge**

```bash
cd /Users/jiexinlv/Documents/CortexOps.worktrees/web-workbench
git fetch origin
git merge origin/codex/source-layering-policy -m "chore: merge automation kernel format sync from source-layering-policy"
```

Expected: 合并 `docs/` + `automations/` 更新；`src/` 无冲突。

- [ ] **Step 2: 解决冲突（若有）**

优先保留：
- `docs/`, `automations/` → 来自 `source-layering-policy`
- `src/`, `package.json` 等 → 来自 `web-workbench`

- [ ] **Step 3: Push web-workbench**

```bash
git push origin codex/web-workbench
```

- [ ] **Step 4: 确认 web-workbench 可读新字段**

```bash
rg -n "display_summary" docs/ingestion-normalization.md src/ || true
```

若 Phase 2 importer 尚未映射新字段，记入 deferred backlog，**不阻塞** automation 格式同步。

---

## Task 6: 文档化 Worktree Sync Rule

**Files:**
- Modify: `automations/README.md`
- Optional: `docs/change-protocol.md` §7 追加一小节

- [ ] **Step 1: 在 `automations/README.md` 追加**

```md
## Worktree and branch sync

- Automation kernel (`docs/`, `automations/`, `state/`, `pools/`) is maintained on branch `codex/source-layering-policy` in the main worktree.
- Web App code lives on `codex/web-workbench` in a separate worktree.
- Do not change daily report format or automation prompts only on `web-workbench`. Merge from `source-layering-policy` instead.
- After editing `automations/*.toml`, sync: (1) git push, (2) Cursor Automation prompt, (3) `~/.codex/automations` live copy.
```

- [ ] **Step 2: Commit on source-layering-policy 并 merge 到 web-workbench**

```bash
cd /Users/jiexinlv/Documents/CortexOps
git add automations/README.md
git commit -m "docs: add worktree sync rule for automation kernel"
git push origin codex/source-layering-policy
# 然后在 web-workbench worktree 再 merge 一次
```

---

## Task 7: 验收 — 跑一次日报并人工核对格式

**Files:**
- Create: `state/daily/YYYY-MM-DD-links.jsonl`, `state/daily/YYYY-MM-DD-report.md`

- [ ] **Step 1: 触发运行**

任选其一：Cursor Run Test、Codex Desktop Run Now、或 Cloud Agent 手动任务。

- [ ] **Step 2: 检查 JSONL 新字段**

```bash
python3 <<'PY'
import json, pathlib, sys
p = sorted(pathlib.Path("state/daily").glob("*-links.jsonl"))[-1]
rows = [json.loads(l) for l in p.read_text().splitlines() if l.strip()]
need = {"display_summary", "novelty_reason"}
missing = [r.get("id") for r in rows if not r.get("display_summary")]
print(p, "lines:", len(rows), "missing display_summary:", len(missing))
PY
```

Expected: `missing display_summary: 0`

- [ ] **Step 3: 人工核对 report 三节**

打开最新 `state/daily/*-report.md`，确认：

- §2 阅读包：有「摘要」；knowledge_gap 有「可获得的事实 + 需要额外研究的问题」；非 knowledge_gap 有 read_reason / focus_direction；**无**模板句「读的时候看 / 读完判断」
- §3 剩余链接：每条有摘要；**无**推荐理由；去重说明仅一行 `保留/去重说明：...`
- 无整段「候选池建议表」

- [ ] **Step 4: Commit 新 state（若在主 worktree 生成）**

```bash
git add state/daily/ state/memory/ pools/
git commit -m "chore: daily radar output with new text presentation format"
git push origin codex/source-layering-policy
```

然后在 web-workbench merge 最新 state（若需要 Web App 导入测试）。

---

## 附录 A：若 cherry-pick 失败时的手工 patch 清单

若 `4e940e0` 无法干净 cherry-pick，按顺序手工应用（完整 diff 见 `git show 4e940e0`）：

1. `docs/ingestion-normalization.md` — 字段 + novelty_reason 规则 + §4.1 最小字段
2. `docs/source-policy.md` — 规则 16–20 + §12 补充
3. `automations/ai-pm.toml` — prompt 输出契约（与 Task 2 相对路径合并为一次 commit）

---

## 附录 B：Cursor `resource_exhausted` 与格式同步的关系

| 问题 | 是否阻塞格式同步 |
|------|------------------|
| Background Composer 启动失败 | 阻塞 Cursor Run Test，**不阻塞** Git/Codex 侧同步 |
| Codex 终端 DNS 失败 | 不阻塞；Web 通道仍可出报 |
| prompt 仍为旧格式 | **阻塞**正确输出 — 本计划解决 |

格式同步完成后，若 Cursor 仍无法 Run Test，可暂用 **Codex Desktop** 或 **手动 Cloud Agent** 跑同一 prompt，直到 BC 容量恢复。

---

## 附录 C：相关已有计划

完整字段定义与前后对比示例见（在 `cursor/export-p0p1-fixes-7faa` 分支）：

`docs/superpowers/plans/2026-07-03-daily-report-text-presentation.md`

本计划是其在 **跨 worktree / 跨 runner 部署层面** 的补全，不重复字段语义定义。

---

## Self-Review（plan author checklist）

| 检查项 | 状态 |
|--------|------|
| Spec：格式改动进入 automation 分支 | Task 1 |
| Spec：Cursor + Codex live 同步 | Task 3–4 |
| Spec：web-workbench 消费新 schema | Task 5 |
| Spec：防止再次分叉 | Task 6 |
| Spec：相对路径 | Task 2 |
| Spec：验收 | Task 7 |
| 无 TBD / 占位符 | ✓ |

---

**Plan complete.** 保存路径：`docs/superpowers/plans/2026-07-04-automation-format-sync.md`

**Two execution options:**

1. **Subagent-Driven (recommended)** — 按 Task 1→7 分派子 agent，每 task 完成后 review
2. **Inline Execution** — 在本会话按 checkpoint 连续执行（主 worktree 操作需用户在本地配合）

**Which approach?**
