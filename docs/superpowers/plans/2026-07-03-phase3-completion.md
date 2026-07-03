# Phase 3 收尾计划：Review Inbox 决策定稿与剩余交付

> **For agentic workers:** 使用 checkbox 逐步执行。本计划基于 Phase C + UI 精修已交付能力，**不重复** Inbox 分拣主流程、Memo、DnD Pools 等已完成项。依赖分支 `cursor/nav-restructure-plan-a012`。

**Goal:** 按产品决策关闭 Roadmap Phase 3 剩余缺口——`status` 生命周期（含 Watch）、Drop 替代 Reject、Pools pending 视图；明确 deferred 项边界。

**Architecture:** `humanStatus` 继续只管分拣四态（pending/confirmed/changed/rejected*）；新增 `status` 字段管分拣后的全流程跟进。`*rejected` 仅保留 schema/导入兼容，UI 不设 Reject 按钮，用户用 `final_pool=drop` + `status=dropped` 表达丢弃。

**Tech Stack:** Next.js 16、Prisma/SQLite、Server Actions、Vitest。

---

## 产品决策评估（2026-07-03 定稿）

| # | 决策 | 评估 | 实现要点 |
|---|---|---|---|
| 1 | **不用 Reject 按钮，用 Drop** | ✅ 合理。与现有 `POOL_OPTIONS` 中的 `drop` 池一致；UI 精修计划已采用同一语义。比独立 Reject 少一个概念，用户心智是「路由到 drop 池」而非「拒绝这条记录」。 | finalize 时若 `finalPool=drop`，设 `status=dropped`；`syncSignalToCandidate` 仍写入 drop 池（便于追溯），下游 weekly/monthly **排除** `status=dropped` 与 `finalPool=drop`。无需 `humanStatus=rejected` UI 路径。 |
| 2 | **不做 Signal detail drawer** | ✅ 合理。日报场景摘要 + 原文链接足够；抽屉增加开发量但对分拣效率边际低。与 Dashboard 读视图、Inbox 卡片摘要一致。 | 从 Roadmap Phase 3 deliverables **移除**；验收改为「卡片展示 summary + 可点击 originalUrl」。 |
| 3 | **Audit 时间线 UI 暂缓** | ✅ 合理。`AuditLog` 已在 DB 写入（draft/finalize/pool move/memo→task）；无前端操作历史前，做 UI 价值低。 | 标记 deferred；保留 `scripts/verify-phase-c.ts` 与单测作为数据层验收。后续可在 Settings 或信号上下文加时间线。 |
| 4 | **Watch 用方案 B：`status` 字段** | ✅ 正确。与 `ingestion-normalization.md` 的 `status` 枚举一致；与 `humanStatus` 正交，避免把「跟进状态」混进「分拣结果」。 | Schema 加列；导入映射；finalize / Pools 操作写 `status`；Watch 按钮在 **Pools**（已分拣条目），不在 Inbox pending 卡片。 |
| 5 | **恢复 Pools pending 视图** | ✅ 必要。导航设计明确：非今日 backlog 的 `human_status=pending` 由 `/inbox/pools?status=pending` 承接。UI 精修 4c 删除筛选与此冲突，**撤销 4c**。 | 恢复 `StatusFilterBar` + `getCandidatePools(humanStatus)`；默认 All，可选 pending/confirmed/changed。 |

### 明确不做（Phase 3 范围外）

- Signal detail drawer
- Audit 时间线 UI
- 独立 Reject 按钮 / `humanStatus=rejected` 写路径
- JSONL 写回导出（仍 deferred）
- rationale 输入框（AuditLog.rationale 继续 null，后续加）

---

## 字段语义定稿

### `humanStatus`（分拣层，不变）

```text
pending → confirmed | changed
```

- Inbox/Today 只展示 `pending`（当日）。
- 导入后默认 `pending`；finalize 后 `confirmed` 或 `changed`。
- **`rejected`**：schema/历史 JSONL 只读兼容；**UI 不写入**。

### `status`（生命周期层，新增）

来自 `docs/ingestion-normalization.md`：

