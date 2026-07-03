# Phase C 实现计划：Inbox 分拣（写回）+ Memo

> **For agentic workers:** 使用 checkbox 逐步执行。依赖 Phase 2（`Signal`/`Candidate`/`ImportRun`）、Phase B 读视图与 Vitest。本阶段引入**写操作**（人工评审状态）与 **Memo** to-do。遵循 roadmap：service 拥有状态转换、写 `AuditLog`、DB 在导入后为人工评审的权威源。

**Goal:**
1. Inbox/Today：对当天 `Signal` 做分拣——confirm / change pool / reject、切换阅读包归属，写回 DB 并记 `AuditLog`；变更即时反映到 Dashboard。
2. Inbox/Candidate Pools：按池分组展示 `Candidate`，支持按 `humanStatus` 过滤、移动 `finalPool`。
3. Inbox/Memo：轻量 to-do（快速新增、勾选完成、删除、过滤）。

**关键设计决策（重要）——导入不得覆盖人工决定：** Phase 2 的 importer 以 `recordKey` upsert，其 `update` 会覆盖全部字段（含 `humanStatus/finalPool/readingPackStatus`）。若不改，用户在 DB 里的分拣会被下次 `npm run import` 冲掉。据 roadmap"DB 在导入后为人工评审权威源"，本阶段**修改 importer：`update` 时不覆盖人工拥有字段**（`humanStatus`、`finalPool`、`readingPackStatus`），仅在 `create` 时用 JSONL 初值播种；内容字段（title/summary/等）仍刷新。这样重入导入不清空人工分拣。

**Architecture:** 纯状态转换函数（`applyReviewAction`）易单测；Prisma 写在 `src/server/services/review.ts` / `memos.ts`；UI 通过 **Server Actions**（`"use server"`）触发变更并 `revalidatePath`。分拣控件为 client component，调用 action。

**Tech Stack:** Next.js 16（Server Actions + RSC）、Prisma/SQLite、React 18、Tailwind、Vitest。

**范围与非目标：**
- **做**：Signal 分拣写回 + AuditLog；Inbox/Today、Candidate Pools、Memo 三个页面的核心交互。
- **不做（本阶段）**：拖拽（用"移动到池"下拉替代，拖拽为后续增强）；memo→task（无 `Task` 表，标记 deferred）；写回 JSONL 导出（deferred）；`Candidate` 表的人工写回（本阶段 Candidate 页只读 + 过滤 + 通过 Signal 归池联动；Candidate 写回可后置）。

---

## 受影响文件清单

| 文件 | 变更 |
|---|---|
| `prisma/schema.prisma` | 新增 `AuditLog`、`Memo` model |
| `src/server/importers/prismaSignalRepository.ts` | `upsertSignal`/`upsertCandidate` 的 `update` 排除人工拥有字段 |
| `src/server/services/review.ts` | **新增**：`applyReviewAction`（纯）+ `reviewSignal`（Prisma + AuditLog） |
| `src/server/services/memos.ts` | **新增**：Memo CRUD service |
| `src/server/actions/reviewActions.ts` | **新增**：Server Actions（分拣） |
| `src/server/actions/memoActions.ts` | **新增**：Server Actions（Memo） |
| `src/server/services/inboxView.ts` | **新增**：Inbox/Today 列表 + Candidate 池分组读视图 |
| `src/app/inbox/today/page.tsx` | 改为 RSC + 分拣控件 |
| `src/app/inbox/pools/page.tsx` | 改为 RSC + 池分组 + 过滤 |
| `src/app/inbox/memo/page.tsx` | 改为 RSC + Memo 列表 |
| `src/components/inbox/signal-row.tsx` | **新增**：client 分拣控件 |
| `src/components/inbox/memo-list.tsx` | **新增**：client Memo 控件 |
| `src/server/__tests__/review.test.ts` | **新增**：`applyReviewAction` 单测 |
| `src/server/__tests__/memos.test.ts` | **新增**：memo 纯逻辑单测（过滤/计数） |

---

## Task 1: Prisma 新增 AuditLog + Memo；importer 保留人工字段

**Files:** Modify `prisma/schema.prisma`, `src/server/importers/prismaSignalRepository.ts`

- [ ] **Step 1: schema 追加**

