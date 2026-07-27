# 日报编排：Cursor vs Codex（修订）

针对你对统一方案的反馈，明确两条链路的 **可行实现** 与 **边界**。

---

## 一、Cursor：云端 setup 的真实含义与 AIhot 失败

### 你理解得对的一半

- **9 点没开电脑** → 本机 Terminal **无法** prefetch。
- **Cursor Automation 仍会在云端按时触发**（不依赖 Mac）。

### 需要修正的一半

原计划里「云端 setup 自己 curl AIhot/GitHub/arXiv」**不是可靠默认**——你今天的实测（云端 AIhot 失败）说明：

| 假设 | 现实 |
|------|------|
| 云端 DNS 一定通 | 通常比 Codex 本机沙箱好，但 **不保证** |
| 云端一定能访问 AIhot | 可能被 **egress 白名单、UA、WAF** 拦 |
| 应让 Automation 自己拉三路源 | 与 Codex 一样会 **不稳定 + 难审计** |

### 修订后的 Cursor 策略（推荐）

```text
strict 门禁不变：Automation 禁止 curl AIhot，只读 manifest + raw

路径 A（Mac 9 点前在线）— 最稳
  08:55 launchd → daily-prefetch.sh
  → 可选 git push manifest+raw
  09:00 Cursor Automation → verify → 写 report

路径 B（Mac 9 点后/全天离线）— 不假装成功
  09:00 Cursor Automation → verify 失败 → ingest-error（fail closed）
  用户开机后 → Terminal prefetch → 手动 Re-run Automation

路径 C（仅当修好云端网络后）— 可选
  Cloud setup 跑 daily-prefetch.sh（与 Mac 同一脚本）
  Dashboard 白名单：aihot.virxact.com
  仍须 verify；失败则 fail closed
```

**结论：** Cursor 不应默认「云端自己拉 AIhot」。应与 Codex 一样：**Terminal prefetch 成功后再触发云端执行**。

### 修订后的 Cursor 策略（与 Codex 对齐）— **可行**