```text
inbox | confirmed | watching | scheduled | in_progress | done | archived | dropped
```

| 触发 | `status` 值 |
|---|---|
| 导入缺省 | `inbox`（或 JSONL 原值） |
| finalize 且 `finalPool ≠ drop` | `confirmed` |
| finalize 且 `finalPool = drop` | `dropped` |
| Pools 点「关注」 | `watching` |
| 后续 Phase 4+ | `scheduled` / `in_progress` / `done` / `archived` |

**规则：** `humanStatus` 与 `status` 独立更新；导入 `update` 时 **`status` 与人工字段一并保留**（同 `humanStatus`/`finalPool`/`readingPackStatus`）。

### Drop 替代 Reject 的下游语义

等价于 Roadmap「Rejected signals do not enter downstream recommendations」：

```text
下游可消费 ⟺ humanStatus ∈ {confirmed, changed}
              AND status ∉ {dropped}
              AND finalPool ≠ drop
```

---

## 受影响文件清单

| 文件 | 变更 |
|---|---|
| `prisma/schema.prisma` | `Signal`/`Candidate` 加 `status String?` + index |
| `src/server/importers/recordMapper.ts` | 映射 `status` |
| `src/server/importers/prismaSignalRepository.ts` | create 播种 status；update 排除 status |
| `src/shared/schemas/signal.ts` | optional `status` |
| `src/shared/signalStatus.ts` | **新增** 枚举常量 + 校验 |
| `src/server/services/review.ts` | finalize 写 status（confirmed/dropped） |
| `src/server/services/candidateSync.ts` | 同步 status；drop 仍入 drop 池 |
| `src/server/services/candidatePools.ts` | `setCandidateStatus` + Watch |
| `src/server/actions/candidateActions.ts` | `watchCandidateAction` |
| `src/components/inbox/status-filter-bar.tsx` | **新增** pending 筛选 |
| `src/components/inbox/pool-board.tsx` | 显示 status；Watch 按钮 |
| `src/app/inbox/pools/page.tsx` | 恢复 `searchParams.status` |
| `src/server/__tests__/review.test.ts` | finalize → status 断言 |
| `src/server/__tests__/candidateStatus.test.ts` | **新增** watch / drop 下游规则 |
| `docs/cortexops-ai-system-roadmap.md` | Phase 3 交付项修订 |
| `docs/superpowers/plans/2026-07-03-workbench-ui-refinement.md` | 撤销 4c；补充 status 说明 |

---

## Task 1: Schema + 导入映射 `status`

**Files:** `prisma/schema.prisma`, `recordMapper.ts`, `prismaSignalRepository.ts`, `signal.ts`

- [ ] **Step 1:** `Signal`/`Candidate` 增加 `status String?`，`@@index([status])`
- [ ] **Step 2:** `recordMapper` 读取 `v.status`；缺省 `null`（service 层默认 `inbox`）
- [ ] **Step 3:** `upsertSignal`/`upsertCandidate` 的 `update` 排除 `status`（人工拥有）
- [ ] **Step 4:** `npm run db:push` + importer 单测回归

---

## Task 2: finalize 写 `status`（Drop = dropped）

**Files:** `src/shared/signalStatus.ts`, `src/server/services/review.ts`, `review.test.ts`

- [ ] **Step 1:** 常量 `SIGNAL_STATUSES`、`assertValidStatus`
- [ ] **Step 2:** `finalizeSignal` 末尾：
  - `finalPool === "drop"` → `status = "dropped"`
  - else → `status = "confirmed"`
- [ ] **Step 3:** `syncSignalToCandidate` 传递 `status`
- [ ] **Step 4:** 单测：drop finalize → dropped；普通 finalize → confirmed

---

## Task 3: Pools — Watch + 恢复 pending 筛选

**Files:** `status-filter-bar.tsx`, `pools/page.tsx`, `pool-board.tsx`, `candidatePools.ts`, `candidateActions.ts`

