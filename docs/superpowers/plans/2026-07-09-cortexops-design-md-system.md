# CortexOps DESIGN.md System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `DESIGN.md`-style visual and component contract for the CortexOps Workbench so future frontend work can stay consistent across AI-generated UI, shadcn/ui components, Tailwind tokens, and product documentation.

**Architecture:** Keep `docs/workbench-design.md` as the product/workflow specification and add root `DESIGN.md` as the executable UI design system. `docs/cortexops-ai-system-roadmap.md` should reference `DESIGN.md` before any frontend implementation begins, and future Tailwind/shadcn setup should map tokens from `DESIGN.md` instead of inventing local colors or layout rules inside components.

**Tech Stack:** Markdown, YAML frontmatter, future Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui.

## Global Constraints

- Do not scaffold or install frontend dependencies in this plan; dependency approval is required before adding Next.js, Tailwind, shadcn/ui, Prisma, or any new package.
- Preserve `docs/workbench-design.md` as the product direction, core workflow, and navigation source of truth.
- `DESIGN.md` owns visual tokens, interaction density, component behavior, and UI do/don't rules.
- The UI should feel like an operating console, not a marketing dashboard.
- JSONL state is the backend contract; Markdown reports are frontend reading views.
- Keep the first design system small enough to execute: no speculative themes, no broad component library, no multi-brand setup.
- Use ASCII in new files unless an existing file already requires non-ASCII.

---

## Fit Assessment

CortexOps is a strong fit for the Google `design.md` approach, but not because it needs a decorative design system. It fits because the project already has multiple future UI-generating actors: Codex, possible v0 drafts, shadcn/ui components, 21st.dev-style component imports, and later human edits. Without a written visual contract, those actors will produce plausible screens that slowly drift apart.

Current CortexOps docs already define the product layer well:

- `docs/workbench-design.md` defines positioning, target user, core objects, workflows, navigation, MVP scope, and success criteria.
- `docs/cortexops-ai-system-roadmap.md` defines the future app path: Next.js, TypeScript, Tailwind CSS, shadcn/ui, SQLite, Prisma, and local-first workflow.

What is missing is the layer that `DESIGN.md` is designed to hold:

- Design tokens: color, typography, spacing, radius, borders, elevation, and status colors.
- Component rules: navigation shell, tables, review cards, drawers, filters, task board, badges, empty states.
- AI-readable constraints: what UI generators must avoid, how dense screens should feel, and which visual decisions are allowed.
- Tailwind/shadcn mapping: which tokens should become CSS variables and which components should use variants.

The main mismatch is that Google `design.md` examples often suit a complete product design system, while CortexOps is still pre-frontend. The first version should therefore be a compact `DESIGN.md`, not a large design bible.

Recommended split:

```text
docs/workbench-design.md
  Product intent, workflows, data objects, navigation, MVP scope.

DESIGN.md
  Visual language, tokens, layout density, component behavior, AI UI rules.

docs/cortexops-ai-system-roadmap.md
  Implementation sequence and dependency boundaries.
```

## Proposed File Structure

- Create: `DESIGN.md`
  - Root-level UI design system contract for humans, Codex, v0, shadcn/ui, and future Tailwind configuration.
- Modify: `docs/workbench-design.md`
  - Add a short section that delegates visual implementation rules to `DESIGN.md`.
- Modify: `docs/cortexops-ai-system-roadmap.md`
  - Add `DESIGN.md` to Phase 0 or Phase 1 deliverables and require frontend skeleton work to consume it before styling pages.
- Optional later modify: `README.md`
  - Add `DESIGN.md` to the repository contents list after the design file exists.
- Future frontend modify: `tailwind.config.ts`, `src/app/globals.css`, `components.json`, and `src/components/*`
  - Map `DESIGN.md` tokens into Tailwind and shadcn/ui once the web app is scaffolded.

## Recommended `DESIGN.md` Direction

The CortexOps UI should optimize for repeated scanning, review, routing, and action. The visual system should be quiet, dense, and operational.

Use this direction:

```text
Visual position:
  Local-first AI PM operating console.

Feel:
  Calm, precise, review-oriented, artifact-producing, not marketing-like.

Primary layout:
  Persistent left navigation, top context bar, dense content area, right-side detail drawer.

Core surfaces:
  Tables, split panes, cards for individual repeated records only, drawers, command bars, filters, status badges, task columns.

Avoid:
  Hero layouts, decorative gradients, oversized cards, playful bento grids, one-note purple/blue themes, vague AI-glow styling.
```

