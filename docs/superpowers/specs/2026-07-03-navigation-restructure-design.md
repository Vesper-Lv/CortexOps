# CortexOps Workbench 导航重构设计（Spec）

- 日期：2026-07-03
- 状态：已确认（用户认同全部判断）
- 范围：将当前 9 项平铺导航重构为 4 区两级导航，并明确 Inbox↔Dashboard 联动、Automations 定位、Artifacts 呈现形式。

---

## 1. 背景与问题

当前工作台处于 Phase 1 skeleton：导航在 `src/shared/navigation.ts` 中平铺 9 项（Today / Reports / Review Inbox / Candidate Pools / Tasks / Artifacts / Focus Rules / Automations / Settings），全部页面复用 `src/components/layout/workbench-page.tsx` 渲染静态空状态，尚未接入数据。

问题：

1. 导航过长（9 项），认知负担高。
2. 功能重叠：
   - **Today ↔ Reports**：Today 是"今天要读/要做"，Reports 是历史归档，二者边界模糊。
   - **Review Inbox ↔ Candidate Pools**：两者都是"分拣/归类"动作，只是粒度不同。
   - **Focus Rules ↔ Settings**：Focus Rules 本质是一种配置。

关键数据事实（`state/daily/2026-07-02-links.jsonl`，每日 30 条信号）：每条已带
`suggested_pool` / `final_pool` / `human_status`(pending|confirmed|changed|rejected) /
`reading_pack_status`(selected|candidate|not_selected) / `priority` / `duplicate_status` /
`practice_fit`。这套字段天然支持"AI 先选、人再补"的流程，是本设计的联动基础。

---

## 2. 目标与非目标

### 目标

- 顶部横向 4 区导航 + 每区二级 tab，消除上述重叠。
- 定义 Inbox（分拣）对 Dashboard（阅读）的联动模型：AI 先选、Dashboard 不被阻塞、可就地快速补充。
- 明确 Automations 降级为 Settings 内只读状态面板，取消顶级导航。
- 明确 Artifacts 以"覆盖矩阵 + portfolio-ready 外链列表"呈现，不复制 Obsidian 内容。
- 在 Inbox 新增 Memo：以 to-do 列表形式，随手记录阅读日报/做 Demo 时冒出的待确认小问题（见 §5bis）。
- 保持文档一致性：同步更新 `docs/workbench-design.md` 与 `docs/cortexops-ai-system-roadmap.md`。

### 非目标（本次不做 / 后置）

- 不引入直接 AI 调用（Codex 仍是 runner）。
- 不做多用户、云部署、任务队列、浏览器插件。
- Artifacts 力导向图谱、signal→artifact 血缘图后置。
- 数据导入层（JSONL→DB）本身不在导航重构范围内，但被后续阶段依赖。

---

## 3. 目标信息架构（IA）

顶部横向导航 4 区，每区带二级子导航（tab 条）：

```
顶栏(横向):  Dashboard   |   Inbox   |   Library   |   Settings
────────────────────────────────────────────────────────────
Dashboard (只读·消费)          Inbox (分拣·编辑)
  · Today   /dashboard/today     · Today   /inbox/today
  · Weekly  /dashboard/weekly     · Candidate Pools /inbox/pools
  · Monthly /dashboard/monthly    · Memo   /inbox/memo
  · Tasks   /dashboard/tasks

Library (归档·检索)            Settings (配置)
  · Reports   /library/reports    · General  /settings
  · Artifacts /library/artifacts  · Focus Rules /settings/focus-rules
                                   · Automations（/settings 内只读面板）
```

- 根路径 `/` 重定向到 `/dashboard/today`（当前重定向到 `/today`）。
- Dashboard 与 Inbox 都出现 "Today" 属刻意设计：同一份当日数据的两种模式（读 vs 拣）。
- 原 Review Inbox 中"非今日的待处理信号"由 `/inbox/pools` 用 `human_status=pending` 过滤承接，不丢失。

### 旧→新 路由映射

| 旧路由 | 新路由 | 处理方式 |
|---|---|---|
| `/today` | `/dashboard/today` | 迁移 |
| `/tasks` | `/dashboard/tasks` | 迁移 |
| （新增） | `/dashboard/weekly` | 新建空状态 |
| （新增） | `/dashboard/monthly` | 新建空状态 |
| `/review` | `/inbox/today` | 迁移并重定位为"今日分拣" |
| `/pools` | `/inbox/pools` | 迁移 |
| （新增） | `/inbox/memo` | 新建：轻量备忘 to-do 列表（见 §5bis） |
| `/reports` | `/library/reports` | 迁移 |
| `/artifacts` | `/library/artifacts` | 迁移 |
| `/focus-rules` | `/settings/focus-rules` | 迁移 |
| `/automations` | `/settings`（只读面板） | 合并，取消独立页 |
| `/settings` | `/settings` | 保留为 General |

---