```prisma
model AuditLog {
  id         String   @id @default(cuid())
  entityType String // signal | candidate | memo
  entityId   String
  action     String // confirm | change_pool | reject | toggle_reading_pack | ...
  fromValue  String?
  toValue    String?
  rationale  String?
  createdAt  DateTime @default(now())

  @@index([entityType, entityId])
}

model Memo {
  id            String   @id @default(cuid())
  text          String
  status        String   @default("open") // open | done
  sourceContext String? // daily_report | demo | manual
  linkedSignalId String?
  linkedUrl     String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@index([status])
}
```

- [ ] **Step 2: importer 保留人工拥有字段**

在 `prismaSignalRepository.ts` 的 `upsertSignal`/`upsertCandidate` 中，将 `update` 从 `{ ...rest }` 改为排除人工字段的子集。示例（signal）：
```ts
async upsertSignal(input: SignalInput & { importRunId: string }) {
  const { recordKey, humanStatus, finalPool, readingPackStatus, ...rest } = input;
  await prisma.signal.upsert({
    where: { recordKey },
    // create 播种人工初值；update 不覆盖人工拥有字段（DB 在导入后权威）
    create: { recordKey, humanStatus, finalPool, readingPackStatus, ...rest },
    update: { ...rest }
  });
}
```
`upsertCandidate` 同理排除 `humanStatus`、`finalPool`、`readingPackStatus`。

- [ ] **Step 3: db push + 回归**

Run: `npm run db:push` ；然后 `npm test`（Phase 2 测试仍应通过——注意：`runImport.test.ts` 用 fake repo，不受影响）。
Expected: 表新增；测试全绿。

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma src/server/importers/prismaSignalRepository.ts
git commit -m "feat(review): add AuditLog+Memo models; importer preserves human-owned fields"
```

---

## Task 2: 评审 service（纯转换 + Prisma + AuditLog）

**Files:** Create `src/server/services/review.ts`, `src/server/__tests__/review.test.ts`

- [ ] **Step 1: 失败测试（纯转换）**

`src/server/__tests__/review.test.ts`：
```ts
import { describe, expect, it } from "vitest";
import { applyReviewAction, type ReviewState } from "@/server/services/review";

const base: ReviewState = { humanStatus: "pending", finalPool: "knowledge_gap", readingPackStatus: "candidate" };

describe("applyReviewAction", () => {
  it("confirm keeps final pool and marks confirmed", () => {
    expect(applyReviewAction(base, { type: "confirm" })).toMatchObject({ humanStatus: "confirmed", finalPool: "knowledge_gap" });
  });

  it("change_pool sets final pool and marks changed", () => {
    expect(applyReviewAction(base, { type: "change_pool", pool: "demo_replication" })).toMatchObject({
      humanStatus: "changed",
      finalPool: "demo_replication"
    });
  });

  it("reject marks rejected", () => {
    expect(applyReviewAction(base, { type: "reject" }).humanStatus).toBe("rejected");
  });

  it("toggle_reading_pack flips selected/not_selected", () => {
    expect(applyReviewAction({ ...base, readingPackStatus: "candidate" }, { type: "toggle_reading_pack" }).readingPackStatus).toBe("selected");
    expect(applyReviewAction({ ...base, readingPackStatus: "selected" }, { type: "toggle_reading_pack" }).readingPackStatus).toBe("not_selected");
  });
});
```

- [ ] **Step 2: 实现**

`src/server/services/review.ts`：
```ts
import { prisma } from "@/server/db";

export type ReviewState = {
  humanStatus: string;
  finalPool: string | null;
  readingPackStatus: string | null;
};

export type ReviewAction =
  | { type: "confirm" }
  | { type: "change_pool"; pool: string }
  | { type: "reject" }
  | { type: "toggle_reading_pack" };

export function applyReviewAction(state: ReviewState, action: ReviewState & ReviewAction extends never ? never : ReviewAction): ReviewState {
  switch (action.type) {
    case "confirm":
      return { ...state, humanStatus: "confirmed" };
    case "change_pool":
      return { ...state, humanStatus: "changed", finalPool: action.pool };
    case "reject":
      return { ...state, humanStatus: "rejected" };
    case "toggle_reading_pack":
      return {
        ...state,
        readingPackStatus: state.readingPackStatus === "selected" ? "not_selected" : "selected"
      };
  }
}