Suggested first token family:

```yaml
---
version: 0.1.0
status: draft
product: CortexOps Workbench
tokens:
  color:
    background: "#F7F7F4"
    surface: "#FFFFFF"
    surface_subtle: "#F0F1ED"
    text: "#191B1F"
    text_muted: "#62666D"
    border: "#D9DCD4"
    primary: "#22577A"
    primary_hover: "#1B4965"
    accent: "#4D7C59"
    warning: "#A16207"
    danger: "#B42318"
    info: "#386FA4"
    success: "#2F6F4E"
  typography:
    font_sans: "Inter, ui-sans-serif, system-ui, sans-serif"
    font_mono: "JetBrains Mono, ui-monospace, SFMono-Regular, monospace"
  radius:
    sm: "4px"
    md: "6px"
    lg: "8px"
  spacing:
    xs: "4px"
    sm: "8px"
    md: "12px"
    lg: "16px"
    xl: "24px"
    xxl: "32px"
---
```

The palette intentionally avoids a dominant purple/blue AI-app look. Blue is reserved for primary navigation and current context; green marks confirmed/forward-moving states; amber marks watch/review states; red marks reject/drop/error states.

## Task 1: Add Root `DESIGN.md`

**Files:**
- Create: `DESIGN.md`

**Interfaces:**
- Consumes: Product direction from `docs/workbench-design.md`.
- Produces: A root-level UI contract referenced by docs and future frontend implementation.

- [ ] **Step 1: Create `DESIGN.md` with frontmatter tokens**

Add this file:

```markdown
---
version: 0.1.0
status: draft
product: CortexOps Workbench
tokens:
  color:
    background: "#F7F7F4"
    surface: "#FFFFFF"
    surface_subtle: "#F0F1ED"
    text: "#191B1F"
    text_muted: "#62666D"
    border: "#D9DCD4"
    primary: "#22577A"
    primary_hover: "#1B4965"
    accent: "#4D7C59"
    warning: "#A16207"
    danger: "#B42318"
    info: "#386FA4"
    success: "#2F6F4E"
  typography:
    font_sans: "Inter, ui-sans-serif, system-ui, sans-serif"
    font_mono: "JetBrains Mono, ui-monospace, SFMono-Regular, monospace"
  radius:
    sm: "4px"
    md: "6px"
    lg: "8px"
  spacing:
    xs: "4px"
    sm: "8px"
    md: "12px"
    lg: "16px"
    xl: "24px"
    xxl: "32px"
---

# CortexOps Workbench Design System

## Overview

CortexOps is a local-first AI PM operating console. The interface should help
one user review signals, route candidates, create tasks, and turn work into
artifacts.

The UI should feel calm, precise, dense, and decision-oriented. It should not
feel like a marketing dashboard, landing page, analytics spectacle, or generic
AI chat product.

## Colors

Use neutral surfaces for most screen area. Reserve color for state, priority,
and action.

- `background`: page background.
- `surface`: panels, tables, drawers, and repeated item cards.
- `surface_subtle`: table headers, muted rows, inactive navigation, and grouped
  filter areas.
- `primary`: active navigation, primary action, selected view, and current
  context.
- `accent`: confirmed state, productive movement, and artifact-ready progress.
- `warning`: watch, needs review, waiting, or medium-risk state.
- `danger`: reject, drop, destructive action, failed import, or error state.
- `info`: source metadata, links, report references, and neutral system notes.
- `success`: completed, confirmed, imported, or synchronized state.

## Typography

Use sans-serif text for the main interface and monospace text only for file
paths, IDs, JSONL snippets, automation names, and raw state values.

Headings should be functional labels, not editorial headlines. Use compact
heading sizes inside panels, drawers, tables, and dashboards.

## Layout

Use an application shell:

- Left navigation for Today, Reports, Review Inbox, Candidate Pools, Tasks,
  Artifacts, Automations, Focus Rules, and Settings.
- Top context bar for date range, import state, active focus rules, and primary
  page actions.
- Main content area for tables, split panes, task columns, and report reading.
- Right-side detail drawer for signal, task, report, and automation details.

Prefer dense but breathable layouts. Use full-width sections and structured
panes. Do not place page sections inside decorative cards.

## Components

Tables are the default for scan-heavy collections: signals, reports, candidate
pools, automation runs, and tasks.

Cards are allowed only for individual repeated records, empty states, and
drawer summaries. Do not nest cards inside cards.

Use badges for priority, confidence, candidate pool, human review state, task
status, artifact status, and automation run state.

Use drawers for record details and edits. Use modals only for destructive
confirmation or focused creation flows.

Use segmented controls for view modes, tabs for related subviews, checkboxes
for bulk selection, and menus for secondary actions.

## Do's and Don'ts

Do:

- Keep the interface optimized for repeated daily and weekly review.
- Make source, priority, confidence, suggested pool, and human decision visible
  together.
- Keep primary actions explicit: confirm, change pool, watch, convert to task,
  archive, drop.
- Use status color consistently across Reports, Review Inbox, Pools, Tasks, and
  Focus Rules.

Don't:

- Use hero sections, large decorative gradients, AI glow effects, or marketing
  copy.
- Invent new colors inside components.
- Use oversized rounded cards for every section.
- Hide source file, source URL, or automation provenance when reviewing a
  signal.
- Let imported 21st.dev, v0, or shadcn examples override this design system.
```