## 4. 导航数据模型与组件

### 4.1 导航模型（`src/shared/navigation.ts`）

从平铺数组改为两级结构：

```ts
export type NavChild = { href: Route; label: string; icon: LucideIcon };
export type NavSection = { key: string; label: string; icon: LucideIcon; basePath: string; children: NavChild[] };
export const navigationSections: NavSection[] = [ /* Dashboard, Inbox, Library, Settings */ ];
```

- `basePath` 用于顶栏高亮判定（`pathname.startsWith(basePath)`）。
- 每个 section 的第一个 child 作为该区默认落地页（顶栏点击 → 跳到第一个子页）。

### 4.2 组件拆分

- `src/components/layout/top-nav.tsx`（新）：渲染 4 个顶级区，按 `basePath` 高亮。
- `src/components/layout/section-nav.tsx`（新）：渲染当前区的二级 tab；按当前 `pathname` 推断所属 section。
- `src/components/layout/navigation-list.tsx`（旧）：被上面两个替代；保留其"active 判定/样式"经验，删除或改写。
- `src/components/layout/app-shell.tsx`：由"固定左侧栏"改为"顶部横向主导航 + 其下二级 tab 条 + 主内容区"；移动端保持横向滚动。
- `src/components/layout/workbench-page.tsx`：继续复用做空状态，无破坏性改动。

### 4.3 App Router 结构

采用嵌套段 + 每区 `layout.tsx` 渲染二级 tab：

```
src/app/
  layout.tsx            (根，渲染 AppShell = TopNav)
  page.tsx              (redirect -> /dashboard/today)
  dashboard/
    layout.tsx          (SectionNav: Today/Weekly/Monthly/Tasks)
    today/page.tsx
    weekly/page.tsx     (新增)
    monthly/page.tsx    (新增)
    tasks/page.tsx
  inbox/
    layout.tsx          (SectionNav: Today/Candidate Pools/Memo)
    today/page.tsx
    pools/page.tsx
    memo/page.tsx       (新增)
  library/
    layout.tsx          (SectionNav: Reports/Artifacts)
    reports/page.tsx
    artifacts/page.tsx
  settings/
    layout.tsx          (SectionNav: General/Focus Rules)
    page.tsx            (General + Automations 只读面板)
    focus-rules/page.tsx
```

`next.config.mjs` 开启了 `typedRoutes`，所有 `Link href` 必须为合法路由；重构后需 `npm run build` 校验 typed routes。

---

## 5. Inbox ↔ Dashboard 联动（Q1）

原则：**AI 先选、Dashboard 不被阻塞、可就地快速补充、系统性归类才进 Inbox。**

- **Dashboard/Today（读）**：默认展示 `reading_pack_status=selected` 组成的"30 分钟阅读包" + 五段式摘要 + 三选一练习。顶部非阻塞提示条：`AI 已选 N 条 · 另有 M 条待归类 → 去 Inbox`。
- **Dashboard/Today 底部"快速补充"条**：列出少量 `reading_pack_status=candidate` 的边缘条目，一键"加入阅读包/移出"（candidate↔selected），无需离开 Dashboard。
- **Inbox/Today（拣）**：全部 30 条，可改 `final_pool`、切换阅读包归属、confirm/change/reject。
- **联动实现**：Inbox 修改写回 DB/JSONL；Dashboard 下次进入即反映（数据层落地后可即时刷新）。
- 阶段性：Phase A 仅搭结构与空状态；真正读写在 Phase B/C（依赖数据导入层）。

---

## 5bis. Inbox / Memo（备忘 to-do 列表）

### 动机

阅读日报或做 Demo 时经常冒出"待确认的小问题"（某个概念、某个 API、某处实现细节），来不及立刻逐一查找，需要随手记下、避免遗忘。Memo 就是这个"随手捕获 + 稍后处理"的收件箱，形式为 to-do 列表。

### 定位

- 归属 **Inbox 区**（与 Today、Candidate Pools 并列的第三个子页 `/inbox/memo`），因为它同属"待处理/待分拣"语义。
- 与信号分拣**解耦**：Memo 是用户自由文本待办，不依赖每日信号数据结构，因此实现上可独立于信号导入层（见分阶段说明）。

### 形式与交互

- 顶部一个快速输入框：回车即新增一条待办（低摩擦捕获）。
- 列表项：复选框（open ↔ done）、文本、创建时间；hover 显示删除。
- 过滤/分组：All / Open / Done。
- 可选增强（后置）：
  - 一条 Memo "转为 Task"（写入任务看板，保留 `origin=memo`）。
  - 一条 Memo "归入 knowledge_gap 候选池"（把"待了解的问题"沉淀为知识缺口）。
  - 可选关联来源：`linked_signal_id` 或 `linked_url`（从某条日报/某个 Demo 记录而来）。

### 数据对象（Phase 落地时）

