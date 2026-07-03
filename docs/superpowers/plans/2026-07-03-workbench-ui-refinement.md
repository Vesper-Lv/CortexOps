# Workbench UI 精修实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将二级导航移入侧边栏，并完善 Dashboard/Today（五段式日报、练习三选一、候选勾选确认）、Inbox/Today（卡片式分拣、消失逻辑、下拉改池/优先级）、Candidate Pools（archive 置后、拖拽改池）、Memo（升级 Task）的交互与数据写回。

**Architecture:** 延续现有分层——纯解析/状态函数 + Prisma service + Server Actions + client 控件。新增 `DailyReport`/`DailySession`/`Task` 模型承载 report.md 与练习/面板状态；分拣完成时将 `Signal` 同步到 `Candidate` 表供 Pools 展示；拖拽用 `@dnd-kit/core` + `@dnd-kit/sortable`（轻量、可访问性较好）。App Shell 改为「顶栏一级区 + 左侧二级区 + 主内容」。

**Tech Stack:** Next.js 16 App Router、Prisma/SQLite、Server Actions、Tailwind、`@dnd-kit/*`、Vitest。

**范围与非目标：**
- **做**：本 spec 全部 5 组需求；含 **Dashboard/Tasks 最小列表页**（承接 Memo 升级，非 Inbox 内嵌 Task）。
- **不做**：写回 JSONL 文件、周报/月报阅读、Focus Rules UI、完整 Kanban 任务看板（拖拽列、日历、多状态流转 UI 后置）。

---

## 需求对照表（用户 → 实现）

| # | 用户需求 | 实现要点 |
|---|---|---|
| 1 | 二级 TOP 标题改在侧边栏 | `SectionNav` 从横向 tab 改为 `AppShell` 左侧竖向导航；顶栏仅保留 4 个一级区 |
| 2a | 五段式日报呈现 | 导入/解析 `state/daily/*-report.md` §1 → `DailyReport.fivePartJson` → Dashboard 顶部渲染 |
| 2b | 今日练习三选一 + 另两条 pool/drop + 最终只保留已选 | `DailySession` 存选中索引与另两条去向；未完成显示 3 条；完成后仅显示选中练习 |
| 2c | 依然提供链接 | 阅读包/候选/练习文案内保留 `originalUrl` 外链 |
| 2d | 删除「摘要：」前缀 | `ReadingPack` / `SignalCard` 直接渲染 summary 文本 |
| 2e | 快速补充：勾选 + 确认；右上角「忽略」 | `CandidateSupplementPanel` client 组件；`DailySession.candidatesDismissed` |
| 3a | Inbox：删 Status/Pack 字段，改交互 UI | 卡片边框高亮=在阅读包；右下角「加入阅读包」；仅 `pending` 显示 |
| 3b | P0/pool 下拉 + 加入阅读包 | 行内可改 priority / pool / readingPack，但均为**草稿编辑**，**不触发消失** |
| 3c | 单条「确定」或页顶「全部确定」才消失并进入 Pools | 仅 `finalize` 将 `humanStatus` 置为 `confirmed`/`changed` 并 `syncSignalToCandidate`；草稿编辑保持 `pending` |
| 3d | 删除摘要「摘要：」 | 同 2d |
| 4a | archive 放最后 | `POOL_DISPLAY_ORDER` 常量排序 |
| 4b | 拖拽改池 | DnD + `moveCandidatePool` Server Action |
| 4c | ~~删除 pending 筛选~~ **已撤销（Phase 3 收尾）** | 恢复 `?status=` 过滤；非今日 pending backlog 见 `/inbox/pools?status=pending` |
| 5 | Memo 可升级为 Task | 升级后 **删除 Memo 行**、**写入 Task 表**、在 **Dashboard/Tasks** 展示（Inbox 内不嵌 Task 列表） |

---

## 数据模型变更

### 新增 Prisma models（`prisma/schema.prisma`）