- [ ] **Step 2: Verify file exists**

Run:

```bash
test -f DESIGN.md && sed -n '1,80p' DESIGN.md
```

Expected: The command prints the YAML frontmatter and the `# CortexOps Workbench Design System` heading.

- [ ] **Step 3: Commit**

```bash
git add DESIGN.md
git commit -m "docs: add cortexops design system contract"
```

## Task 2: Link Product Design To `DESIGN.md`

**Files:**
- Modify: `docs/workbench-design.md`

**Interfaces:**
- Consumes: `DESIGN.md` as visual design source of truth.
- Produces: Clear boundary between product/workflow docs and UI design rules.

- [ ] **Step 1: Add a design-system boundary section after Product Principles**

Insert this section after `## 3. Product Principles`:

```markdown
## 3.1 Design System Boundary

This document defines product direction, workflows, objects, and navigation.
The root `DESIGN.md` file defines the visual system for implementation:
colors, typography, layout density, component behavior, state badges, and
AI-generated UI constraints.

When the two documents overlap, use this split:

- Use this file to decide what the workbench should do and which workflows it
  must support.
- Use `DESIGN.md` to decide how the interface should look, feel, and behave at
  the component level.

Future frontend work should read both files before creating or modifying UI.
```

- [ ] **Step 2: Verify section is present**

Run:

```bash
rg -n "Design System Boundary|DESIGN.md" docs/workbench-design.md
```

Expected: The output includes the new section heading and the reference to `DESIGN.md`.

- [ ] **Step 3: Commit**

```bash
git add docs/workbench-design.md
git commit -m "docs: link workbench product design to design system"
```

## Task 3: Add `DESIGN.md` To The Web App Roadmap

**Files:**
- Modify: `docs/cortexops-ai-system-roadmap.md`

**Interfaces:**
- Consumes: Existing Phase 0 and Phase 1 roadmap.
- Produces: A requirement that the visual contract exists before UI scaffolding.

- [ ] **Step 1: Update Phase 0 deliverables**

In `### Phase 0: Baseline And Isolation`, add this deliverable:

```markdown
- Root `DESIGN.md` file for visual tokens, UI density, component rules, and
  AI-generated UI constraints.
```

- [ ] **Step 2: Update Phase 1 deliverables**

In `### Phase 1: Web App Skeleton`, add this deliverable:

```markdown
- Tailwind and shadcn/ui theme setup mapped to `DESIGN.md` tokens before page
  styling begins.
```

- [ ] **Step 3: Update Phase 1 acceptance criteria**

In `### Phase 1: Web App Skeleton`, add this acceptance criterion:

```markdown
- The shell, navigation, empty states, and badges use tokens defined in
  `DESIGN.md` instead of ad hoc colors or spacing.
```

- [ ] **Step 4: Verify roadmap references**

Run:

```bash
rg -n "DESIGN.md|design system|tokens" docs/cortexops-ai-system-roadmap.md
```

Expected: The output includes Phase 0 and Phase 1 references to `DESIGN.md`.

- [ ] **Step 5: Commit**

```bash
git add docs/cortexops-ai-system-roadmap.md
git commit -m "docs: require design tokens before web app styling"
```

