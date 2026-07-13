# Deferred Backlog — CortexOps Workbench

> 跟踪 Phase 3–6 及 code review 后仍待完成的能力。完成项打 `[x]`，未完成打 `[ ]`。
> **提醒触发**：见各条「何时提醒」。

最后更新：2026-07-03

---

## 已完成（本轮 deferred 消化）

- [x] **JSONL 写回（daily links）** — `npm run export`（默认 dry-run），`npm run export -- --write` 写回 `state/daily/*-links.jsonl` 的人工字段（`human_status`, `final_pool`, `status`, `reading_pack_status`）
- [x] **`isDownstreamEligible` 消费** — `listSignalsForWeeklyReview()` + Weekly 页「下游可消费信号」区块
- [x] **Focus policy 写回** — `npm run export:focus-policy`（dry-run），`npm run export:focus-policy -- --write` 按 `focus_id` 更新 `docs/focus-policy.md` §4 YAML 块
- [x] **Task 快捷状态** — Task board 卡片上 Today / In progress / Done 快捷按钮（完整列拖拽 DnD 仍 deferred）

---

## 仍 deferred — 按优先级

### P1 — 数据闭环

| 项 | 说明 | 何时提醒 |
|----|------|----------|
| [x] **Pools JSONL 写回** | 通过 `id`/`canonical_key` 关联 triaged Signal；pool 文件内 stale Candidate 不再优先 | 大批量 pools 分拣后仍建议 dry-run 审查 |
| [ ] **Export ↔ Import 往返测试** | export 后 re-import 不应覆盖人工字段（已有 importer 保护，缺 E2E） | 首次 `--write` 写回真实 repo 前 |
| [ ] **memory JSONL 写回** | `state/memory/ai-pm-7d.jsonl` 未纳入默认 export 范围 | 若 memory 流也支持 Inbox 分拣 |

### P2 — 体验与可观测性

| 项 | 说明 | 何时提醒 |
|----|------|----------|
| [ ] **Audit timeline UI** | `AuditLog` 表已有数据，无时间线 UI | 用户问「谁在什么时候改了什么」或做 compliance 时 |
| [ ] **Task Kanban DnD** | 列间拖拽 + 日历视图 | Task 数量 >10 且用户抱怨下拉操作时 |
| [ ] **Signal 详情 drawer** | 产品决策：不做 drawer，列表内操作 | 仅当用户明确要求详情页 |
| [ ] **Monthly 页 eligible 预览** | Weekly 已有，Monthly 可复用同一 service | 实现 monthly automation 输入预览时 |

### P3 — 自动化与平台

| 项 | 说明 | 何时提醒 |
|----|------|----------|
| [ ] **Automation Runner UI** | Settings 只读占位，Phase 7+ | 开始 Phase 7 / AI runner 集成 |
| [ ] **Job queue worker** | `Job` 表为占位 | 需要后台定时 import/export/automation |
| [ ] **多用户 / 鉴权** | 单用户本地 workbench | 部署到共享环境前 |

---

## 操作备忘

```bash
# 写回 daily links（先 dry-run）
npm run export
npm run export -- --write

# 含 pools 文件
npm run export -- --pools
npm run export -- --write --pools

# Focus policy 写回
npm run export:focus-policy
npm run export:focus-policy -- --write
```

**建议节奏**：Inbox/Pools 大批量分拣后 → `npm run export` 确认 diff → `--write` → 可选 `git diff state/` 审查 → 再跑 automation。

---

## 关联 PR / 分支

- 集成分支：`cursor/nav-restructure-plan-a012`
- Phase 4–6 + review fixes：PR #8 `cursor/phase456-implementation-7faa`
- Deferred 消化：同分支或 `cursor/deferred-export-7faa`