```prisma
model DailyReport {
  id            String   @id @default(cuid())
  date          String   @unique // YYYY-MM-DD
  fivePartJson  String   // JSON: [{ key, label, content }]
  practicesJson String   // JSON: [{ index, title, body, duration, suggestedPool }]
  sourceFile    String
  importRunId   String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

model DailySession {
  date                    String   @id // YYYY-MM-DD
  selectedPracticeIndex   Int?     // 0|1|2
  practiceAlt0Disposition String?  // pool name or "drop"
  practiceAlt1Disposition String?
  practiceAlt2Disposition String?
  candidatesDismissed     Boolean  @default(false)
  updatedAt               DateTime @updatedAt
}

model Task {
  id             String   @id @default(cuid())
  title          String
  description    String?
  origin         String   @default("manual") // memo | signal | manual
  linkedSignalId String?
  status         String   @default("inbox") // inbox | this_week | today | in_progress | waiting | done | archived
  priority       String?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@index([status])
}
```

> **说明：** Memo 升级后 **物理删除** `Memo` 行，不保留 `linkedMemoId`（避免悬空外键）。Task `title` 取自 memo 文本，`origin="memo"`。
```

### 池排序常量（`src/shared/poolOptions.ts` 扩展）

```ts
export const POOL_DISPLAY_ORDER = [
  "product_inspiration",
  "paper_candidate",
  "demo_replication",
  "knowledge_gap",
  "personal_work",
  "drop",
  "archive"
] as const;

export function sortPools<T extends { poolName: string }>(groups: T[]): T[] {
  const rank = new Map(POOL_DISPLAY_ORDER.map((p, i) => [p, i]));
  return [...groups].sort(
    (a, b) => (rank.get(a.poolName) ?? 99) - (rank.get(b.poolName) ?? 99)
  );
}
```

### Inbox Today：两阶段分拣模型（草稿 vs 确定）

**核心规则（用户修订）：** 改池、改优先级、加入/移出阅读包均为**可叠加的草稿操作**；条目**只有**在用户点击单条「确定」或页顶「全部确定」后才从 Inbox/Today 消失并同步到 Candidate Pools。

```ts
// 仅 humanStatus === "pending" 出现在 Inbox/Today
export function isInboxPending(signal: { humanStatus: string | null }): boolean {
  return (signal.humanStatus ?? "pending") === "pending";
}
```

#### Action 类型拆分

| 类型 | Action | 写 DB 字段 | `humanStatus` | 是否消失 |
|---|---|---|---|---|
| 草稿 | `set_pool` | `finalPool` | 保持 `pending` | 否 |
| 草稿 | `set_priority` | `priority` | 保持 `pending` | 否 |
| 草稿 | `toggle_reading_pack` | `readingPackStatus` | 保持 `pending` | 否 |
| 落库 | `finalize`（单条「确定」） | — | `confirmed` 或 `changed`* | **是** |
| 落库 | `finalize_all`（「全部确定」） | — | 同上，批量 | **是** |

\* `finalize` 时：若 `finalPool`/`priority`/`readingPackStatus` 相对 AI 初值（`suggestedPool`、导入初值）有改动 → `humanStatus=changed`；否则 `humanStatus=confirmed`。

**移除旧行为：** 不再有「改池即消失」「拒绝即消失」；本阶段不提供独立「拒绝」按钮（若需拒绝，用户将 pool 设为 `drop` 后点「确定」）。

#### 草稿编辑 service 示意

```ts
// src/server/services/review.ts
export type DraftAction =
  | { type: "set_pool"; pool: string }
  | { type: "set_priority"; priority: string }
  | { type: "toggle_reading_pack" };

export function applyDraftAction(
  state: { finalPool: string | null; priority: string | null; readingPackStatus: string | null },
  action: DraftAction
): typeof state {
  switch (action.type) {
    case "set_pool":
      return { ...state, finalPool: action.pool };
    case "set_priority":
      return { ...state, priority: action.priority };
    case "toggle_reading_pack":
      return {
        ...state,
        readingPackStatus: state.readingPackStatus === "selected" ? "not_selected" : "selected"
      };
  }
}

export async function draftSignalEdit(signalId: string, action: DraftAction): Promise<void> {
  // 更新字段 + AuditLog(action=draft_*)，humanStatus 保持 pending
}

export async function finalizeSignal(signalId: string): Promise<void> {
  // 计算 confirmed/changed → 更新 humanStatus → syncSignalToCandidate → AuditLog
}