export async function reviewSignal(signalId: string, action: ReviewAction, rationale?: string): Promise<void> {
  const signal = await prisma.signal.findUnique({ where: { id: signalId } });
  if (!signal) throw new Error(`signal not found: ${signalId}`);

  const before: ReviewState = {
    humanStatus: signal.humanStatus ?? "pending",
    finalPool: signal.finalPool,
    readingPackStatus: signal.readingPackStatus
  };
  const after = applyReviewAction(before, action);

  await prisma.$transaction([
    prisma.signal.update({ where: { id: signalId }, data: after }),
    prisma.auditLog.create({
      data: {
        entityType: "signal",
        entityId: signalId,
        action: action.type,
        fromValue: JSON.stringify(before),
        toValue: JSON.stringify(after),
        rationale: rationale ?? null
      }
    })
  ]);
}
```
> 注：`applyReviewAction` 的签名简化为 `(state: ReviewState, action: ReviewAction)`；上面的条件类型仅为防误用示意，可直接写 `action: ReviewAction`。

- [ ] **Step 3: 通过 + Commit**

Run `npm test -- review`（PASS）。
```bash
git add src/server/services/review.ts src/server/__tests__/review.test.ts
git commit -m "feat(review): add signal review action + audit log service"
```

---

## Task 3: 分拣 Server Actions + Inbox/Today 页面

**Files:** Create `src/server/actions/reviewActions.ts`, `src/components/inbox/signal-row.tsx`, `src/server/services/inboxView.ts`; Modify `src/app/inbox/today/page.tsx`

- [ ] **Step 1: Inbox 读视图 service**

`src/server/services/inboxView.ts`：
```ts
import { prisma } from "@/server/db";
import { getLatestDailyDate } from "@/server/services/dailyView";
import { parseSignalRaw, pickSummary } from "@/server/signalRaw";

export type InboxSignal = {
  id: string;
  title: string;
  url: string;
  priority: string;
  suggestedPool: string;
  finalPool: string;
  humanStatus: string;
  readingPackStatus: string;
  summary: string;
};

export async function getInboxToday(): Promise<{ date: string; signals: InboxSignal[] } | null> {
  const date = await getLatestDailyDate();
  if (!date) return null;
  const rows = await prisma.signal.findMany({
    where: { stream: "daily", date },
    orderBy: [{ priority: "asc" }, { sourceLine: "asc" }]
  });
  const signals = rows.map((s) => ({
    id: s.id,
    title: s.title ?? "(untitled)",
    url: s.originalUrl ?? s.sourceUrl ?? "",
    priority: s.priority ?? "",
    suggestedPool: s.suggestedPool ?? "",
    finalPool: s.finalPool ?? s.suggestedPool ?? "",
    humanStatus: s.humanStatus ?? "pending",
    readingPackStatus: s.readingPackStatus ?? "not_selected",
    summary: pickSummary(parseSignalRaw(s.rawJson), s.aihotSummary, s.reason)
  }));
  return { date, signals };
}

export const POOL_OPTIONS = [
  "product_inspiration",
  "paper_candidate",
  "demo_replication",
  "knowledge_gap",
  "personal_work",
  "archive",
  "drop"
] as const;
```

- [ ] **Step 2: Server Actions**

`src/server/actions/reviewActions.ts`：
```ts
"use server";

import { revalidatePath } from "next/cache";
import { reviewSignal, type ReviewAction } from "@/server/services/review";

export async function submitReview(signalId: string, action: ReviewAction, rationale?: string) {
  await reviewSignal(signalId, action, rationale);
  revalidatePath("/inbox/today");
  revalidatePath("/dashboard/today");
}
```

- [ ] **Step 3: 分拣控件（client）**

`src/components/inbox/signal-row.tsx`：
```tsx
"use client";

import { useTransition } from "react";
import { submitReview } from "@/server/actions/reviewActions";
import { POOL_OPTIONS, type InboxSignal } from "@/server/services/inboxView";

