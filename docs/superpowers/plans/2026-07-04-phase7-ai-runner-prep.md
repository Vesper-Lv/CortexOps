# Phase 7 实现计划：Prompt Registry & AI Runner 准备

> **For agentic workers:** 使用 checkbox（`- [ ]`）逐步执行。本计划对应 roadmap（`docs/cortexops-ai-system-roadmap.md`）**Phase 7**，也是 deferred-backlog 中 **Automation Runner UI（只读阶段）** 的正式落地路径。
>
> **前置：** 集成分支 `cursor/nav-restructure-plan-a012` 已含 Phase 2–6、export/import 闭环、Audit timeline（`/settings/audit`）。Codex 仍是唯一 AI runner；本阶段**不**在 app 内调用模型 API。

**Goal:** 把 `automations/*.toml` 中的 prompt 抽成可版本化的 `prompts/` 模板，在 SQLite 建立 **PromptTemplate / PolicySnapshot / AutomationRun** 注册层，并在 Settings 提供**只读** Automation 状态面板——使未来 in-app runner（Phase 7b/8）可插拔，而不重构 UI 或数据模型。

**Architecture:**

```text
automations/*.toml          prompts/*.md
       │                           │
       └──── sync (CLI) ───────────┘
                    │
                    ▼
         PromptTemplate (DB metadata + contentHash)
                    │
    PolicySnapshot ◄┼──► ImportRun / AutomationRun
    (docs/*.md hash)│
                    ▼
         Settings / Automations (read-only)
         Codex (external runner, unchanged)
```

**Tech Stack:** Next.js 16 App Router、Prisma/SQLite、Vitest、tsx CLI、`smol-toml`（或 Node `tomllib`）解析 TOML。

**Flexibility Rules（继承 roadmap）：**

- UI/API **不**硬编码 prompt 正文；**不**直接调用 OpenAI/Anthropic。
- Importer/Exporter 拥有文件同步；Phase 7 新增 **prompt sync** 与 **run registry** 同属 `src/server/` 层。
- 每次 import 或手动 register 可关联 **PolicySnapshot**；每次已知 automation 产出可写 **AutomationRun**。

---

## 产品边界

### 本阶段做

| # | 交付物 | 说明 |
|---|--------|------|
| 1 | `prompts/` 目录 | 6 个 automation 的 prompt 正文（从 TOML 抽出），路径稳定、可 diff |
| 2 | `PromptTemplate` 表 | slug、automationId、kind、sourcePath、contentHash、model、rrule 等元数据 |
| 3 | `PolicySnapshot` 表 | 运行/import 时 `source-policy` / `ingestion-normalization` / `focus-policy` 的内容 hash + 路径 |
| 4 | `AutomationRun` 表 | 记录 automation id、关联 template/snapshot、status、输入/输出文件列表、时间戳 |
| 5 | `Job` 表约定 | 扩展 `type` 枚举文档化；可选：register run 时写入 `Job` 占位（`status=completed`, `type=automation_register`） |
| 6 | CLI | `npm run prompts:sync`、`npm run automation:register`（手动登记 Codex 跑完的一轮） |
| 7 | Import 挂钩 | `npm run import` 结束时创建 PolicySnapshot；若检测到新 daily/weekly 文件则 **启发式** 登记 AutomationRun |
| 8 | Settings UI | `/settings/automations` 只读列表：automation 名称、schedule、最近 run、policy 版本、链接到 prompts |

### 本阶段不做（明确 deferred → Phase 7b/8）

- App 内发起 LLM 请求、token/cost 采集、流式输出
- 替代 Codex cron / 调度器
- Worker 进程、BullMQ、Redis
- Prompt 在线编辑器（只读预览 + 跳转 repo 文件）
- 从 Workbench 一键「触发 daily run」
- `PolicySnapshot` 全文入库（仅存 hash + 文件路径 + optional git ref）

### 与现有 deferred-backlog 关系

