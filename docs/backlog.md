# CortexOps backlog

Deferred and optional work items. **Not scheduled** unless explicitly picked up.

---

## PR-C — Cursor push ingest + webhook 一键化

| Field | Value |
|-------|--------|
| **ID** | PR-C |
| **Status** | **搁置（可选）** — 2026-07-09 |
| **Priority** | Low / optional |
| **Depends on** | PR-A ✅、PR-B ✅ |
| **Blocks** | Nothing — Codex daily path is complete without this |

### 目标

prefetch 成功后自动 `git push` ingest raw（manifest + aihot + arxiv + github）到 `codex/source-layering-policy`，再 POST Cursor Webhook，使 **Cursor 云端** 能读到 supplemental raw 并跑 Phase 0 verify。

### 计划交付物（未实现）

| 项 | 说明 |
|----|------|
| `scripts/cursor-push-ingest.sh` | `git add -f` ingest 文件 → commit → push → `cursor-trigger-daily.sh` |
| `daily-ingest-pipeline.sh` | 支持 `PUSH_INGEST=1` + `RUNNER=cursor` |
| 文档 | 更新 `docs/daily-orchestration-cursor-codex.md` |
| 可选 | 短命 ingest commit 策略、repo 体积说明 |

### 为何暂缓

- 当前主路径：**Codex + launchd**（`RUNNER=codex`）已满足日常日报需求。
- Cursor 云端 ingest 需 push raw 或改架构；增加 git 噪音与并发风险。
- Webhook 已有手动可行路径；自动化收益有限。

### 当前替代方案（手动）

```bash
cd ~/Documents/CortexOps
./scripts/codex-daily-prefetch.sh
DATE=$(TZ=Asia/Shanghai date +%Y-%m-%d)

git add -f state/daily/${DATE}-ingest-manifest.json \
           state/daily/${DATE}-aihot-raw.json \
           state/daily/${DATE}-arxiv-raw.xml \
           state/daily/${DATE}-github-raw.json
git commit -m "chore(ingest): daily prefetch ${DATE}"
git push origin codex/source-layering-policy

./scripts/cursor-trigger-daily.sh "$DATE"
```

或仅 Codex、不启用 Cursor：

```bash
RUNNER=codex ./scripts/daily-ingest-pipeline.sh
```

### 何时重新考虑

- 需要 **Mac 关机时 Cursor 云端仍稳定跑日报** 且不愿用 Cloud setup fetch。
- Webhook 稳定，且愿意接受每日 ingest commit 进主分支。
- 希望 `RUNNER=both` 全自动、零手动 push。

### 参考

- `docs/daily-orchestration-cursor-codex.md` — Cursor Webhook 与 git push 触发
- `docs/superpowers/plans/2026-07-07-unified-terminal-prefetch-automation.md` — Task 6（git push ingest）

---

## 已完成（归档）

| ID | 摘要 | Merge |
|----|------|-------|
| PR #21 | Terminal prefetch + strict ingest | ✅ |
| PR-A / #26 | 禁止沙箱 curl supplemental | ✅ |
| PR-B / #28 | arXiv + GitHub raw prefetch | ✅ |
| PR #27 | `docs/codex-daily-runbook.md` | ✅ |