export async function finalizeAllPending(date: string): Promise<number> {
  // 对当日所有 pending 信号调用 finalizeSignal，返回处理条数
}
```

### Signal → Candidate 同步（仅 finalize 后）

```ts
// src/server/services/candidateSync.ts
export async function syncSignalToCandidate(signalId: string): Promise<void> {
  const s = await prisma.signal.findUnique({ where: { id: signalId } });
  if (!s || s.humanStatus === "pending") return;
  const poolName = (s.finalPool ?? s.suggestedPool ?? "archive").replace(/_/g, "-");
  const recordKey = `signal-sync:${s.recordKey}`;
  await prisma.candidate.upsert({
    where: { recordKey },
    create: {
      recordKey,
      poolName,
      externalId: s.externalId,
      title: s.title,
      sourceUrl: s.sourceUrl,
      originalUrl: s.originalUrl,
      priority: s.priority,
      suggestedPool: s.suggestedPool,
      finalPool: s.finalPool,
      humanStatus: s.humanStatus,
      rawJson: s.rawJson,
      sourceFile: s.sourceFile,
      sourceLine: s.sourceLine,
      importRunId: s.importRunId
    },
    update: {
      poolName,
      title: s.title,
      priority: s.priority,
      finalPool: s.finalPool,
      humanStatus: s.humanStatus
      // 不覆盖 import 来自 pools/*.jsonl 的独立行
    }
  });
}
```

在 `finalizeSignal` / `finalizeAllPending` 事务末尾调用 `syncSignalToCandidate`（**不在** `draftSignalEdit` 中调用）。

---

## 文件结构（新增/修改）

| 文件 | 职责 |
|---|---|
| `src/components/layout/app-shell.tsx` | 顶栏一级 + 左侧二级 + main |
| `src/components/layout/section-nav.tsx` | 改为竖向 sidebar |
| `src/server/importers/dailyReportParser.ts` | 解析 report.md 五段式 + 练习 |
| `src/server/importers/runImport.ts` | 扩展：导入 report.md |
| `src/server/services/dailyReport.ts` | 读 DailyReport + DailySession |
| `src/server/services/candidateSync.ts` | Signal→Candidate |
| `src/server/services/candidatePools.ts` | 分组 + 排序 + 拖拽写回 |
| `src/components/dashboard/five-part-summary.tsx` | 五段式展示 |
| `src/components/dashboard/practice-picker.tsx` | 练习三选一 client |
| `src/components/dashboard/candidate-supplement-panel.tsx` | 勾选确认/忽略 |
| `src/components/inbox/signal-card.tsx` | 替代 signal-row 新交互 |
| `src/components/inbox/pool-board.tsx` | DnD 池看板 client |
| `src/server/actions/dailySessionActions.ts` | 练习/忽略/批量候选 |
| `src/server/actions/candidateActions.ts` | moveCandidatePool |
| `src/server/actions/taskActions.ts` | promoteMemoToTask |
| `src/server/services/tasks.ts` | Task CRUD + listTasks |
| `src/app/dashboard/tasks/page.tsx` | Task 列表（承接 Memo 升级） |
| `src/components/dashboard/task-list.tsx` | Dashboard/Tasks 展示组件 |

删除或弃用：`src/components/inbox/signal-row.tsx`（由 signal-card 替代）；废弃即时 `confirm`/`reject`/`change_pool` 导致消失的 Server Actions。

---

## Phase A：侧边栏二级导航

### Task 1: AppShell 布局重构

**Files:**
- Modify: `src/components/layout/app-shell.tsx`
- Modify: `src/components/layout/section-nav.tsx`
- Modify: `src/app/dashboard/layout.tsx`, `src/app/inbox/layout.tsx`, `src/app/library/layout.tsx`, `src/app/settings/layout.tsx`

- [ ] **Step 1: 改 `section-nav.tsx` 为竖向**

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { findSectionByPath } from "@/shared/navigation";

export function SectionNav() {
  const pathname = usePathname();
  const section = findSectionByPath(pathname);
  if (!section) return null;

  return (
    <nav className="flex w-52 shrink-0 flex-col gap-1 border-r border-border pr-4">
      <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {section.label}
      </p>
      {section.children.map((child) => {
        const isActive = pathname === child.href;
        return (
          <Link
            key={child.href}
            href={child.href}
            aria-current={isActive ? "page" : undefined}
            className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium ${
              isActive ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/60"
            }`}
          >
            <child.icon className="h-4 w-4 shrink-0" />
            {child.label}
          </Link>
        );
      })}
    </nav>
  );
}
```

- [ ] **Step 2: 改 `app-shell.tsx`**

```tsx
import { TopNav } from "@/components/layout/top-nav";
import { SectionNav } from "@/components/layout/section-nav";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 px-5 py-4 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
          {/* 品牌 + TopNav 一级区 */}
          <TopNav />
        </div>
      </header>
      <div className="mx-auto flex w-full max-w-7xl gap-6 px-5 py-6">
        <SectionNav />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: 各 section `layout.tsx` 删除内嵌 `<SectionNav />`，仅保留 `{children}` 或页面标题容器**