export function SignalRow({ signal }: { signal: InboxSignal }) {
  const [pending, startTransition] = useTransition();

  const run = (fn: () => Promise<void>) => startTransition(() => void fn());

  return (
    <li className="rounded-md border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span className="rounded bg-muted px-2 py-0.5 font-medium">{signal.priority || "—"}</span>
        <span className="rounded bg-muted px-2 py-0.5">pool: {signal.finalPool}</span>
        <span className="rounded bg-muted px-2 py-0.5">status: {signal.humanStatus}</span>
        <span className="rounded bg-muted px-2 py-0.5">pack: {signal.readingPackStatus}</span>
      </div>
      <a href={signal.url} target="_blank" rel="noreferrer" className="mt-2 block font-semibold text-foreground hover:underline">
        {signal.title}
      </a>
      {signal.summary && <p className="mt-1 text-sm text-muted-foreground">摘要：{signal.summary}</p>}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          disabled={pending}
          onClick={() => run(() => submitReview(signal.id, { type: "confirm" }))}
          className="rounded border border-border px-2 py-1 text-sm hover:bg-muted disabled:opacity-50"
        >
          确认
        </button>
        <button
          disabled={pending}
          onClick={() => run(() => submitReview(signal.id, { type: "reject" }))}
          className="rounded border border-border px-2 py-1 text-sm hover:bg-muted disabled:opacity-50"
        >
          拒绝
        </button>
        <button
          disabled={pending}
          onClick={() => run(() => submitReview(signal.id, { type: "toggle_reading_pack" }))}
          className="rounded border border-border px-2 py-1 text-sm hover:bg-muted disabled:opacity-50"
        >
          {signal.readingPackStatus === "selected" ? "移出阅读包" : "加入阅读包"}
        </button>
        <select
          disabled={pending}
          defaultValue=""
          onChange={(e) => {
            const pool = e.target.value;
            if (pool) run(() => submitReview(signal.id, { type: "change_pool", pool }));
          }}
          className="rounded border border-border bg-surface px-2 py-1 text-sm"
        >
          <option value="" disabled>
            改池…
          </option>
          {POOL_OPTIONS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>
    </li>
  );
}
```

- [ ] **Step 4: 页面**

`src/app/inbox/today/page.tsx`（替换现有空状态实现）：
```tsx
import { Inbox } from "lucide-react";
import { WorkbenchPage } from "@/components/layout/workbench-page";
import { SignalRow } from "@/components/inbox/signal-row";
import { getInboxToday } from "@/server/services/inboxView";

export const dynamic = "force-dynamic";

export default async function InboxTodayPage() {
  const data = await getInboxToday();

  if (!data) {
    return (
      <WorkbenchPage
        eyebrow="Daily triage"
        title="Today"
        description="Route today's signals into candidate pools and toggle reading-pack membership. Changes flow to Dashboard."
        metrics={[
          { label: "Signals", value: "-", detail: "Run npm run import" },
          { label: "Pending", value: "-", detail: "—" },
          { label: "In pack", value: "-", detail: "—" }
        ]}
        emptyState={{
          icon: Inbox,
          title: "No signals to triage",
          description: "Import daily state (npm run import) to start triaging today's signals.",
          actions: [{ icon: Inbox, label: "Import pipeline", tone: "primary" }]
        }}
      />
    );
  }

  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">Daily triage</p>
        <h2 className="mt-3 text-4xl font-semibold text-foreground">Today · {data.date}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          归池 / 确认 / 拒绝 / 切换阅读包；变更即时反映到 Dashboard。
        </p>
      </div>
      <ul className="flex flex-col gap-3">
        {data.signals.map((s) => (
          <SignalRow key={s.id} signal={s} />
        ))}
      </ul>
    </section>
  );
}
```

- [ ] **Step 5: 构建 + Commit**

Run: `npm run build`（含 Server Actions / typedRoutes 校验）。
```bash
git add src/server/services/inboxView.ts src/server/actions/reviewActions.ts src/components/inbox/signal-row.tsx src/app/inbox/today/page.tsx
git commit -m "feat(inbox): triage today's signals with server actions + audit"
```

---

## Task 4: Candidate Pools 页面（分组 + 过滤，只读 + 通过 Signal 联动）

**Files:** Modify `src/app/inbox/pools/page.tsx`; extend `src/server/services/inboxView.ts`

- [ ] **Step 1: 池分组读视图**

在 `inboxView.ts` 追加：
```ts
export type PoolGroup = { poolName: string; items: { id: string; title: string; url: string; humanStatus: string; priority: string }[] };