| deferred 项 | Phase 7 处理方式 |
|-------------|------------------|
| Automation Runner UI | **只读面板**（本计划 Task 6） |
| Job queue worker | 仅 schema/类型约定 + 占位 Job 行；worker **不做** |
| 多用户/鉴权 | 不做 |

---

## Automation 映射表（单一事实来源）

| TOML `id` | 文件 | `prompts/` 目标 | kind | 典型输出 |
|-----------|------|-----------------|------|----------|
| `ai-pm` | `automations/ai-pm.toml` | `prompts/daily-ai-pm.md` | `daily` | `state/daily/YYYY-MM-DD-*` |
| `ai-pm-2` | `automations/weekly-execution-review.toml` | `prompts/weekly-execution-review.md` | `weekly` | `state/weekly/*.md` |
| `ai-paper-radar` | `automations/ai-paper-radar.toml` | `prompts/paper-radar.md` | `paper_radar` | `state/weekly/*paper*` |
| `demo` | `automations/demo.toml` | `prompts/demo-recommendation.md` | `demo` | weekly demo 报告 |
| `engineering-learning` | `automations/engineering-learning.toml` | `prompts/engineering-learning.md` | `engineering_learning` | weekly 学习报告 |
| `monthly-review` | `automations/monthly-review.toml` | `prompts/monthly-review.md` | `monthly` | `state/monthly/*.md` |

TOML 继续保留 **调度元数据**（`rrule`, `model`, `status`, `cwds`）；`prompt` 字段在 sync 后改为 **相对路径引用** 或保留 duplicate 直至 Codex 迁移完成（见 Task 2 策略）。

---

## 数据模型草案

**Files:** `prisma/schema.prisma`

```prisma
model PromptTemplate {
  id            String   @id @default(cuid())
  slug          String   @unique          // daily-ai-pm
  automationId  String   @unique          // ai-pm
  name          String
  kind          String                   // daily | weekly | ...
  sourcePath    String                   // prompts/daily-ai-pm.md
  contentHash   String                   // sha256 of file body
  model         String?
  scheduleRrule String?
  status        String   @default("active") // active | archived
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  runs          AutomationRun[]
}

model PolicySnapshot {
  id              String   @id @default(cuid())
  snapshotKey     String   @unique          // e.g. sha256 composite
  sourcePolicyHash String
  ingestionHash   String
  focusPolicyHash String
  sourcePathsJson String                   // JSON array of paths
  createdAt       DateTime @default(now())
  importRuns      ImportRun[]
  automationRuns  AutomationRun[]
}

model AutomationRun {
  id               String   @id @default(cuid())
  automationId     String
  promptTemplateId String?
  policySnapshotId String?
  status           String   @default("external")
  // external | success | failed | partial — external = Codex ran outside app
  trigger          String   // cron | manual | import_detected
  model            String?
  inputFilesJson   String?  // JSON string[]
  outputFilesJson  String?  // JSON string[]
  error            String?
  notes            String?
  startedAt        DateTime?
  finishedAt       DateTime?
  createdAt        DateTime @default(now())
  promptTemplate   PromptTemplate? @relation(...)
  policySnapshot   PolicySnapshot? @relation(...)

  @@index([automationId])
  @@index([createdAt])
}

// ImportRun 增加可选 policySnapshotId
```

`Job` 表不改 schema 结构；约定 `type` 值：

```text
import | export | automation_register | automation_run (reserved)
```

---

## 受影响文件清单

