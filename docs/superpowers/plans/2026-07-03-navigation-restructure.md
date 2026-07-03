# 导航重构实现计划（Navigation Restructure Implementation Plan）

> **For agentic workers:** 本计划配合 spec `docs/superpowers/specs/2026-07-03-navigation-restructure-design.md`。使用 checkbox（`- [ ]`）逐步执行。本仓库**无单元测试框架**（无 `test` 脚本/测试文件），因此每个任务的验证步骤使用 `npm run lint` / `npm run typecheck` / `npm run build` + 手动导航检查作为质量门（与 roadmap 的 "UI smoke tests" 一致）。

**Goal:** 将平铺 9 项导航重构为「Dashboard / Inbox / Library / Settings」4 区两级导航，迁移现有页面、新增 Weekly/Monthly、把 Automations 并入 Settings、把 Focus Rules 移入 Settings，并同步文档。

**Architecture:** Next.js App Router 嵌套段；根 `layout.tsx` 渲染顶部横向主导航（TopNav），每区 `layout.tsx` 渲染二级 tab（SectionNav）。导航数据集中在 `src/shared/navigation.ts` 的两级模型。页面继续复用 `WorkbenchPage` 空状态组件。`next.config.mjs` 已开启 `typedRoutes`，每步用 `build` 校验路由类型。

**Tech Stack:** Next.js 16、React 18、TypeScript 5.7、Tailwind、lucide-react。

**本次实现范围：** 仅 **Phase A（导航重构 skeleton）**（Task 1–13）。Phase B–E 为后续阶段大纲（依赖数据导入层），落地时各自出独立详细计划。

---

## 受影响文件清单（本次修改需要更改的文件/目录）

### 根目录（repo root）文件

| 文件 | 变更 | 原因 |
|---|---|---|
| `next.config.mjs` | 仅校验（通常无需改动） | `typedRoutes: true`，路由重组后需 `build` 通过；若新增顶层段导致类型问题才微调 | 
| `README.md` | 可选：更新一句"当前页面结构" | 保持根级文档与新 IA 一致（非强制） |
| `AGENTS.md` | 不改 | 与导航无关 |
| `package.json` / `tsconfig.json` / `tailwind.config.ts` / `postcss.config.mjs` / `eslint.config.mjs` | 不改 | 无新依赖、无配置变化 |

> 结论：**唯一可能改动的根目录代码文件是 `next.config.mjs`（大概率只需校验不改）**；`README.md` 为可选文档同步。其余根目录文件不动。

### `src/` 目录

| 文件 | 变更 |
|---|---|
| `src/shared/navigation.ts` | 重写为两级 `navigationSections` 模型 + `findSectionByPath` |
| `src/components/layout/top-nav.tsx` | **新增**：顶部横向 4 区 |
| `src/components/layout/section-nav.tsx` | **新增**：当前区二级 tab |
| `src/components/layout/navigation-list.tsx` | **删除**（被上面两者取代） |
| `src/components/layout/app-shell.tsx` | 改为「顶栏主导航 + 主内容」布局（去掉固定左侧栏） |
| `src/components/layout/workbench-page.tsx` | 不改（继续复用） |
| `src/app/layout.tsx` | 不改（仍包 `AppShell`） |
| `src/app/page.tsx` | 重定向 `/` → `/dashboard/today` |
| `src/app/dashboard/layout.tsx` | **新增** SectionNav |
| `src/app/dashboard/today/page.tsx` | 由 `src/app/today/page.tsx` 迁移 |
| `src/app/dashboard/weekly/page.tsx` | **新增** 空状态 |
| `src/app/dashboard/monthly/page.tsx` | **新增** 空状态 |
| `src/app/dashboard/tasks/page.tsx` | 由 `src/app/tasks/page.tsx` 迁移 |
| `src/app/inbox/layout.tsx` | **新增** SectionNav |
| `src/app/inbox/today/page.tsx` | 由 `src/app/review/page.tsx` 迁移并重定位 |
| `src/app/inbox/pools/page.tsx` | 由 `src/app/pools/page.tsx` 迁移 |
| `src/app/library/layout.tsx` | **新增** SectionNav |
| `src/app/library/reports/page.tsx` | 由 `src/app/reports/page.tsx` 迁移 |
| `src/app/library/artifacts/page.tsx` | 由 `src/app/artifacts/page.tsx` 迁移 |
| `src/app/settings/layout.tsx` | **新增** SectionNav |
| `src/app/settings/page.tsx` | 改为 General + Automations 只读面板（并入 `src/app/automations/page.tsx` 内容） |
| `src/app/settings/focus-rules/page.tsx` | 由 `src/app/focus-rules/page.tsx` 迁移 |
| 旧目录 `src/app/{today,tasks,review,pools,reports,artifacts,focus-rules,automations}` | **删除**（迁移后清空） |