export async function getCandidatePools(humanStatus?: string): Promise<PoolGroup[]> {
  const rows = await prisma.candidate.findMany({
    where: humanStatus ? { humanStatus } : undefined,
    orderBy: [{ poolName: "asc" }, { priority: "asc" }]
  });
  const map = new Map<string, PoolGroup>();
  for (const c of rows) {
    const key = c.poolName;
    if (!map.has(key)) map.set(key, { poolName: key, items: [] });
    map.get(key)!.items.push({
      id: c.id,
      title: c.title ?? "(untitled)",
      url: c.originalUrl ?? c.sourceUrl ?? "",
      humanStatus: c.humanStatus ?? "pending",
      priority: c.priority ?? ""
    });
  }
  return [...map.values()];
}
```

- [ ] **Step 2: 页面（分组渲染 + human_status 过滤链接）**

`src/app/inbox/pools/page.tsx`：渲染 `getCandidatePools(searchParams.status)`，每个 `PoolGroup` 一个区块，列出条目（标题+链接+humanStatus+priority）；顶部提供 All/pending/confirmed/changed/rejected 过滤（用 `?status=` 查询参数 + `<Link>`）。无数据回退空状态。（完整实现照 Task 3 页面模式：`export const dynamic="force-dynamic"`，async RSC，`searchParams` 读取 status。）

> 说明：本阶段 Candidate 页为**只读 + 过滤**。候选项的池移动通过 Inbox/Today 对 `Signal` 的 change_pool 实现；`Candidate` 表自身的写回（drag-drop 移动）作为后续增强。

- [ ] **Step 3: 构建 + Commit**

Run `npm run build`。
```bash
git add src/server/services/inboxView.ts src/app/inbox/pools/page.tsx
git commit -m "feat(inbox): candidate pools grouped view with status filter"
```

---

## Task 5: Memo（service + Server Actions + 页面）

**Files:** Create `src/server/services/memos.ts`, `src/server/actions/memoActions.ts`, `src/components/inbox/memo-list.tsx`, `src/server/__tests__/memos.test.ts`; Modify `src/app/inbox/memo/page.tsx`

- [ ] **Step 1: 纯过滤/计数单测**

`src/server/__tests__/memos.test.ts`：
```ts
import { describe, expect, it } from "vitest";
import { filterMemos, countMemos, type MemoItem } from "@/server/services/memos";

const memos: MemoItem[] = [
  { id: "1", text: "a", status: "open" },
  { id: "2", text: "b", status: "done" },
  { id: "3", text: "c", status: "open" }
];

describe("memos pure helpers", () => {
  it("filters by status", () => {
    expect(filterMemos(memos, "open").map((m) => m.id)).toEqual(["1", "3"]);
    expect(filterMemos(memos, "done").map((m) => m.id)).toEqual(["2"]);
    expect(filterMemos(memos, "all")).toHaveLength(3);
  });
  it("counts open/done", () => {
    expect(countMemos(memos)).toEqual({ open: 2, done: 1, total: 3 });
  });
});
```

- [ ] **Step 2: service**

`src/server/services/memos.ts`：
```ts
import { prisma } from "@/server/db";

export type MemoItem = { id: string; text: string; status: string };
export type MemoFilter = "all" | "open" | "done";

export function filterMemos(memos: MemoItem[], filter: MemoFilter): MemoItem[] {
  if (filter === "all") return memos;
  return memos.filter((m) => m.status === filter);
}

export function countMemos(memos: MemoItem[]): { open: number; done: number; total: number } {
  const open = memos.filter((m) => m.status === "open").length;
  const done = memos.filter((m) => m.status === "done").length;
  return { open, done, total: memos.length };
}

export async function listMemos(): Promise<MemoItem[]> {
  const rows = await prisma.memo.findMany({ orderBy: { createdAt: "desc" } });
  return rows.map((m) => ({ id: m.id, text: m.text, status: m.status }));
}

export async function createMemo(text: string): Promise<void> {
  const trimmed = text.trim();
  if (!trimmed) return;
  await prisma.memo.create({ data: { text: trimmed, sourceContext: "manual" } });
}

export async function toggleMemo(id: string): Promise<void> {
  const memo = await prisma.memo.findUnique({ where: { id } });
  if (!memo) return;
  await prisma.memo.update({ where: { id }, data: { status: memo.status === "open" ? "done" : "open" } });
}

export async function deleteMemo(id: string): Promise<void> {
  await prisma.memo.delete({ where: { id } });
}
```
> memo→task / memo→knowledge_gap 需 `Task` 表与归池写回，属后续增强，本阶段不做。

- [ ] **Step 3: Server Actions**

`src/server/actions/memoActions.ts`：
```ts
"use server";