| 区域 | 文件 | 变更 |
|------|------|------|
| Schema | `prisma/schema.prisma` | 新增 3 model；`ImportRun.policySnapshotId` 可选 |
| Prompts | `prompts/*.md`（6 文件） | **新增**：从 TOML 抽出正文 |
| CLI | `scripts/prompts-sync.ts` | **新增** |
| CLI | `scripts/automation-register.ts` | **新增** |
| CLI | `scripts/import.ts` | 挂钩 PolicySnapshot + 启发式 AutomationRun |
| Server | `src/server/importers/automationTomlParser.ts` | **新增** |
| Server | `src/server/services/promptTemplates.ts` | **新增** |
| Server | `src/server/services/policySnapshot.ts` | **新增** |
| Server | `src/server/services/automationRuns.ts` | **新增** |
| Server | `src/server/importers/importAutomationDetect.ts` | **新增**：根据新文件推断 run |
| UI | `src/app/settings/automations/page.tsx` | **新增** |
| UI | `src/components/settings/automation-registry.tsx` | **新增** |
| UI | `src/app/settings/page.tsx` | -metrics 接真实数据 / 链到 automations |
| Nav | `src/shared/navigation.ts` | Settings 增加 Automations 子项 |
| Tests | `src/server/importers/__tests__/automationTomlParser.test.ts` | **新增** |
| Tests | `src/server/__tests__/policySnapshot.test.ts` | **新增** |
| Tests | `src/server/__tests__/automationRuns.test.ts` | **新增** |
| Docs | `automations/README.md` | 补充 prompts/ 与 sync 说明 |
| Docs | `docs/superpowers/plans/deferred-backlog.md` | Phase 7 项标记 in progress / done |
| Package | `package.json` | scripts: `prompts:sync`, `automation:register` |

---

## Task 1: Prisma schema — PromptTemplate / PolicySnapshot / AutomationRun

**Files:** `prisma/schema.prisma`

- [ ] **Step 1:** 按上文草案添加三个 model；`ImportRun` 增加 `policySnapshotId String?` 与 relation
- [ ] **Step 2:** `npm run db:push`
- [ ] **Step 3:** 确认 `Job` 表无需 migration；在 `src/shared/jobs.ts`（**新增**）导出 `JOB_TYPES` 常量
- [ ] **Step 4:** Commit — `feat(schema): PromptTemplate, PolicySnapshot, AutomationRun for Phase 7`

**验收：** `npx prisma validate` 通过；现有 64 tests 仍绿。

---

## Task 2: 建立 `prompts/` 并从 TOML 同步

**Files:** `prompts/*.md`, `scripts/prompts-sync.ts`, `src/server/services/promptTemplates.ts`

- [ ] **Step 1:** 编写 `extractPromptFromToml(toml: string): string`（或使用 `smol-toml` 读 `prompt` 字段）
- [ ] **Step 2:** 一次性生成 6 个 `prompts/<slug>.md`（内容来自当前 `automations/*.toml`）
- [ ] **Step 3:** 每个 prompt 文件头加 YAML frontmatter（可选）：

```yaml
---
automation_id: ai-pm
kind: daily
source_toml: automations/ai-pm.toml
---
```

- [ ] **Step 4:** `syncPromptTemplates()` — 读 prompts 文件 → 算 `contentHash` → upsert `PromptTemplate`（合并 TOML 元数据：name, model, rrule, status）
- [ ] **Step 5:** CLI `npm run prompts:sync` 调用 sync；package.json 注册 script
- [ ] **Step 6:** 单测：`contentHash` 变化时 `updatedAt` 更新；未知 automationId 报错

**TOML 双写策略（过渡期）：**

- Phase 7 **不**修改 live Codex 使用的 `~/.codex/automations`。
- Repo 内 `automations/*.toml` 暂保留完整 `prompt` 字段；`prompts/` 为 workbench 的 canonical 副本。
- 在 `automations/README.md` 注明：**变更 prompt 时先改 `prompts/`，再跑 `npm run prompts:sync`，再按需回写 TOML snapshot**（可选脚本 Phase 7b）。

- [ ] **Step 7:** Commit — `feat(prompts): extract templates and sync PromptTemplate registry`

**验收：** DB 中 6 条 `PromptTemplate`；hash 与文件一致。

---

## Task 3: TOML 解析器（纯函数 + 单测）

**Files:** `src/server/importers/automationTomlParser.ts`, `__tests__/automationTomlParser.test.ts`

- [ ] **Step 1:** 定义 `ParsedAutomationConfig`：

```typescript
type ParsedAutomationConfig = {
  id: string;
  name: string;
  kind: "cron" | string;
  status: string;
  model?: string;
  rrule?: string;
  prompt: string;
  cwds?: string[];
};
```