### `docs/` 目录

| 文件 | 变更 |
|---|---|
| `docs/workbench-design.md` | §6 UI Navigation 更新为 4 区 IA |
| `docs/cortexops-ai-system-roadmap.md` | "Core pages" 列表更新为新结构 |

---

## Task 1: 重写导航数据模型

**Files:**
- Modify: `src/shared/navigation.ts`（整文件替换）

- [ ] **Step 1: 写入两级导航模型**

```ts
import type { Route } from "next";
import type { LucideIcon } from "lucide-react";
import {
  Archive,
  BookOpen,
  CalendarClock,
  CalendarDays,
  CalendarRange,
  FileText,
  Inbox,
  KanbanSquare,
  Library,
  Settings,
  SlidersHorizontal,
  Sparkles
} from "lucide-react";

export type NavChild = { href: Route; label: string; icon: LucideIcon };
export type NavSection = {
  key: string;
  label: string;
  icon: LucideIcon;
  basePath: string;
  children: NavChild[];
};

export const navigationSections: NavSection[] = [
  {
    key: "dashboard",
    label: "Dashboard",
    icon: BookOpen,
    basePath: "/dashboard",
    children: [
      { href: "/dashboard/today", label: "Today", icon: CalendarDays },
      { href: "/dashboard/weekly", label: "Weekly", icon: CalendarRange },
      { href: "/dashboard/monthly", label: "Monthly", icon: CalendarClock },
      { href: "/dashboard/tasks", label: "Tasks", icon: KanbanSquare }
    ]
  },
  {
    key: "inbox",
    label: "Inbox",
    icon: Inbox,
    basePath: "/inbox",
    children: [
      { href: "/inbox/today", label: "Today", icon: CalendarDays },
      { href: "/inbox/pools", label: "Candidate Pools", icon: Archive }
    ]
  },
  {
    key: "library",
    label: "Library",
    icon: Library,
    basePath: "/library",
    children: [
      { href: "/library/reports", label: "Reports", icon: FileText },
      { href: "/library/artifacts", label: "Artifacts", icon: Sparkles }
    ]
  },
  {
    key: "settings",
    label: "Settings",
    icon: Settings,
    basePath: "/settings",
    children: [
      { href: "/settings", label: "General", icon: Settings },
      { href: "/settings/focus-rules", label: "Focus Rules", icon: SlidersHorizontal }
    ]
  }
];

// 顶栏点击落地到每区第一个子页
export function sectionLandingHref(section: NavSection): Route {
  return section.children[0].href;
}

// 按最长 basePath 前缀匹配当前区（避免 /settings 与其它冲突）
export function findSectionByPath(pathname: string): NavSection | undefined {
  return [...navigationSections]
    .sort((a, b) => b.basePath.length - a.basePath.length)
    .find((s) => pathname === s.basePath || pathname.startsWith(`${s.basePath}/`));
}
```

- [ ] **Step 2: 校验**

Run: `npm run typecheck`
Expected: PASS（此时旧组件仍引用旧导出，可能报错 → 在 Task 2/3 修复后再整体通过；本步只确认本文件语法/类型无误，可先跳过整体 typecheck）

---

## Task 2: 新增 TopNav 组件

**Files:**
- Create: `src/components/layout/top-nav.tsx`

- [ ] **Step 1: 写入组件**

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navigationSections, sectionLandingHref } from "@/shared/navigation";