- [ ] **Step 1:** 恢复 `StatusFilterBar`：`All | pending | confirmed | changed`（Link + `?status=`）
- [ ] **Step 2:** `pools/page.tsx` 读 `searchParams.status`，调用 `getCandidatePools(status)`
- [ ] **Step 3:** 卡片展示 `status` badge（watching / dropped 等）
- [ ] **Step 4:** 对已分拣条目（`humanStatus ≠ pending` 且 `status ≠ dropped`）显示「关注」→ `status=watching` + AuditLog `action=watch`
- [ ] **Step 5:** 空态 copy：pending 筛选无结果时提示「去 Inbox/Today 分拣今日信号」

**撤销 UI 精修 4c：** 验收标准改回「Pools 可按 humanStatus 过滤，含 pending backlog」。

---

## Task 4: 下游排除规则（helper）

**Files:** `src/shared/signalStatus.ts` 或 `src/server/services/downstreamEligible.ts`

- [ ] **Step 1:** `isDownstreamEligible({ humanStatus, status, finalPool })` 纯函数
- [ ] **Step 2:** 单测覆盖：drop/dropped/pending/rejected(导入)/confirmed+watching
- [ ] **Step 3:** 文档注释：weekly/monthly importer 未来调用此 helper（本阶段仅函数 + 测试，无 weekly UI）

---

## Task 5: 文档同步

- [ ] **Step 1:** 更新 `docs/cortexops-ai-system-roadmap.md` Phase 3 节（见下方修订稿）
- [ ] **Step 2:** 更新 `docs/superpowers/plans/2026-07-03-workbench-ui-refinement.md` 需求表 4c 与验收
- [ ] **Step 3:** `docs/workbench-design.md` §5.2：reject → drop；补充 status/watch

---

## 验收标准（Phase 3 关闭）

### Inbox/Today（已有，回归）
- [ ] 仅当日 `humanStatus=pending` 显示
- [ ] 改池含 `drop`；选 drop 后点「确定」→ 卡片消失，Pools drop 列可见
- [ ] 无 Reject 按钮

### Pools（新增/恢复）
- [ ] `?status=pending` 展示非今日仍 pending 的 backlog
- [ ] 已分拣卡片可点「关注」→ `status=watching`
- [ ] DnD 改池仍可用；archive 仍最右

### 数据层
- [ ] finalize drop → `status=dropped`；普通 finalize → `status=confirmed`
- [ ] 重入 import 不覆盖 `status`（与 human 字段同策略）
- [ ] `isDownstreamEligible` 单测通过
- [ ] `npm test` / `lint` / `build` 通过

### 明确 deferred
- [ ] Signal detail drawer — 不做
- [ ] Audit 时间线 UI — 不做
- [ ] JSONL 写回 — 不做

---

## Roadmap Phase 3 修订稿（写入 roadmap）

**Deliverables（修订后）：**

- Review Inbox page ✅
- Confirm, Change Pool, Drop（via pool=`drop`）, Watch（via `status`） ✅
- AuditLog（DB only，UI deferred） ✅
- Pools pending backlog view ✅

**Acceptance criteria（修订后）：**

- Pending signals can be confirmed or moved to another pool（含 drop）
- Dropped signals（`finalPool=drop` / `status=dropped`）do not enter downstream recommendations
- Watch marks `status=watching` without altering `humanStatus`
- Human actions persist across re-import（human-owned fields + `status`）
- Audit records exist in DB（UI traceability deferred）

---

## 风险与缓解

| 风险 | 缓解 |
|---|---|
| `status` 与 Task.status 命名混淆 | Signal 用 `signalStatus` 类型别名；Task 表字段不变 |
| drop 池与 dropped 状态双写不一致 | finalize 原子事务同时写 `finalPool` + `status` |
| 恢复 pending 筛选与 DnD 列视图冲突 | 筛选作用于**跨池 flat 列表模式**或高亮 pending 条目；若 UX 混乱，pending 视图用单独 tab「待分拣 backlog」而非按池列 |

---

## Self-Review

- 五项产品决策均已映射到具体任务；Reject/drawer/audit UI 边界清晰。
- Watch 放在 Pools 符合「分拣完再跟进」工作流。
- 撤销 UI 精修 4c 与导航设计 §69 对齐。