## Task 4: Add `DESIGN.md` To Repository Index

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: Root `DESIGN.md`.
- Produces: Discoverability for future agents and human contributors.

- [ ] **Step 1: Add `DESIGN.md` to Contents**

In the `## Contents` list, add:

```markdown
- `DESIGN.md`: frontend visual design system for CortexOps Workbench tokens,
  layout density, component rules, and AI-generated UI constraints
```

- [ ] **Step 2: Verify README link**

Run:

```bash
rg -n "DESIGN.md|frontend visual design system" README.md
```

Expected: The output includes the new Contents item.

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: index cortexops design system"
```

## Task 5: Future Frontend Token Mapping

**Files:**
- Future modify: `tailwind.config.ts`
- Future modify: `src/app/globals.css`
- Future modify: `components.json`
- Future modify: `src/components/layout/app-shell.tsx`
- Future modify: `src/components/ui/badge.tsx`

**Interfaces:**
- Consumes: `DESIGN.md` token names and component rules.
- Produces: Tailwind/shadcn implementation that follows the design contract.

- [ ] **Step 1: Stop for dependency approval before scaffolding**

Before running any scaffold command or adding package files, present this approval card:

```text
依赖审批卡：
1. 要安装/升级什么？
Next.js、TypeScript、Tailwind CSS、shadcn/ui，以及项目初始化所需的前端开发依赖。
2. 为什么需要它？不用它能不能做？
需要它们来实现 CortexOps Web Workbench。若不批准，本阶段只能继续维护文档和设计规范，不能搭建可运行前端。
3. 它是生产依赖还是开发依赖？
Next.js、React 是生产运行依赖；TypeScript、Tailwind、shadcn CLI 相关工具主要是开发/构建依赖。
4. 是否有更轻量替代？
可以用纯 HTML/CSS 或 Vite，但 roadmap 已选择 Next.js + Tailwind + shadcn/ui，且更适合后续全栈与本地数据界面。
5. 是否会影响构建、部署、数据库或运行时？
会影响构建和运行时；不会直接改变数据库 schema，Prisma/SQLite 需另行审批。
6. 版本选择依据是什么？
使用当前稳定版本，并优先遵循 Next.js、Tailwind、shadcn/ui 官方推荐初始化方式。
7. 不批准会怎样？
不会创建前端项目；`DESIGN.md` 仍可作为未来实现规范保留。
8. 我的建议：批准
```

- [ ] **Step 2: Map CSS variables to `DESIGN.md` tokens**

When the frontend exists, add CSS variables equivalent to:

```css
:root {
  --background: 247 247 244;
  --surface: 255 255 255;
  --surface-subtle: 240 241 237;
  --foreground: 25 27 31;
  --muted-foreground: 98 102 109;
  --border: 217 220 212;
  --primary: 34 87 122;
  --primary-hover: 27 73 101;
  --accent: 77 124 89;
  --warning: 161 98 7;
  --danger: 180 35 24;
  --info: 56 111 164;
  --success: 47 111 78;
}
```

- [ ] **Step 3: Define badge variants from CortexOps states**

Implement badge variants for:

```text
priority: p0, p1, p2, p3
review: pending, confirmed, changed, rejected, watching
task: inbox, this_week, today, in_progress, waiting, done, archived
artifact: draft, polishing, portfolio_ready, published, archived
automation: scheduled, running, succeeded, failed, paused
```

- [ ] **Step 4: Verify visual token usage**

Run after frontend exists:

```bash
rg -n "#[0-9A-Fa-f]{6}|rgb\\(|hsl\\(" src
```

Expected: No ad hoc component colors except inside the central CSS/token file.

## Self-Review

Spec coverage:

- Product/workflow docs remain in `docs/workbench-design.md`: covered by Task 2.
- Roadmap alignment before frontend scaffolding: covered by Task 3.
- Root design-system contract: covered by Task 1.
- Repository discoverability: covered by Task 4.
- Future Tailwind/shadcn mapping: covered by Task 5.
- Dependency approval before frontend scaffolding: covered by Task 5 Step 1.

Placeholder scan:

- This plan intentionally contains no `TBD`, `TODO`, `implement later`, or vague "write tests for the above" steps.

Type and naming consistency:

- The plan uses `DESIGN.md` consistently as the root design-system filename.
- Status names match existing CortexOps docs where already defined: task states, artifact states, candidate pool concepts, and automation-focused review workflow.