import { revalidatePath } from "next/cache";
import { createMemo, toggleMemo, deleteMemo } from "@/server/services/memos";

export async function addMemoAction(formData: FormData) {
  await createMemo(String(formData.get("text") ?? ""));
  revalidatePath("/inbox/memo");
}

export async function toggleMemoAction(id: string) {
  await toggleMemo(id);
  revalidatePath("/inbox/memo");
}

export async function deleteMemoAction(id: string) {
  await deleteMemo(id);
  revalidatePath("/inbox/memo");
}
```

- [ ] **Step 4: client 列表 + 页面**

`src/components/inbox/memo-list.tsx`（client）：快速输入 `<form action={addMemoAction}>` 含 `<input name="text">`；列表每条含勾选（`toggleMemoAction`）与删除（`deleteMemoAction`），用 `useTransition`；过滤 All/Open/Done 用本地 state 或 `?filter=`。

`src/app/inbox/memo/page.tsx`：async RSC，`export const dynamic="force-dynamic"`，`listMemos()` + `countMemos`，渲染 `<MemoList memos=... counts=... />`；空列表显示提示。

（完整实现照前述 client-action 模式；结构与 Task 3 一致。）

- [ ] **Step 5: 通过 + 构建 + Commit**

Run `npm test -- memos` && `npm run build`。
```bash
git add src/server/services/memos.ts src/server/actions/memoActions.ts src/components/inbox/memo-list.tsx src/app/inbox/memo/page.tsx src/server/__tests__/memos.test.ts
git commit -m "feat(inbox): memo to-do (create/toggle/delete/filter)"
```

---

## Task 6: 端到端验证

- [ ] **Step 1:** `npm run import`（若空）。
- [ ] **Step 2:** `npm run dev`；用 computerUse：
  - Inbox/Today：对一条信号点"确认""改池""加入阅读包"，回到 Dashboard/Today 确认阅读包/计数变化（联动）。
  - 再跑一次 `npm run import`，确认人工分拣**未被重置**（验证 Task 1 importer 保留逻辑）。
  - Inbox/Memo：新增两条、勾选一条、删除一条、切换过滤。
  录屏留证。
- [ ] **Step 3:** 全量门：`npm test` && `npm run lint` && `npm run build`（build 后如需再 typecheck）。
- [ ] **Step 4:** 审计验证：查询 `AuditLog` 有分拣记录。

---

## 验收标准

- Inbox/Today 可对当天信号 confirm/change_pool/reject/toggle_reading_pack，写回 DB 并生成 `AuditLog`；Dashboard/Today 即时反映（revalidatePath）。
- 重入 `npm run import` **不覆盖**人工的 `humanStatus/finalPool/readingPackStatus`。
- Candidate Pools 按池分组并可按 `humanStatus` 过滤。
- Memo 可新增/勾选/删除/过滤，计数正确。
- 纯函数 `applyReviewAction`/`filterMemos`/`countMemos` 有单测；`npm test`/`lint`/`build` 通过。

## 风险与缓解

- **导入覆盖人工状态**（核心风险）：Task 1 importer `update` 排除人工字段；Task 6 Step 2 显式回归验证。
- **Server Actions + typedRoutes**：以 `npm run build` 校验。
- **Candidate 写回未做**：本阶段 Candidate 页只读；池移动经 Signal.change_pool；后续增强 Candidate 直接写回与拖拽。
- **RSC 缓存**：读 DB 页面用 `dynamic="force-dynamic"` + 写操作后 `revalidatePath`。

## Self-Review

- 覆盖 nav Phase C 的 Inbox 分拣 + Memo；拖拽 / memo→task / JSONL 导出明确为后续增强。
- 关键设计（导入不覆盖人工决定）已在决策段与 Task 1/Task 6 落实并回归。
- 类型链一致：`ReviewState`/`ReviewAction`/`applyReviewAction`/`reviewSignal`（Task2）→ `submitReview`（Task3 actions）→ `InboxSignal`/`SignalRow`（Task3）；`MemoItem`/`filterMemos`/`countMemos`/service（Task5）→ actions → 组件。
- 无占位符：模型、service、纯函数、actions、主组件给出完整代码；Candidate/Memo 页面以既定模式描述并复用 Task3 的完整范式。