- [ ] **Step 4: 构建 + 手动检查四区二级链接**

Run: `npm run build`
Expected: PASS；Dashboard/Inbox/Library/Settings 左侧显示对应二级项。

- [ ] **Step 5: Commit**

```bash
git commit -m "refactor(ui): move section nav to left sidebar"
```

---

## Phase B：日报导入 + Dashboard/Today 增强

### Task 2: 解析 `*-report.md`

**Files:**
- Create: `src/server/importers/dailyReportParser.ts`
- Create: `src/server/importers/__tests__/dailyReportParser.test.ts`

- [ ] **Step 1: 失败测试**

```ts
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { parseDailyReportMarkdown } from "@/server/importers/dailyReportParser";

describe("parseDailyReportMarkdown", () => {
  it("parses five-part sections and three practices from sample report", () => {
    const md = readFileSync("state/daily/2026-07-02-report.md", "utf8");
    const parsed = parseDailyReportMarkdown(md);
    expect(parsed.fivePart).toHaveLength(5);
    expect(parsed.fivePart[0].label).toContain("产品");
    expect(parsed.practices).toHaveLength(3);
    expect(parsed.practices[0].title).toContain("正式推荐");
  });
});
```

- [ ] **Step 2: 实现解析器**

```ts
export type FivePartSection = { key: string; label: string; content: string };
export type PracticeOption = {
  index: number;
  title: string;
  body: string;
  duration?: string;
  suggestedPool?: string;
};

const FIVE_PART_LABELS = [
  "产品 / 行业动态",
  "GitHub / 工程信号",
  "论文 / 研究信号",
  "工具 / 工作流信号",
  "风险 / 限制 / 反例"
];

export function parseDailyReportMarkdown(markdown: string): {
  fivePart: FivePartSection[];
  practices: PracticeOption[];
} {
  // 提取 ## 1. 五段式日报 与 ## 2. 今日 30mins 之间内容
  const fiveBlock = markdown.match(/## 1\. 五段式日报([\s\S]*?)(?=## 2\.)/)?.[1] ?? "";
  const practiceBlock = markdown.match(/## 4\. 今日练习三选一([\s\S]*?)$/m)?.[1] ?? "";

  const fivePart = FIVE_PART_LABELS.map((label) => {
    const re = new RegExp(`\\*\\*${label.replace(/[/.]/g, "\\$&")}\\*\\*：([\\s\\S]*?)(?=\\*\\*|$)`);
    const m = fiveBlock.match(re);
    return { key: label, label, content: (m?.[1] ?? "").trim() };
  });

  const practices: PracticeOption[] = [];
  const lines = practiceBlock.split("\n").filter((l) => /^\d+\./.test(l.trim()));
  lines.forEach((line, index) => {
    const m = line.match(/^\d+\.\s*\*\*(.+?)\*\*｜(.+)$/);
    if (!m) return;
    practices.push({ index, title: m[1].trim(), body: m[2].trim() });
  });

  return { fivePart, practices };
}
```

- [ ] **Step 3: 测试通过 + Commit**

---

### Task 3: Prisma DailyReport + DailySession + 导入

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `src/server/importers/importSources.ts`（加入 `state/daily/*-report.md`）
- Modify: `src/server/importers/runImport.ts` 或新建 `importDailyReports.ts`

- [ ] **Step 1:** `npm run db:push`
- [ ] **Step 2:** 导入时 upsert `DailyReport`（按 date）
- [ ] **Step 3:** `getDailySession(date)` / `upsertDailySession` service
- [ ] **Step 4: Commit** `feat(daily): import and store five-part report + session state`

---

### Task 4: Dashboard UI 组件

