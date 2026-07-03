# Phase B 后半实现计划：Dashboard/Today 读视图

> **For agentic workers:** 使用 checkbox 逐步执行。本计划是 nav-restructure `Phase B` 的后半（前半 = roadmap Phase 2 数据导入层，已完成）。依赖已存在的 `Signal` 表（`stream="daily"`）与 Vitest 工具链。**只读**，不做写操作（写在 Phase C）。

**Goal:** 让 `Dashboard/Today` 从已导入的 `Signal`（daily 流、最新日期）渲染"30 分钟阅读包"、每条事实摘要、以及"待归类 N 条 → Inbox"的非阻塞提示条与候选补充列表；无数据时回退到现有空状态。

**Architecture:** 纯函数（`buildReadingView` / `parseSignalRaw`）负责选取与字段抽取，易单测；薄 Prisma 查询在 `src/server/services/dailyView.ts`；页面为 App Router Server Component，直接 `await` service。遵循 roadmap 分层：UI 不读文件、不写 JSONL。

**Tech Stack:** Next.js 16 App Router（RSC）、Prisma/SQLite、React 18、Tailwind、Vitest。

**范围与非目标：**
- **做**：Dashboard/Today 阅读包 + 计数 + 提示条 + 候选补充列表（只读展示）。
- **不做（本阶段）**：五段式方向判断与"今日练习"（这些只存在于 `state/daily/*-report.md`，未导入 `Signal`——它是 per-link 数据；留待后续导入 report 或新状态文件）；Weekly/Monthly（周报/月报未导入，保持空状态）；任何写操作（归池/勾选阅读包在 Phase C）。

---

## 数据事实（决定读取逻辑）

`Signal`（Phase 2）已映射列：`stream, externalId, date, title, sourceUrl, originalUrl, priority, suggestedPool, finalPool, humanStatus, readingPackStatus, duplicateStatus, practiceFit, reason, aihotSummary, codexSummary, rawJson, ...`。

- 阅读包 = `stream="daily"` 且 `readingPackStatus="selected"`。
- 候选补充 = `readingPackStatus="candidate"`。
- 每条摘要优先级：`display_summary`（在 `rawJson`，prompt 变更后才有）→ `aihotSummary` → `reason`。因此摘要抽取需从 `rawJson` 兜底解析。
- 类别：`priority`（P0/P1/…）+ `practiceFit`/来源判断 GitHub 项目（本阶段直接用 `priority` 分组，GitHub 归类留待字段完善）。
- "最新日期"：`Signal` 的 `date` 字段字符串（如 `2026-07-02`）取最大值。

---

## 受影响文件清单

| 文件 | 变更 |
|---|---|
| `src/server/signalRaw.ts` | **新增**：纯函数 `parseSignalRaw`（从 rawJson 抽取展示字段 + 摘要兜底） |
| `src/server/services/dailyView.ts` | **新增**：`getLatestDailyDate` + `getDailyReadingView`（Prisma 查询）+ 纯 `buildReadingView` |
| `src/app/dashboard/today/page.tsx` | 改为 async RSC：有数据渲染阅读包/提示条/候选列表，无数据回退空状态 |
| `src/components/dashboard/reading-pack.tsx` | **新增**：阅读包列表展示组件 |
| `src/server/__tests__/signalRaw.test.ts` | **新增**：抽取单测 |
| `src/server/__tests__/dailyView.test.ts` | **新增**：`buildReadingView` 纯逻辑单测 |

不改 Prisma schema、importer、其它页面。

---

## Task 1: 纯函数 `parseSignalRaw`

**Files:** Create `src/server/signalRaw.ts`, `src/server/__tests__/signalRaw.test.ts`

- [ ] **Step 1: 失败测试**

`src/server/__tests__/signalRaw.test.ts`：
```ts
import { describe, expect, it } from "vitest";
import { parseSignalRaw, pickSummary } from "@/server/signalRaw";

describe("parseSignalRaw", () => {
  it("parses known display fields from rawJson", () => {
    const raw = JSON.stringify({ display_summary: "ds", read_reason: "rr", focus_direction: "fd" });
    const r = parseSignalRaw(raw);
    expect(r.displaySummary).toBe("ds");
    expect(r.readReason).toBe("rr");
    expect(r.focusDirection).toBe("fd");
  });

  it("returns empty object for invalid json", () => {
    expect(parseSignalRaw("{bad}")).toEqual({});
  });
});

describe("pickSummary", () => {
  it("prefers display_summary, then aihot_summary, then reason", () => {
    expect(pickSummary({ displaySummary: "d" }, "a", "r")).toBe("d");
    expect(pickSummary({}, "a", "r")).toBe("a");
    expect(pickSummary({}, null, "r")).toBe("r");
    expect(pickSummary({}, null, null)).toBe("");
  });
});
```

