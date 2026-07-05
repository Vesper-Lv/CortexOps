# Deferred Backlog — CortexOps Workbench

> 跟踪 Phase 3–6 及 code review 后仍待完成的能力。完成项打 `[x]`，未完成打 `[ ]`。
> **提醒触发**：见各条「何时提醒」。

最后更新：2026-07-04

---

## 已完成（本轮 deferred 消化）

- [x] **JSONL 写回（daily links）** — `npm run export`（默认 dry-run），`npm run export -- --write` 写回 `state/daily/*-links.jsonl` 的人工字段
- [x] **`isDownstreamEligible` 消费** — Weekly/Monthly 页「下游可消费信号」区块
- [x] **Focus policy 写回** — `npm run export:focus-policy [-- --write]`
- [x] **Task 快捷状态** — Today / In progress / Done 快捷按钮
- [x] **Export ↔ Import E2E** — `exportImportRoundTrip.test.ts`
- [x] **memory JSONL 写回** — 默认 export 含 `state/memory/ai-pm-7d.jsonl`；`--no-memory` 可跳过
- [x] **Audit timeline UI** — `/settings/audit`
- [x] **Task Kanban DnD** — 列间拖拽改状态（`@dnd-kit`）
- [x] **Monthly eligible 预览** — 复用 `listDownstreamEligibleSignals()`

---

## 仍 deferred — 按优先级

### P2 — 体验增强

| 项 | 说明 | 何时提醒 |
|----|------|----------|
| [ ] **Task 日历视图** | Kanban DnD 已有，日历排期仍缺 | 需要按日期规划任务时 |
| [ ] **Signal 详情 drawer** | 产品决策：不做 drawer | 仅当用户明确要求 |
| [ ] **Audit 按实体过滤** | 全站时间线已有，缺 signal/task 上下文过滤 | 审计某条 signal 历史时 |

### P3 — 自动化与平台

| 项 | 说明 | 何时提醒 |
|----|------|----------|
| [ ] **Automation Runner UI** | Settings 只读占位，Phase 7+ | 开始 Phase 7 |
| [ ] **Job queue worker** | `Job` 表为占位 | 需要后台定时 import/export/automation |
| [ ] **多用户 / 鉴权** | 单用户本地 workbench | 部署到共享环境前 |

---

## 操作备忘

```bash
npm run export                    # daily + memory (dry-run)
npm run export -- --write         # 写回
npm run export -- --pools         # 含 pools
npm run export -- --no-memory     # 跳过 memory 流
npm run export:focus-policy [-- --write]
```

**建议节奏**：Inbox/Pools 分拣 → `npm run export` → `--write` → `git diff state/` → automation

---

## 关联分支

- 集成分支：`cursor/nav-restructure-plan-a012`
- 近期 deferred：`cursor/deferred-p1p2-7faa`