**Files:**
- Create: `src/components/dashboard/five-part-summary.tsx`
- Create: `src/components/dashboard/practice-picker.tsx`
- Create: `src/components/dashboard/candidate-supplement-panel.tsx`
- Modify: `src/components/dashboard/reading-pack.tsx`（去掉「摘要：」）
- Modify: `src/app/dashboard/today/page.tsx`

**练习交互规则：**
1. 初始显示 3 条练习（radio 单选）。
2. 对**未选中**的 2 条，各有一个 `<select>`：`pool` 选项 + `drop`。
3. 用户点击「确认今日练习」→ 校验：已选 1 条 + 另 2 条均有 disposition → 写 `DailySession`。
4. 之后页面**仅渲染** `practices[selectedPracticeIndex]` 一块卡片。
5. 阅读包与五段式始终保留；链接字段不变。

**快速补充面板：**
```tsx
// candidate-supplement-panel.tsx 要点
// - 标题行右侧：<button onClick={dismissCandidates}>忽略</button>
// - 每行：<input type="checkbox" /> + 标题链接
// - 底部：<button onClick={confirmSelected}>确认加入阅读包</button>
// - confirmSelected: 对勾选 ids 调用 batch toggle_reading_pack → selected
// - dismissCandidates: dailySession.candidatesDismissed = true
```

- [ ] **Step 1:** Server Actions in `dailySessionActions.ts`
- [ ] **Step 2:** 组装 `dashboard/today/page.tsx` 区块顺序：日期标题 → 五段式 → 练习 → 阅读包 → 候选面板（未忽略时）
- [ ] **Step 3:** `npm test` && `npm run build`
- [ ] **Step 4: Commit** `feat(dashboard): five-part summary, practice picker, candidate supplement panel`

---

## Phase C：Inbox/Today 卡片式分拣（草稿编辑 + 确定落库）

### Task 5: 重构 review 为 draft / finalize 双通道

**Files:**
- Modify: `src/server/services/review.ts`
- Modify: `src/server/__tests__/review.test.ts`
- Modify: `src/server/actions/reviewActions.ts`

- [ ] **Step 1: 失败测试 — 草稿不改变 humanStatus**

```ts
describe("applyDraftAction", () => {
  it("set_pool updates finalPool without implying finalize", () => {
    const next = applyDraftAction(
      { finalPool: "knowledge_gap", priority: "P1", readingPackStatus: "candidate" },
      { type: "set_pool", pool: "demo_replication" }
    );
    expect(next.finalPool).toBe("demo_replication");
  });
});

describe("finalizeSignal logic", () => {
  it("marks changed when pool differs from suggested", () => {
    expect(computeHumanStatusOnFinalize({
      suggestedPool: "knowledge_gap",
      finalPool: "demo_replication",
      priority: "P1",
      initialPriority: "P1",
      readingPackStatus: "selected",
      initialReadingPackStatus: "selected"
    })).toBe("changed");
  });
  it("marks confirmed when nothing changed from AI values", () => {
    expect(computeHumanStatusOnFinalize({
      suggestedPool: "knowledge_gap",
      finalPool: "knowledge_gap",
      priority: "P1",
      initialPriority: "P1",
      readingPackStatus: "selected",
      initialReadingPackStatus: "selected"
    })).toBe("confirmed");
  });
});
```

- [ ] **Step 2:** 实现 `draftSignalEdit` / `finalizeSignal` / `finalizeAllPending`；`draft*` 写 AuditLog `action=draft_set_pool` 等
- [ ] **Step 3:** Server Actions：`submitDraft(signalId, action)`、`finalizeSignalAction(signalId)`、`finalizeAllAction(date)`
- [ ] **Step 4:** `revalidatePath`：`/inbox/today`、`/dashboard/today`、`/inbox/pools`（仅 finalize 时）
- [ ] **Step 5: Commit** `refactor(review): split draft edits from finalize confirm flow`

---

### Task 6: Signal 卡片 UI

**Files:**
- Create: `src/components/inbox/signal-card.tsx`
- Modify: `src/server/services/inboxView.ts`（`getInboxToday` 仅 `humanStatus=pending`）
- Modify: `src/app/inbox/today/page.tsx`
- Delete: `src/components/inbox/signal-row.tsx`