- [ ] **Step 2: 实现**

`src/server/signalRaw.ts`：
```ts
export type SignalRawFields = {
  displaySummary?: string;
  readReason?: string;
  focusDirection?: string;
  knownFacts?: string;
  openQuestions?: string;
  noveltyReason?: string;
};

const str = (v: unknown): string | undefined => (typeof v === "string" ? v : undefined);

export function parseSignalRaw(rawJson: string): SignalRawFields {
  let obj: Record<string, unknown>;
  try {
    obj = JSON.parse(rawJson) as Record<string, unknown>;
  } catch {
    return {};
  }
  return {
    displaySummary: str(obj.display_summary),
    readReason: str(obj.read_reason),
    focusDirection: str(obj.focus_direction),
    knownFacts: str(obj.known_facts),
    openQuestions: str(obj.open_questions),
    noveltyReason: str(obj.novelty_reason)
  };
}

export function pickSummary(
  raw: SignalRawFields,
  aihotSummary: string | null,
  reason: string | null
): string {
  return raw.displaySummary ?? aihotSummary ?? reason ?? "";
}
```

- [ ] **Step 3: 通过 + Commit**

Run `npm test -- signalRaw`（PASS）。
```bash
git add src/server/signalRaw.ts src/server/__tests__/signalRaw.test.ts
git commit -m "feat(dashboard): add signal rawJson field extractor"
```

---

## Task 2: 日报读视图 service（纯 `buildReadingView` + Prisma 查询）

**Files:** Create `src/server/services/dailyView.ts`, `src/server/__tests__/dailyView.test.ts`

- [ ] **Step 1: 失败测试（纯逻辑）**

`src/server/__tests__/dailyView.test.ts`：
```ts
import { describe, expect, it } from "vitest";
import { buildReadingView, type SignalLike } from "@/server/services/dailyView";

const s = (o: Partial<SignalLike>): SignalLike => ({
  title: "t",
  originalUrl: null,
  sourceUrl: "u",
  priority: "P1",
  suggestedPool: "knowledge_gap",
  finalPool: "knowledge_gap",
  readingPackStatus: "candidate",
  aihotSummary: "a",
  reason: "r",
  rawJson: "{}",
  ...o
});

describe("buildReadingView", () => {
  it("splits selected pack, candidates, and remaining with counts", () => {
    const view = buildReadingView([
      s({ readingPackStatus: "selected", title: "P" }),
      s({ readingPackStatus: "candidate", title: "C" }),
      s({ readingPackStatus: "not_selected", title: "N" })
    ]);
    expect(view.readingPack.map((x) => x.title)).toEqual(["P"]);
    expect(view.candidates.map((x) => x.title)).toEqual(["C"]);
    expect(view.selectedCount).toBe(1);
    expect(view.candidateCount).toBe(1);
    expect(view.remainingCount).toBe(2); // candidate + not_selected
  });

  it("resolves summary and link from raw/fallbacks", () => {
    const view = buildReadingView([
      s({ readingPackStatus: "selected", originalUrl: "orig", rawJson: JSON.stringify({ display_summary: "ds" }) })
    ]);
    expect(view.readingPack[0].summary).toBe("ds");
    expect(view.readingPack[0].url).toBe("orig");
  });
});
```

- [ ] **Step 2: 实现**