export function TopNav() {
  const pathname = usePathname();

  return (
    <div className="flex gap-1 overflow-x-auto">
      {navigationSections.map((section) => {
        const isActive =
          pathname === section.basePath || pathname.startsWith(`${section.basePath}/`);
        return (
          <Link
            key={section.key}
            href={sectionLandingHref(section)}
            aria-current={isActive ? "page" : undefined}
            className={`inline-flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition ${
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <section.icon className="h-4 w-4" />
            {section.label}
          </Link>
        );
      })}
    </div>
  );
}
```

---

## Task 3: 新增 SectionNav 组件

**Files:**
- Create: `src/components/layout/section-nav.tsx`

- [ ] **Step 1: 写入组件**（`/settings` General 用精确匹配，避免与 focus-rules 同时高亮）

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
    <nav className="flex gap-2 overflow-x-auto border-b border-border pb-3">
      {section.children.map((child) => {
        const isActive = pathname === child.href;
        return (
          <Link
            key={child.href}
            href={child.href}
            aria-current={isActive ? "page" : undefined}
            className={`inline-flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition ${
              isActive
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <child.icon className="h-4 w-4" />
            {child.label}
          </Link>
        );
      })}
    </nav>
  );
}
```

---

## Task 4: 改写 AppShell 为顶栏布局并删除旧 NavigationList

**Files:**
- Modify: `src/components/layout/app-shell.tsx`（整文件替换）
- Delete: `src/components/layout/navigation-list.tsx`

- [ ] **Step 1: 替换 AppShell**

```tsx
import { TopNav } from "@/components/layout/top-nav";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 px-5 py-4 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                CortexOps
              </p>
              <h1 className="mt-1 text-xl font-semibold tracking-normal text-foreground">
                AI PM Workbench
              </h1>
            </div>
            <div className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-muted-foreground">
              Codex automations remain the runner
            </div>
          </div>
          <nav>
            <TopNav />
          </nav>
        </div>
      </header>
      <main className="px-5 py-6">{children}</main>
    </div>
  );
}
```

- [ ] **Step 2: 删除旧文件**

```bash
git rm src/components/layout/navigation-list.tsx
```

---

## Task 5: 根重定向 `/` → `/dashboard/today`

**Files:**
- Modify: `src/app/page.tsx`（整文件替换）

- [ ] **Step 1: 写入重定向**

```tsx
import { redirect } from "next/navigation";

export default function RootPage() {
  redirect("/dashboard/today");
}
```

---

## Task 6: 新增 Dashboard 区 layout + 迁移 today/tasks + 新增 weekly/monthly

**Files:**
- Create: `src/app/dashboard/layout.tsx`
- Move: `src/app/today/page.tsx` → `src/app/dashboard/today/page.tsx`
- Move: `src/app/tasks/page.tsx` → `src/app/dashboard/tasks/page.tsx`
- Create: `src/app/dashboard/weekly/page.tsx`
- Create: `src/app/dashboard/monthly/page.tsx`

- [ ] **Step 1: 区 layout（可复用于其它区，内容相同）**

`src/app/dashboard/layout.tsx`：
```tsx
import { SectionNav } from "@/components/layout/section-nav";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <SectionNav />
      {children}
    </div>
  );
}
```

- [ ] **Step 2: 迁移 today/tasks**

```bash
mkdir -p src/app/dashboard/today src/app/dashboard/tasks
git mv src/app/today/page.tsx src/app/dashboard/today/page.tsx
git mv src/app/tasks/page.tsx src/app/dashboard/tasks/page.tsx
```
迁移后无需改内容（`WorkbenchPage` 无路由依赖）。

- [ ] **Step 3: 新增 Weekly 空状态**

`src/app/dashboard/weekly/page.tsx`：
```tsx
import { CalendarRange, FileText } from "lucide-react";
import { WorkbenchPage } from "@/components/layout/workbench-page";

export default function WeeklyPage() {
  return (
    <WorkbenchPage
      eyebrow="Weekly digest"
      title="Weekly"
      description="Read this week's execution review, paper radar, demo recommendation, and engineering-learning report."
      metrics={[
        { label: "Weekly reports", value: "-", detail: "Waiting for JSONL import" },
        { label: "Scheduled items", value: "-", detail: "No active week" },
        { label: "Practice picks", value: "-", detail: "Not selected" }
      ]}
      emptyState={{
        icon: CalendarRange,
        title: "No weekly report yet",
        description:
          "Phase B will import weekly automation outputs and render the weekly reading view here.",
        actions: [{ icon: FileText, label: "Weekly reader planned", tone: "primary" }]
      }}
    />
  );
}
```

- [ ] **Step 4: 新增 Monthly 空状态**（同模板，替换文案/图标）

`src/app/dashboard/monthly/page.tsx`：
```tsx
import { CalendarClock, FileText } from "lucide-react";
import { WorkbenchPage } from "@/components/layout/workbench-page";

export default function MonthlyPage() {
  return (
    <WorkbenchPage
      eyebrow="Monthly review"
      title="Monthly"
      description="Read the monthly direction review and see how priorities should shift next month."
      metrics={[
        { label: "Monthly reports", value: "-", detail: "Waiting for JSONL import" },
        { label: "Direction shifts", value: "-", detail: "No active month" },
        { label: "Focus updates", value: "-", detail: "Not reviewed" }
      ]}
      emptyState={{
        icon: CalendarClock,
        title: "No monthly report yet",
        description:
          "Phase B will import the monthly direction review and render it here.",
        actions: [{ icon: FileText, label: "Monthly reader planned", tone: "primary" }]
      }}
    />
  );
}
```

- [ ] **Step 5: 校验**

Run: `npm run build`
Expected: `/dashboard/today`, `/dashboard/weekly`, `/dashboard/monthly`, `/dashboard/tasks` 均出现在路由表。

---

## Task 7: 新增 Inbox 区 layout + 迁移 review→today、pools

**Files:**
- Create: `src/app/inbox/layout.tsx`（内容同 Task 6 的 layout，`export default function InboxLayout`）
- Move: `src/app/review/page.tsx` → `src/app/inbox/today/page.tsx`
- Move: `src/app/pools/page.tsx` → `src/app/inbox/pools/page.tsx`

- [ ] **Step 1: layout**（复制 Task 6 Step 1，函数名改 `InboxLayout`）

- [ ] **Step 2: 迁移**

```bash
mkdir -p src/app/inbox/today src/app/inbox/pools
git mv src/app/review/page.tsx src/app/inbox/today/page.tsx
git mv src/app/pools/page.tsx src/app/inbox/pools/page.tsx
```

- [ ] **Step 3: 更新 Inbox/Today 文案（重定位为"今日分拣"）**

将 `src/app/inbox/today/page.tsx` 的 `eyebrow`/`title`/`description` 调整为分拣语义，例如 `title="Today"`、`eyebrow="Daily triage"`、`description="Route today's 30 signals into candidate pools and toggle reading-pack membership. Changes flow to Dashboard."`（其余保持 `WorkbenchPage` 结构）。

---

## Task 8: 新增 Library 区 layout + 迁移 reports、artifacts

**Files:**
- Create: `src/app/library/layout.tsx`（`export default function LibraryLayout`，内容同 Task 6 layout）
- Move: `src/app/reports/page.tsx` → `src/app/library/reports/page.tsx`
- Move: `src/app/artifacts/page.tsx` → `src/app/library/artifacts/page.tsx`

- [ ] **Step 1: layout**（复制 layout 模板，函数名 `LibraryLayout`）

- [ ] **Step 2: 迁移**

```bash
mkdir -p src/app/library/reports src/app/library/artifacts
git mv src/app/reports/page.tsx src/app/library/reports/page.tsx
git mv src/app/artifacts/page.tsx src/app/library/artifacts/page.tsx
```

- [ ] **Step 3: 更新 Artifacts 文案为"分布图谱"语义**

将 `src/app/library/artifacts/page.tsx` 的 `description` 调整为：`"A high-level coverage map of your portfolio by topic and maturity. Detailed content stays in Obsidian; here you plan where to invest next."`（结构不变）。

---

## Task 9: 新增 Settings 区 layout + General 页并入 Automations + 迁移 Focus Rules

**Files:**
- Create: `src/app/settings/layout.tsx`（`export default function SettingsLayout`，内容同 Task 6 layout）
- Modify: `src/app/settings/page.tsx`（General + Automations 只读面板）
- Move: `src/app/focus-rules/page.tsx` → `src/app/settings/focus-rules/page.tsx`
- Delete: `src/app/automations/page.tsx`（内容并入 settings）

- [ ] **Step 1: layout**（复制 layout 模板，函数名 `SettingsLayout`）

- [ ] **Step 2: 迁移 Focus Rules**

```bash
mkdir -p src/app/settings/focus-rules
git mv src/app/focus-rules/page.tsx src/app/settings/focus-rules/page.tsx
```

- [ ] **Step 3: General + Automations 只读面板**

先阅读现有 `src/app/automations/page.tsx` 的文案，将其"runner status/配置引用"要点作为只读区块并入 `src/app/settings/page.tsx`。示例：
```tsx
import { Bot, Settings2 } from "lucide-react";
import { WorkbenchPage } from "@/components/layout/workbench-page";

export default function SettingsPage() {
  return (
    <WorkbenchPage
      eyebrow="System configuration"
      title="Settings"
      description="Configure paths, policy references, import/export, and view the read-only automation runner status."
      metrics={[
        { label: "Runner", value: "Codex", detail: "External in MVP" },
        { label: "Automations", value: "-", detail: "Read-only TOML snapshots" },
        { label: "Policies", value: "-", detail: "docs/*.md references" }
      ]}
      emptyState={{
        icon: Bot,
        title: "Automations run in Codex (read-only here)",
        description:
          "Automation configs, schedules, and last-run status are shown here for reference only. Codex remains the runner; the app does not call AI directly in Phase 1.",
        actions: [{ icon: Settings2, label: "Runner status panel planned", tone: "primary" }]
      }}
    />
  );
}
```

- [ ] **Step 4: 删除旧 automations 目录**

```bash
git rm src/app/automations/page.tsx
```

---

## Task 10: 清理旧空目录并整体类型/构建校验

**Files:**
- Delete: 迁移后残留的空目录 `src/app/{today,tasks,review,pools,reports,artifacts,focus-rules,automations}`

- [ ] **Step 1: 确认旧目录已空并删除**

```bash
rmdir src/app/today src/app/tasks src/app/review src/app/pools src/app/reports src/app/artifacts src/app/focus-rules src/app/automations 2>/dev/null || true
```

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: PASS，无未使用引用（旧 `navigation-list` 已删）。

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: PASS（typedRoutes 下所有 `Link href` 合法）。

- [ ] **Step 4: Build**

Run: `npm run build`
Expected: 路由表包含 `/`、`/dashboard/{today,weekly,monthly,tasks}`、`/inbox/{today,pools}`、`/library/{reports,artifacts}`、`/settings`、`/settings/focus-rules`；不再包含旧路由。

---

## Task 11: 手动导航验证

- [ ] **Step 1: 启动 dev 并逐页点击**

Run: `npm run dev`（`http://localhost:3000`）
检查：`/` 重定向到 `/dashboard/today`；顶栏 4 区高亮正确；每区二级 tab 正确；无死链；空状态渲染正常；截图/录屏留证。

---

## Task 12: 同步 `docs/workbench-design.md`

**Files:**
- Modify: `docs/workbench-design.md` §6 "UI Navigation"

- [ ] **Step 1:** 用 4 区两级结构重写 §6，删除独立 Automations 小节（改为 Settings 内只读说明），把 Focus Rules 归入 Settings，新增 Weekly/Monthly 说明，说明 Inbox↔Dashboard 联动。

- [ ] **Step 2: Commit**

```bash
git add docs/workbench-design.md
git commit -m "docs: update workbench UI navigation to 4-section IA"
```

---

## Task 13: 同步 `docs/cortexops-ai-system-roadmap.md`

**Files:**
- Modify: `docs/cortexops-ai-system-roadmap.md` "Core pages" 列表

- [ ] **Step 1:** 将 Core pages 列表替换为新结构（Dashboard/Inbox/Library/Settings 及其子页），并注明 Automations 为 Settings 内只读、Focus Rules 归 Settings。

- [ ] **Step 2: Commit**

```bash
git add docs/cortexops-ai-system-roadmap.md
git commit -m "docs: align roadmap core pages with 4-section navigation"
```

---

## 后续阶段大纲（Phase B–E，落地时各出独立详细计划）

> 这些阶段依赖 roadmap Phase 2 的数据导入层（Prisma schema + JSONL importer + services），当前 Phase A 不实现。此处仅列范围，避免占位符污染可执行部分。

- **Phase B — 数据导入 + Dashboard 读视图**：`prisma/schema.prisma`、`src/server/{db.ts,services,importers}`、`src/shared/schemas`；Dashboard/Today 从 `state/daily/*-links.jsonl` 渲染阅读包（`reading_pack_status=selected`）、五段摘要、练习三选一 + 顶部"待归类 N 条"提示条。
- **Phase C — Inbox 分拣交互**：`src/app/inbox/*`、`src/components/{signals,pools}`、`src/server/services/{signals,candidates}`；归池（`final_pool`）、阅读包切换（candidate↔selected）、拖拽、confirm/change/reject、写回并联动 Dashboard；Dashboard/Today 底部"快速补充"条。
- **Phase D — Library**：`src/app/library/{reports,artifacts}`、`src/server/services/{reports,artifacts}`；Reports 历史列表+检索框；Artifacts 覆盖矩阵（主题×成熟度）+ portfolio-ready 外链列表。
- **Phase E — Settings**：`src/app/settings/*`、`src/server/services/{focusRules,automationRuns}`；Focus Rules 卡片弹窗新增/编辑（含 source types/tags/target pools/applies_to/weight/active period），导出回 `docs/focus-policy.md`；Automations 只读运行状态接入。

---

## Self-Review 结论

- **Spec 覆盖**：spec 各节（IA、路由映射、组件、Q1/Q2/Q3、验收）均有对应任务（Task 1–13 覆盖 Phase A；B–E 大纲对应 spec §8）。
- **占位符扫描**：Phase A 任务均给出实际代码/命令；B–E 明确标注为后续阶段大纲而非可执行步骤，无隐藏 TODO。
- **类型一致**：`navigationSections`/`NavSection`/`NavChild`/`findSectionByPath`/`sectionLandingHref` 命名在 Task 1–3 定义与引用一致；`WorkbenchPage` props（eyebrow/title/description/metrics/emptyState）与现有组件签名一致。