**卡片布局：**
```tsx
// 外层 relative
// readingPackStatus === "selected" → ring-2 ring-primary/60 bg-primary/5
// 否则右下角：「加入阅读包」→ submitDraft(id, { type: "toggle_reading_pack" })

// 顶部一行控件（均为草稿，不消失）：
<select value={priority} onChange={... submitDraft set_priority} />
<select value={finalPool} onChange={... submitDraft set_pool} />

// 底部主操作（唯一消失入口）：
<button onClick={() => finalizeSignalAction(id)}>确定</button>

// 页顶工具栏：
<button onClick={() => finalizeAllAction(date)}>全部确定</button>
```

- [ ] **Step 1:** 实现 `signal-card.tsx`（无「摘要：」前缀；保留标题外链）
- [ ] **Step 2:** 改 Inbox 页面组装；验证：改 pool 后卡片仍在，点「确定」后消失
- [ ] **Step 3:** 验证：「全部确定」后当日 pending 清空；Pools 可见同步条目
- [ ] **Step 4: Commit** `feat(inbox): card triage with draft edits and explicit finalize`

---

## Phase D：Candidate Pools 拖拽 + 排序

### Task 7: 安装 DnD + 池看板

**Files:**
- Modify: `package.json`（`@dnd-kit/core` `@dnd-kit/sortable` `@dnd-kit/utilities`）
- Create: `src/components/inbox/pool-board.tsx`
- Create: `src/server/actions/candidateActions.ts`
- Modify: `src/server/services/inboxView.ts` → 提取 `candidatePools.ts`
- Modify: `src/app/inbox/pools/page.tsx`

- [ ] **Step 1: 安装依赖**