`src/server/services/dailyView.ts`：
```ts
import { prisma } from "@/server/db";
import { parseSignalRaw, pickSummary } from "@/server/signalRaw";

export type SignalLike = {
  title: string | null;
  originalUrl: string | null;
  sourceUrl: string | null;
  priority: string | null;
  suggestedPool: string | null;
  finalPool: string | null;
  readingPackStatus: string | null;
  aihotSummary: string | null;
  reason: string | null;
  rawJson: string;
};

export type SignalView = {
  title: string;
  url: string;
  priority: string;
  pool: string;
  summary: string;
  readReason?: string;
  focusDirection?: string;
  knownFacts?: string;
  openQuestions?: string;
  isKnowledgeGap: boolean;
};

export type DailyReadingView = {
  readingPack: SignalView[];
  candidates: SignalView[];
  selectedCount: number;
  candidateCount: number;
  remainingCount: number;
};

function toView(s: SignalLike): SignalView {
  const raw = parseSignalRaw(s.rawJson);
  const pool = s.finalPool ?? s.suggestedPool ?? "";
  return {
    title: s.title ?? "(untitled)",
    url: s.originalUrl ?? s.sourceUrl ?? "",
    priority: s.priority ?? "",
    pool,
    summary: pickSummary(raw, s.aihotSummary, s.reason),
    readReason: raw.readReason,
    focusDirection: raw.focusDirection,
    knownFacts: raw.knownFacts,
    openQuestions: raw.openQuestions,
    isKnowledgeGap: pool === "knowledge_gap"
  };
}

export function buildReadingView(signals: SignalLike[]): DailyReadingView {
  const readingPack = signals.filter((s) => s.readingPackStatus === "selected").map(toView);
  const candidates = signals.filter((s) => s.readingPackStatus === "candidate").map(toView);
  const remainingCount = signals.filter((s) => s.readingPackStatus !== "selected").length;
  return {
    readingPack,
    candidates,
    selectedCount: readingPack.length,
    candidateCount: candidates.length,
    remainingCount
  };
}

export async function getLatestDailyDate(): Promise<string | null> {
  const row = await prisma.signal.findFirst({
    where: { stream: "daily" },
    orderBy: { date: "desc" },
    select: { date: true }
  });
  return row?.date ?? null;
}

export async function getDailyReadingView(date?: string): Promise<{ date: string; view: DailyReadingView } | null> {
  const targetDate = date ?? (await getLatestDailyDate());
  if (!targetDate) return null;
  const signals = await prisma.signal.findMany({
    where: { stream: "daily", date: targetDate },
    orderBy: [{ priority: "asc" }, { sourceLine: "asc" }]
  });
  return { date: targetDate, view: buildReadingView(signals) };
}
```

- [ ] **Step 3: 通过 + Commit**

Run `npm test -- dailyView`（PASS）。
```bash
git add src/server/services/dailyView.ts src/server/__tests__/dailyView.test.ts
git commit -m "feat(dashboard): add daily reading-view service"
```

---

## Task 3: 阅读包组件 + Dashboard/Today 页面

**Files:** Create `src/components/dashboard/reading-pack.tsx`; Modify `src/app/dashboard/today/page.tsx`

- [ ] **Step 1: 阅读包组件**

`src/components/dashboard/reading-pack.tsx`：
```tsx
import type { SignalView } from "@/server/services/dailyView";

export function ReadingPack({ items }: { items: SignalView[] }) {
  return (
    <ul className="flex flex-col gap-4">
      {items.map((item, i) => (
        <li key={i} className="rounded-md border border-border bg-surface p-4">
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span className="rounded bg-muted px-2 py-0.5 font-medium">{item.priority || "—"}</span>
            <span className="rounded bg-muted px-2 py-0.5">{item.pool || "—"}</span>
          </div>
          <a
            href={item.url}
            target="_blank"
            rel="noreferrer"
            className="mt-2 block text-base font-semibold text-foreground hover:underline"
          >
            {item.title}
          </a>
          {item.summary && <p className="mt-2 text-sm leading-6 text-muted-foreground">摘要：{item.summary}</p>}
          {item.isKnowledgeGap ? (
            <>
              {item.knownFacts && <p className="mt-1 text-sm text-muted-foreground">文章可获得的事实：{item.knownFacts}</p>}
              {item.openQuestions && <p className="mt-1 text-sm text-muted-foreground">需要额外研究的问题：{item.openQuestions}</p>}
            </>
          ) : (
            <>
              {item.readReason && <p className="mt-1 text-sm text-muted-foreground">推荐阅读原因：{item.readReason}</p>}
              {item.focusDirection && <p className="mt-1 text-sm text-muted-foreground">关注方向：{item.focusDirection}</p>}
            </>
          )}
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 2: 页面（有数据渲染，无数据回退空状态）**

`src/app/dashboard/today/page.tsx`：
```tsx
import Link from "next/link";
import { BookOpen, CheckCircle2, ListChecks } from "lucide-react";
import { WorkbenchPage } from "@/components/layout/workbench-page";
import { ReadingPack } from "@/components/dashboard/reading-pack";
import { getDailyReadingView } from "@/server/services/dailyView";

export const dynamic = "force-dynamic";