Cursor Automation 支持 **Webhook** 与 **Push to branch** 触发（[官方文档](https://cursor.com/docs/cloud-agent/automations)），**不要**再用「仅 9:00 cron + 云端自己 curl」作为主路径。

```text
推荐主路径（信号驱动，与 Codex 同构）

  Mac Terminal
    → daily-prefetch.sh（拉 AIhot raw + manifest ready）
    → verify-daily-ingest.py
    → cursor-trigger-daily.sh（POST Webhook）
         ↓
  Cursor Cloud Automation（Webhook 触发）
    → Phase 0 verify（双保险）
    → 只读 raw → links.jsonl + report.md
    → 禁止 curl AIhot

  ❌ 去掉：09:00 cron 单独触发且云端自己 fetch
  ✅ 保留：可选 cron 仅作「无 prefetch 则 fail closed」的告警（见下）
```

#### 触发方式对比

| 方式 | 可行性 | 说明 |
|------|--------|------|
| **Webhook（推荐）** | ✅ | prefetch 成功后 `curl POST`；与 Codex `codex exec` 等价 |
| **Git push 触发** | ✅ | prefetch 后 `git push` manifest+raw；Automation 绑「Push to branch」 |
| **9:00 cron 单独跑** | ⚠️ 不推荐 | 无 prefetch 时会云端拉 AIhot → 你已验证会失败 |
| **Cloud setup 自己 fetch** | ⚠️ 备选 | 仅修好 egress 白名单后启用 |

#### Webhook 配置步骤

1. [cursor.com/automations](https://cursor.com/automations) → 日报 Automation
2. **Triggers**：删除或禁用纯 Schedule；添加 **Webhook**
3. 绑定 repo：`Vesper-Lv/CortexOps` / `codex/source-layering-policy`
4. Prompt 使用 `prompts/daily-ai-pm.md`（Phase 0 strict，禁止 curl AIhot）
5. 保存后复制 Webhook URL + Generate auth header
6. 本机：

```bash
mkdir -p ~/.cortexops
cp scripts/cursor-webhook.env.example ~/.cortexops/cursor-webhook.env
chmod 600 ~/.cortexops/cursor-webhook.env
# 编辑填入 URL 和 token

# prefetch 成功后触发云端
./scripts/codex-daily-prefetch.sh
./scripts/cursor-trigger-daily.sh
```

或使用统一编排：

```bash
RUNNER=cursor ./scripts/daily-ingest-pipeline.sh
```

7. **launchd 9:00**：`RUNNER=cursor ./scripts/daily-ingest-pipeline.sh`（与 Codex 共用 prefetch）

#### Git push 触发（Webhook 不稳定时的备选）

> **Backlog：** 一键 `push ingest + webhook`（PR-C）见 `docs/backlog.md`，当前**搁置**；以下仍为手动流程。

社区有 Webhook 401 间歇问题；可改用：

```text
prefetch 成功
  → git add state/daily/active/YYYY-MM-DD-{ingest-manifest,aihot-raw}.json
  → git commit -m "chore(ingest): daily prefetch YYYY-MM-DD"
  → git push origin codex/source-layering-policy
  → Cursor Automation「Push to branch」触发
```

需在 `.gitignore` 中 **不再忽略** 这两类文件，或单独 `state/daily/ingest/` 目录跟踪。

#### 9 点没开电脑时

| 配置 | 9:00 行为 |
|------|-----------|
| **仅 Webhook，无 cron** | 云端 **不跑**；开机后 launchd `RunAtLoad` → prefetch → webhook → 云端跑 |
| cron + strict prompt | 9:00 可能空跑并 **verify 失败**（浪费额度，但不造假） |

**推荐：禁用 Schedule cron，只用 Webhook + launchd RunAtLoad。**

---

## 二、Codex：prefetch 成功后自动触发（你要的方案）

Codex App **没有**公开、稳定的「shell 脚本触发内置 Automation Run」API。可行的是：

### 方案 1（推荐）：`launchd` + `codex-daily-run.sh` + **Codex CLI `exec`**

一条命令链：

```text
prefetch → verify → 写 signal 文件 → codex exec（headless）
```

已实现：

| 文件 | 作用 |
|------|------|
| `scripts/codex-daily-run.sh` | Codex 编排：prefetch → `codex exec` |
| `scripts/cursor-trigger-daily.sh` | prefetch 成功后 POST Cursor Webhook |
| `scripts/daily-ingest-pipeline.sh` | 统一入口（RUNNER=cursor/codex/both） |
| `scripts/codex-daily-prefetch.sh` | 仅 prefetch（已有） |
| `state/daily/active/YYYY-MM-DD-ingest-ready.signal` | Terminal 成功后的「提示文件」 |
| `launchd/com.cortexops.daily-ai-pm.plist.example` | 09:00 + 登录时补跑 |
| `scripts/install-daily-launchd.sh` | 安装 launchd |

**安装 Codex CLI（你之前 `command not found`）：**

```bash
curl -fsSL https://chatgpt.com/codex/install.sh | sh
codex --version
```

**安装定时任务：**

```bash
cd /Users/jiexinlv/Documents/CortexOps
git pull   # 含上述脚本的分支
chmod +x scripts/*.sh
./scripts/install-daily-launchd.sh
```

**手动试跑：**

```bash
./scripts/codex-daily-run.sh
# 或只 prefetch、不触发 codex：
SKIP_CODEX=1 ./scripts/codex-daily-run.sh
```

**时序：**

| 场景 | 行为 |
|------|------|
| 9 点前已开机 | 09:00 launchd → prefetch → `codex exec` 写 report |
| 9 点后开机 | `RunAtLoad` → 若今日 report 不存在 → 同上 |
| 今日 report 已存在 | 跳过（`FORCE=1` 可强制重跑） |

**重要：关闭 Codex App 里同一 automation 的 cron**，否则会 **双跑**。改由 `launchd` 统一调度。

**为何 `codex exec` 比 App Run 更适合：**

- `workspace-write` 沙箱 **不需要网络**（strict 下只读 raw、写 JSONL）
- 绕过 App shell 的 DNS 问题
- prefetch 成功后可 **脚本直接衔接**，无需人工点 Run

### 方案 2（备选）：仅 prefetch，稍后补跑 CLI

```bash
SKIP_CODEX=1 ./scripts/codex-daily-run.sh
# 看 state/daily/active/YYYY-MM-DD-ingest-ready.signal
# 安装或配置 CODEX_BIN 后再运行 ./scripts/codex-daily-run.sh
```

适合暂时未装 CLI 或希望先确认 prefetch 产物时。

### 方案 3（不推荐）：AppleScript 点 Codex App

可模拟点击 Run，但 UI 变更即碎，不纳入正式方案。

### 方案 4：fswatch 监听 signal

`ingest-ready.signal` 出现 → 调 `codex exec`。与方案 1 等价但更复杂，不必做。

---

## 三、Codex 如何「检测成功抓取」？

三层信号，由强到弱：

1. **`verify-daily-ingest.py` exit 0** — `codex-daily-run.sh` 内建，失败不调用 `codex exec`
2. **`state/daily/active/YYYY-MM-DD-ingest-ready.signal`** — 人读或监控用
3. **`manifest.ready == true` + `*-aihot-raw.json` 存在** — Automation prompt Phase 0 再验一遍（双保险）

Codex App 若仍手动 Run，prompt 里 Phase 0 会先跑 verify；无 manifest 则 **拒绝写 report**。

---

## 四、与 Cursor 的分工（更新后）

| | Cursor | Codex |
|--|--------|-------|
| Fetch | Mac Terminal 或（修好网络后）Cloud setup | **仅 Mac Terminal** |
| Analyze | Cloud Automation（**Webhook 触发**） | **`codex exec` 或 App** |
| 9 点关机 | **不跑**（无 Webhook 信号） | launchd **不跑**；开机后 `RunAtLoad` 补跑 |
| 自动触发 | **Terminal → Webhook POST** | **launchd → codex exec** |

---

## 五、你本地下一步

```bash
cd /Users/jiexinlv/Documents/CortexOps
git fetch origin
git checkout cursor/codex-terminal-prefetch-314f
git pull

curl -fsSL https://chatgpt.com/codex/install.sh | sh

./scripts/codex-daily-run.sh          # 试跑全流程
./scripts/install-daily-launchd.sh    # 装 9:00 + 登录补跑

# Codex App：关闭「每日 AI PM」内置 cron
```

Cursor：今日 strict 下若云端无 raw，**应失败**；修好 Mac prefetch 或网络后再 Re-run。