- [ ] **Step 2:** 实现 `parseAutomationToml(content: string): ParsedAutomationConfig`
- [ ] **Step 3:** 测试覆盖 `automations/` 下全部 6 个 `.toml`（snapshot 或 fixture）
- [ ] **Step 4:** 与 roadmap 对齐：运行文档中的 Python tomllib 校验仍可用于 CI；Vitest 为 workbench 侧校验

- [ ] **Step 5:** Commit — `feat(automation): TOML parser with tests`

**验收：** 6/6 TOML parse 无抛错；`id` 与映射表一致。

---

## Task 4: PolicySnapshot 服务

**Files:** `src/server/services/policySnapshot.ts`, `src/server/__tests__/policySnapshot.test.ts`

- [ ] **Step 1:** 常量 policy 路径：

```typescript
const POLICY_FILES = [
  "docs/source-policy.md",
  "docs/ingestion-normalization.md",
  "docs/focus-policy.md"
] as const;
```

- [ ] **Step 2:** `computePolicySnapshot(deps: { readFile })` → `{ snapshotKey, hashes, paths }`（snapshotKey = 三文件 hash 拼接 sha256）
- [ ] **Step 3:** `getOrCreatePolicySnapshot()` — 相同 snapshotKey 复用行，不重复插入
- [ ] **Step 4:** 单测：文件内容不变 → 同一 snapshotKey；focus-policy 改一字 → 新 key

- [ ] **Step 5:** Commit — `feat(policy): PolicySnapshot hash registry`

**验收：** 重复 import 不产生重复 snapshot（同内容）。

---

## Task 5: AutomationRun 注册 + Import 挂钩

**Files:** `src/server/services/automationRuns.ts`, `src/server/importers/importAutomationDetect.ts`, `scripts/automation-register.ts`, `scripts/import.ts`

### 5a 手动登记 CLI

- [ ] **Step 1:** `npm run automation:register -- --id ai-pm --outputs state/daily/2026-07-04-links.jsonl,state/daily/2026-07-04-report.md`
- [ ] **Step 2:** 创建 `AutomationRun`：`trigger=manual`, `status=external`, 关联当前 `PolicySnapshot` + `PromptTemplate`
- [ ] **Step 3:** 可选写入 `Job` 行 `type=automation_register`

### 5b Import 启发式检测

- [ ] **Step 4:** `detectAutomationRunsFromImport(ctx)` — 在 import 总结后：

| 检测条件 | automationId |
|----------|--------------|
| 新增/更新 `state/daily/YYYY-MM-DD-links.jsonl` | `ai-pm` |
| 新增 `state/weekly/*.md`（execution review 命名规则） | `ai-pm-2` |
| 新增 `state/monthly/*.md` | `monthly-review` |
| ArchiveReport import 类型 weekly + reportType | 映射到 paper/demo/engineering |

- [ ] **Step 5:** 仅当 output 文件 mtime 在 import 窗口内或为新文件时登记，避免每次 import 重复刷 run
- [ ] **Step 6:** `ImportRun.policySnapshotId = getOrCreatePolicySnapshot().id`

- [ ] **Step 7:** 单测：mock 文件列表 → 期望登记 0/1 条 run；同一文件二次 import 不重复

- [ ] **Step 8:** Commit — `feat(automation): AutomationRun registry and import hooks`

**验收：**

- 手动 register 后 DB 有 run 行
- `npm run import` 后 `ImportRun` 带 `policySnapshotId`
- roadmap：**Imports and runs can record policy version** ✓

---

## Task 6: Settings — Automations 只读面板

**Files:** `src/app/settings/automations/page.tsx`, `src/components/settings/automation-registry.tsx`, `src/shared/navigation.ts`, `src/app/settings/page.tsx`