遵循"UI 不直接读写文件、由 service 经 DB"的分层，新增 `Memo` 对象：

```text
memo_id
text
status            # open | done
source_context    # daily_report | demo | manual   (可选)
linked_signal_id  # 可选，来源信号
linked_url        # 可选，来源链接
created_at
updated_at
```

- 本地文件契约：`state/memo/memos.jsonl`（与 state/pools 的 JSONL 契约一致，作为可审计导出）。
- DB：Prisma 新增 `Memo` model；service `src/server/services/memos.ts` 负责状态转换与（可选）memo→task / memo→pool 转化。

### 阶段性

- **Phase A**：仅新增导航项 + `/inbox/memo` 空状态页（`WorkbenchPage`）。
- **功能实现**：因与信号导入解耦，可作为**较早、独立**的功能落地（并入 Phase C，或按需前置）；含快速新增、勾选完成、删除、过滤，以及可选的 memo→task / memo→pool。

---

## 6. Automations 定位（Q2）

现阶段 Codex 是 runner，未来 Web 端也是后台调用、无专属操作界面。

- 取消 `/automations` 顶级导航。
- 内容（`automations/*.toml` 的名称/计划/最近状态/引用策略）降级为 `/settings` 内一个**只读**"Runner status / 配置引用"面板。
- 顶栏全局徽标 "Codex automations remain the runner" 可保留。
- 与 roadmap 一致：AutomationRun 表在后期阶段才引入。

---

## 7. Artifacts 呈现（Q3）

定位：作品集分布鸟瞰，用于规划；详情留在 Obsidian。

- **首选**：覆盖矩阵——行=主题/能力域（复用信号 tag / candidate pool，如 agent、eval、demo、product-inspiration、knowledge-gap），列=成熟度（draft→polishing→portfolio_ready→published），格子为数量/密度。
- 下方配 `portfolio_ready` 列表：每条仅存 title/type/主题标签/status/**外链**(Obsidian/GitHub)。
- **后置**：主题-成熟度力导向图谱、血缘图。
- 不复制 Obsidian 内容，只做覆盖度概览。

---

## 8. 分阶段计划（概述）

| 阶段 | 目标 | 现在可做 |
|---|---|---|
| **A. 导航与 IA 重构** | 顶部横向 4 区 + 二级 tab；迁移页面；新增 Weekly/Monthly；新增 Inbox/Memo 空状态；Automations 并入 Settings；Focus Rules 移入 Settings；`/`→`/dashboard/today`；同步文档 | 是（纯结构，不依赖数据） |
| B. 数据导入 + Dashboard 读视图 | 从 JSONL 渲染阅读包/摘要/练习 | 依赖 roadmap Phase 2/5 |
| C. Inbox 分拣交互 + Memo 功能 | 归池、阅读包切换、拖拽、写回、联动；Memo to-do（新增/勾选/删除/过滤，可选 memo→task/pool，与信号导入解耦，可前置） | 分拣依赖 B；Memo 可独立 |
| D. Library | Reports 检索、Artifacts 分布矩阵 | 依赖 B |
| E. Settings | Focus Rules 卡片弹窗、Automations 只读状态 | 部分依赖 B |

详细逐任务实现见 `docs/superpowers/plans/2026-07-03-navigation-restructure.md`。本次仅实现范围：**Phase A（导航重构 skeleton）**为可立即落地项，B–E 为后续阶段。

---

## 9. 受影响文件与目录

见实现计划文档"受影响文件清单"一节，涵盖：`src/shared/navigation.ts`、`src/components/layout/*`、`src/app/*` 路由重组、`src/app/page.tsx`、根级 `next.config.mjs`（typedRoutes 校验）、文档 `docs/workbench-design.md` §6 与 `docs/cortexops-ai-system-roadmap.md` Core pages。

---

## 10. 验收标准（Phase A）

- 顶部横向 4 区导航可用，二级 tab 随区切换。
- 所有旧页面在新路由下可达；`/` 正确重定向到 `/dashboard/today`。
- 新增 Weekly / Monthly 空状态清晰。
- Inbox 出现第三个子页 Memo（`/inbox/memo`），空状态清晰。
- Automations 内容出现在 Settings 只读面板；Focus Rules 在 Settings 下。
- `npm run lint`、`npm run typecheck`、`npm run build` 全通过（typed routes 无误）。
- 文档 §6 / Core pages 与新 IA 一致。
- 手动验证：导航跳转正确、无死链、空状态正确渲染（截图/录屏）。

---

## 11. 风险与缓解

- **typedRoutes 断链**：路由重组后 `Link href` 类型报错 → 每步 `npm run build` 校验。
- **文档漂移**：docs 仍描述旧 9 页 IA → Phase A 将文档同步纳入任务，作为验收项。
- **后续阶段耦合**：B–E 依赖数据导入层；Phase A 只搭结构与空状态，保持与 roadmap 分层一致（UI 不直接读写 JSONL）。