```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

- [ ] **Step 2: `moveCandidatePool(candidateId, toPoolName)` Server Action + AuditLog**

- [ ] **Step 3: `pool-board.tsx`**
  - 列 = `sortPools(groups)`
  - `archive` 列固定最右
  - 卡片可拖到另一列 → 触发 action → `revalidatePath("/inbox/pools")`

- [x] **Step 4: ~~删除 `StatusFilterBar`~~ → 已在 Phase 3 收尾计划中撤销；恢复 pending 筛选**

- [x] **Step 5: 构建 + Commit** `feat(pools): drag-and-drop pool reassignment, archive last`

---

## Phase E：Memo → Dashboard/Tasks（删除 Memo，非 Inbox 嵌表）

### Task 8: Task 表 + Dashboard/Tasks 列表 + Memo 升级

**Files:**
- Modify: `prisma/schema.prisma`（Task model）
- Create: `src/server/services/tasks.ts`
- Create: `src/server/actions/taskActions.ts`
- Create: `src/components/dashboard/task-list.tsx`
- Modify: `src/app/dashboard/tasks/page.tsx`
- Modify: `src/components/inbox/memo-list.tsx`

**行为（用户修订）：**
1. Memo 页每条有「升级为 Task」按钮。
2. 点击后：创建 `Task`（`status=inbox`, `origin=memo`, `title=memo.text`）。
3. **删除** 原 `Memo` 行（非标记 done）。
4. `revalidatePath("/inbox/memo")` + `revalidatePath("/dashboard/tasks")`。
5. 用户去 **Dashboard/Tasks** 查看新任务；**Inbox 内不出现 Task 列表或表格**。

- [ ] **Step 1:** `npm run db:push`

- [ ] **Step 2: `promoteMemoToTask` — 创建 Task 并删除 Memo**

```ts
export async function promoteMemoToTask(memoId: string): Promise<string> {
  const memo = await prisma.memo.findUnique({ where: { id: memoId } });
  if (!memo) throw new Error("memo not found");

  const task = await prisma.$transaction(async (tx) => {
    const created = await tx.task.create({
      data: {
        title: memo.text,
        origin: "memo",
        status: "inbox",
        description: memo.sourceContext ? `from: ${memo.sourceContext}` : null
      }
    });
    await tx.memo.delete({ where: { id: memoId } });
    await tx.auditLog.create({
      data: {
        entityType: "memo",
        entityId: memoId,
        action: "promote_to_task",
        toValue: created.id
      }
    });
    return created;
  });

  return task.id;
}
```

- [ ] **Step 3: `listTasks()` + Dashboard/Tasks 页面**

```tsx
// src/app/dashboard/tasks/page.tsx — 替换空状态壳
export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const tasks = await listTasks();
  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <h2 className="text-4xl font-semibold">Tasks</h2>
      <TaskList tasks={tasks} />
    </section>
  );
}
```

- [ ] **Step 4: Memo 列表增加「升级为 Task」；升级后该行从 Memo 消失**

- [ ] **Step 5: 测试 `promoteMemoToTask`（memo 删除 + task 创建）+ Commit**

```bash
git commit -m "feat(tasks): promote memo to dashboard task list and delete memo"
```

---

## 验收标准

### 导航
- [ ] 顶栏仅 4 个一级区；当前区的 Today/Weekly/… 在**左侧边栏**显示并高亮。

### Dashboard/Today
- [ ] 展示五段式日报（来自 report.md 导入）。
- [ ] 练习三选一：可选 1 条，另 2 条指定 pool/drop，确认后仅保留选中练习。
- [ ] 阅读包条目无「摘要：」前缀，外链可点击。
- [ ] 快速补充：勾选 + 确认加入阅读包；右上角忽略后隐藏整块，阅读包仍可见。

### Inbox/Today
- [ ] 仅 `pending` 信号显示。
- [ ] 改 pool / 改 priority / 加入阅读包为草稿操作，**卡片不消失**。
- [ ] 单条「确定」或页顶「全部确定」后卡片消失并同步到 Candidate Pools。
- [ ] 在阅读包：卡片高亮；未在：右下角「加入阅读包」。
- [ ] 无独立「拒绝」即时消失按钮（拒绝语义：pool 选 `drop` 后点「确定」）。

### Inbox/Candidate Pools
- [ ] `archive` 列在最后；可拖拽条目到其他池并持久化。
- [ ] **Phase 3 收尾追加：** 恢复 `human_status` 筛选（含 pending backlog）；见 `2026-07-03-phase3-completion.md`。

### Inbox/Memo → Dashboard/Tasks
- [ ] 每条 memo 可「升级为 Task」。
- [ ] 升级后 **Memo 行删除**，**不出现于 Inbox**。
- [ ] 新 Task 在 **Dashboard/Tasks** 列表可见（`status=inbox`）。

### 工程
- [ ] `npm test` / `npm run lint` / `npm run build` 通过。

---

## 风险与缓解

| 风险 | 缓解 |
|---|---|
| report.md 格式漂移 | 解析器单测绑定 `2026-07-02-report.md`；解析失败时 Dashboard 显示「五段式暂不可用」 |
| Signal 与 Candidate 双源重复 | `sync` 使用独立 `recordKey` 前缀 `signal-sync:`；Pools 合并展示时按 `recordKey` 去重 |
| DnD 移动端体验 | 首版桌面优先；小屏保留「移动到池」下拉作 fallback |
| Memo 升级与 Task 列表竞态 | `promoteMemoToTask` 用事务：先 create Task 再 delete Memo；双 path revalidate |
| 草稿与 finalize 混淆 | UI 上仅「确定」「全部确定」触发 finalize；下拉/阅读包按钮走 `submitDraft` |

---

## 建议实施顺序

1. **Phase A**（侧边栏）— 独立可合并  
2. **Phase B**（日报+练习+候选面板）— 依赖 report 导入  
3. **Phase C**（Inbox 草稿+确定）— 依赖 candidateSync（仅 finalize）  
4. **Phase D**（Pools DnD）— 依赖 Phase C finalize 同步  
5. **Phase E**（Memo→Dashboard/Tasks）— 含 Tasks 最小列表，可与 D 并行  

---

## Self-Review

| 需求 | 任务 |
|---|---|
| 侧边栏二级导航 | Phase A Task 1 |
| 五段式日报 | Phase B Task 2-4 |
| 练习三选一 + pool/drop | Phase B Task 4 |
| 删除「摘要：」 | Phase B Task 4 + Phase C Task 5 |
| 快速补充勾选/确认/忽略 | Phase B Task 4 |
| Inbox 草稿编辑（改池/优先级/阅读包不消失） | Phase C Task 5-6 |
| 单条/全部「确定」才消失 + Pools | Phase C Task 5-6 + candidateSync |
| archive 最后 + 拖拽 | Phase D Task 7 |
| 删除 pending 筛选 | Phase D Task 7 |
| Memo 升级→Dashboard/Tasks + 删除 Memo | Phase E Task 8 |

无 TBD/占位符；核心解析、模型、同步、交互规则均已写明。
