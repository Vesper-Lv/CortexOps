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

**结论：** Cursor 不应默认「云端自己拉 AIhot」；应 **优先消费 Mac 已 prefetch 的 raw**（git 或同机），云端拉取仅作 **修好网络后的备选**。

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
| `scripts/codex-daily-run.sh` | 编排：prefetch → verify → `codex exec` |
| `scripts/codex-daily-prefetch.sh` | 仅 prefetch（已有） |
| `state/daily/YYYY-MM-DD-ingest-ready.signal` | Terminal 成功后的「提示文件」 |
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

### 方案 2（备选）：仅 signal + 人工 Run App

```bash
SKIP_CODEX=1 ./scripts/codex-daily-run.sh
# 看 state/daily/YYYY-MM-DD-ingest-ready.signal
# 再打开 Codex App 点 Run Now
```

适合未装 CLI 时。

### 方案 3（不推荐）：AppleScript 点 Codex App

可模拟点击 Run，但 UI 变更即碎，不纳入正式方案。

### 方案 4：fswatch 监听 signal

`ingest-ready.signal` 出现 → 调 `codex exec`。与方案 1 等价但更复杂，不必做。

---

## 三、Codex 如何「检测成功抓取」？

三层信号，由强到弱：

1. **`verify-daily-ingest.py` exit 0** — `codex-daily-run.sh` 内建，失败不调用 `codex exec`
2. **`state/daily/YYYY-MM-DD-ingest-ready.signal`** — 人读或监控用
3. **`manifest.ready == true` + `*-aihot-raw.json` 存在** — Automation prompt Phase 0 再验一遍（双保险）

Codex App 若仍手动 Run，prompt 里 Phase 0 会先跑 verify；无 manifest 则 **拒绝写 report**。

---

## 四、与 Cursor 的分工（更新后）

| | Cursor | Codex |
|--|--------|-------|
| Fetch | Mac Terminal 或（修好网络后）Cloud setup | **仅 Mac Terminal** |
| Analyze | Cloud Automation | **`codex exec` 或 App** |
| 9 点关机 | 云端跑但可能 **无 raw → 失败** | launchd **不跑**；开机后 `RunAtLoad` 补跑 |
| 自动触发 | Cursor 平台 cron | **launchd → codex-daily-run.sh** |

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