export default async function TodayPage() {
  const data = await getDailyReadingView();

  if (!data || data.view.selectedCount === 0) {
    return (
      <WorkbenchPage
        eyebrow="Daily command center"
        title="Today"
        description="Read the latest radar, review the 30-minute pack, choose one practice, and confirm routing suggestions."
        metrics={[
          { label: "Reading pack", value: "-", detail: "Run npm run import to load daily state" },
          { label: "Remaining links", value: "-", detail: "No active daily state" },
          { label: "Practice choice", value: "-", detail: "Not selected" }
        ]}
        emptyState={{
          icon: BookOpen,
          title: "No imported daily report yet",
          description:
            "Import state/daily/*-links.jsonl (npm run import), then this page renders the reading pack and remaining links.",
          actions: [
            { icon: ListChecks, label: "Import pipeline", tone: "primary" },
            { icon: CheckCircle2, label: "Codex automation remains source" }
          ]
        }}
      />
    );
  }

  const { date, view } = data;
  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div className="max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">Daily command center</p>
        <h2 className="mt-3 text-4xl font-semibold text-foreground">Today · {date}</h2>
      </div>

      <div className="rounded-md border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
        AI 已选 {view.selectedCount} 条进入阅读包 · 另有 {view.remainingCount} 条待归类 →{" "}
        <Link href="/inbox/today" className="font-medium text-primary hover:underline">
          去 Inbox 分拣
        </Link>
      </div>

      <div>
        <h3 className="mb-3 text-xl font-semibold text-foreground">今日 30 分钟阅读包</h3>
        <ReadingPack items={view.readingPack} />
      </div>

      {view.candidates.length > 0 && (
        <div>
          <h3 className="mb-3 text-xl font-semibold text-foreground">
            快速补充（候选 {view.candidateCount} 条）
          </h3>
          <ul className="flex flex-col gap-2">
            {view.candidates.map((item, i) => (
              <li key={i} className="rounded-md border border-dashed border-border bg-surface px-3 py-2 text-sm">
                <a href={item.url} target="_blank" rel="noreferrer" className="font-medium text-foreground hover:underline">
                  {item.title}
                </a>
                <span className="ml-2 text-muted-foreground">{item.pool}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted-foreground">
            勾选加入阅读包的交互在 Inbox/Today（Phase C）。
          </p>
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 3: 构建校验**

Run: `npm run build`
Expected: 通过；`/dashboard/today` 编译无误（`force-dynamic` 因读取 DB）。

- [ ] **Step 4: Commit**

```bash
git add src/components/dashboard/reading-pack.tsx src/app/dashboard/today/page.tsx
git commit -m "feat(dashboard): render Today reading pack from imported signals"
```

---

## Task 4: 端到端手动验证（真实数据）

- [ ] **Step 1:** `npm run import`（若 DB 为空）。
- [ ] **Step 2:** `npm run dev`，用 computerUse 打开 `/dashboard/today`，确认：阅读包按 selected 渲染、每条有摘要、knowledge_gap 显示"事实/问题"（若数据含新字段）、顶部提示条显示计数并可跳 Inbox。截图/录屏留证。
- [ ] **Step 3:** 全量门：`npm test` && `npm run lint` && `npm run build`（build 后如需再 `npm run typecheck`）。

---

## 验收标准

- 有数据时 `/dashboard/today` 显示日期、阅读包（selected）、每条事实摘要、非阻塞"待归类 N 条 → Inbox"提示、候选补充列表；无数据回退空状态。
- knowledge_gap 条目显示"事实/待研究问题"，非 knowledge_gap 显示"推荐阅读原因/关注方向"（取决于 rawJson 是否含新字段；无则仅摘要）。
- 纯函数 `buildReadingView`/`parseSignalRaw` 有单测；页面只读、无写操作。
- `npm test` / `lint` / `build` 通过。

## 风险与缓解

- **摘要字段缺失**：旧数据无 `display_summary` → `pickSummary` 兜底 `aihotSummary`/`reason`。
- **RSC 读 DB**：`export const dynamic = "force-dynamic"` 避免构建期静态化空数据。
- **五段式/练习缺数据**：本阶段不做，避免臆造；后续导入 report.md 或新状态文件再补。

## Self-Review

- 覆盖 nav Phase B 后半的可做部分（Dashboard/Today 读视图），明确 Weekly/Monthly/五段式/练习为后置且给出原因。
- 类型链一致：`SignalRawFields`（Task1）→ `SignalLike`/`SignalView`/`DailyReadingView`/`buildReadingView`/`getDailyReadingView`（Task2）→ 组件与页面（Task3）。
- 无占位符：核心模块与页面给出完整代码；重复 UI 以完整代表性组件给出。