- [ ] **Step 1:** `listAutomationRegistry()` — join `PromptTemplate` + latest `AutomationRun` per automationId
- [ ] **Step 2:** UI 表格/卡片列：Name、Kind、Schedule（rrule 人类可读）、Model、Last run（时间 + status）、Policy snapshot（短 hash）、Prompt hash（短 hash）
- [ ] **Step 3:** 链接：`prompts/<file>`（GitHub/raw 可后续）；`/settings/audit` 过滤 `entityType=automation_run`（Phase 7b）
- [ ] **Step 4:** Settings 导航增加 `{ href: "/settings/automations", label: "Automations", icon: Bot }`
- [ ] **Step 5:** General settings metrics 更新：`Automations: 6`, `Last daily run: <date>`（从 DB 读）
- [ ] **Step 6:** 空状态：无 run 时提示「Run Codex automation, then npm run import or automation:register」

- [ ] **Step 7:** Commit — `feat(settings): read-only automations registry panel`

**验收：**

- `/settings/automations` 展示 6 个 automation
- **不**出现 Run / Schedule / Edit 按钮（只读）
- `npm run build` typed routes 通过

---

## Task 7: 文档、deferred-backlog、总验收

- [ ] **Step 1:** 更新 `automations/README.md` — prompts/sync/register 工作流
- [ ] **Step 2:** 更新 `docs/cortexops-ai-system-roadmap.md` Phase 7 小节 — 链接本计划
- [ ] **Step 3:** 更新 `deferred-backlog.md` — Automation Runner UI 标 [x]（只读）；Job worker 仍 [ ]
- [ ] **Step 4:** 全量验证：

```bash
npm run prompts:sync
npm test
npm run lint
npm run build
npm run import
npm run automation:register -- --id ai-pm --outputs state/daily/2026-07-02-links.jsonl
```

- [ ] **Step 5:** Commit — `docs: Phase 7 completion notes`

---

## 测试计划

| 类别 | 用例 |
|------|------|
| TOML | 6 个 automation 文件 parse；缺 `id` 失败 |
| PolicySnapshot | 同内容 dedupe；改文件新 snapshot |
| PromptTemplate | sync upsert；hash 变更 bump |
| AutomationRun | manual register；import detect 不重复 |
| UI smoke | `/settings/automations` 渲染；无 run 时空状态 |
| Regression | 现有 64+ tests 仍 pass |

---

## 风险与缓解

| 风险 | 缓解 |
|------|------|
| TOML prompt 与 `prompts/` 漂移 | `prompts:sync` 为 workbench 权威；CI 可选 check hash |
| Import 启发式误登记 | 保守规则 + `notes` 字段；同一 output 文件 24h 内 dedupe |
| 绝对路径在 TOML prompt 内 | Phase 7 不改为相对路径（避免破坏 Codex）；extract 时保留，未来 Phase 7b 做 path 模板化 |
| Phase 7 范围膨胀为真 runner | 本计划「不做」清单 + PR review 检查无 LLM SDK |
| SQLite → Postgres | 新表仅用 string/json；无 SQLite-only 类型 |

---

## Phase 7b 预览（不在本计划执行）

供后续计划引用：

1. In-app runner：消费 `PromptTemplate` + `PolicySnapshot`，写 `AutomationRun.status=running|success`
2. `Job` worker 轮询 `type=automation_run`
3. TOML `prompt = "@file:prompts/daily-ai-pm.md"` 约定 + Codex 迁移指南
4. Settings「复制 run 上下文」给 Codex 调试

---

## 推荐执行顺序

```text
Task 1 → Task 3 → Task 2 → Task 4 → Task 5 → Task 6 → Task 7
         (schema)  (parser)  (prompts) (policy) (runs)   (UI)
```

**建议分支：** `cursor/phase7-runner-prep-7faa`  
**建议 PR base：** `cursor/nav-restructure-plan-a012`

---

## 验收标准（Roadmap Phase 7 对齐）

- [ ] Every automation config can map to a **PromptTemplate**（6/6）
- [ ] Imports and runs can record **policy version**（PolicySnapshot on import/register）
- [ ] A future AI runner can be added **without restructuring the UI**（数据层 + 只读面板先行）
- [ ] Codex automations **continue to work unchanged** in parallel
