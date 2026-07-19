# Daily Practice And Pool Semantics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove daily-report-generated practice options, make `product / paper / engineering` the only active pool semantics, keep Today engineering practice recommendations sourced from the engineering pool, and make Candidate Pools List the detailed suggestion workspace while Board stays a fast routing overview.

**Architecture:** Backend prompts and policy stop producing `## 4. 今日练习三选一` and stop writing `personal_work`; links keep pool, priority, source, summary, and recommendation fields. Frontend canonicalizes legacy pool names into `product / paper / engineering`, ranks engineering candidates separately for Today practice selection, and uses existing Candidate -> Task promotion for product and engineering suggestion cards. Data import reads only `state/daily/active` for daily inputs and ignores `state/daily/backups`; existing SQLite state is rebuilt only after explicit operator approval.

**Tech Stack:** Next.js 16 App Router, React 18, TypeScript, Prisma/SQLite, Vitest, backend Markdown/TOML prompt files.

## Global Constraints

- Do not add dependencies.
- Do not change Prisma schema in this implementation; use existing `Candidate.reason` as the editable suggestion text.
- Do not delete or rewrite user data tables automatically; any SQLite cleanup command requires explicit approval before execution.
- Preserve historical report compatibility: Library may render old `DailyReport.practicesJson`, but Dashboard/Today must not depend on report section 4.
- Active frontend pools are exactly `product`, `paper`, `engineering`, `archive`, and `drop`.
- Legacy pool names map as: `product_inspiration -> product`, `paper_candidate -> paper`, `paper-candidates -> paper`, `demo_replication -> engineering`, `knowledge_gap -> engineering`, `engineering_learning -> engineering`, `personal_work -> engineering`.
- Candidate Pools List shows detailed suggestion cards; Candidate Pools Board only supports fast pool/priority/status overview.
- Today practice recommendations stay in `Dashboard/today`, show three engineering candidates, and are sourced from the canonical engineering pool.
- Backups under `state/daily/backups` never participate in web import.

---

## File Structure

Backend worktree: `/Users/jiexinlv/CortexOps` on branch `codex/source-layering-policy`.

- Modify `prompts/daily-ai-pm.md`: remove section 4 and `personal_work` output contract.
- Modify `automations/ai-pm.toml`: mirror `prompts/daily-ai-pm.md`.
- Modify `docs/source-policy.md`: remove daily three-option practice rule.
- Modify `docs/ingestion-normalization.md`: remove formal daily practice as a current active output and record the three-pool contract.
- Modify `docs/workbench-design.md`: update UI contract from six legacy pools to three active pools.
- Modify `docs/cortexops-data-contract.md`: state active pool names and `personal_work` migration behavior.
- Optionally modify weekly/demo/engineering prompt references that still read `pools/personal-work.jsonl`, replacing them with engineering pool reads.

Frontend worktree: `/Users/jiexinlv/CortexOps-web-workbench` on branch `codex/web-workbench`.

- Modify `src/shared/poolOptions.ts`: canonical pool utilities.
- Create `src/server/__tests__/poolOptions.test.ts`: pool migration tests.
- Modify `src/server/importers/recordMapper.ts`: canonicalize `suggestedPool`, `finalPool`, and pool file names at import boundaries.
- Modify `src/server/importers/importSources.ts`: read daily inputs from `state/daily/active`.
- Modify `src/server/importers/__tests__/runImport.test.ts`: remove `personal-work` pool fixture and assert active daily source paths.
- Modify `src/server/importers/__tests__/recordMapper.test.ts`: assert legacy pool migration.
- Modify `src/server/services/candidateSync.ts`: canonicalize synced candidate pool names.
- Modify `src/server/services/candidatePools.ts`: expose list-card fields and canonical board groups.
- Modify `src/server/services/inboxView.ts`: filters use canonical pool names.
- Modify `src/shared/inboxTypes.ts`: add fields needed by suggestion cards.
- Modify `src/server/services/poolRanking.ts`: add engineering-practice ranking.
- Modify `src/server/__tests__/dailyView.test.ts` or create `src/server/__tests__/poolRanking.test.ts`: verify non-practice engineering items do not appear in Today practice ranking.
- Modify `src/app/dashboard/today/page.tsx`: call engineering practice ranking and update text.
- Modify `src/components/dashboard/practice-picker.tsx`: keep three cards but rename semantics to engineering practice.
- Modify `src/components/inbox/pool-views.tsx`: default to List.
- Modify `src/components/inbox/pool-list-view.tsx`: replace table with detailed suggestion cards.
- Modify `src/components/inbox/pool-board.tsx`: keep compact overview controls.
- Modify `src/server/actions/candidateActions.ts`: expose editable suggestion action.
- Modify `src/server/services/candidatePools.ts`: implement editable suggestion persistence.
- Modify `src/server/__tests__/candidatePools.test.ts`: verify suggestion update.
- Modify `src/app/inbox/pools/page.tsx` and `src/components/inbox/pool-filters-bar.tsx`: update copy and filters.
- Modify `docs/cortexops-data-contract.md`: mirror backend data contract.

## Task 1: Backend Daily Prompt Removes Report Practice Generation

**Files:**
- Modify: `/Users/jiexinlv/CortexOps/prompts/daily-ai-pm.md`
- Modify: `/Users/jiexinlv/CortexOps/automations/ai-pm.toml`
- Modify: `/Users/jiexinlv/CortexOps/docs/source-policy.md`
- Modify: `/Users/jiexinlv/CortexOps/docs/ingestion-normalization.md`
- Modify: `/Users/jiexinlv/CortexOps/docs/cortexops-data-contract.md`

**Interfaces:**
- Consumes: existing daily report sections 1-3 and links JSONL fields.
- Produces: daily report with no section 4; links JSONL rows still include `suggested_pool`, `final_pool`, `priority`, `priority_rationale`, `pool_rationale`, `display_summary`, `reason`.

- [ ] **Step 1: Write the failing grep check**

Run:

```bash
rg -n "今日练习三选一|Produce three daily practice options|formal daily practice|pools/personal-work|personal_work" prompts/daily-ai-pm.md automations/ai-pm.toml docs/source-policy.md docs/ingestion-normalization.md docs/cortexops-data-contract.md
```

Expected before implementation: matches in prompt, automation, and policy docs.

- [ ] **Step 2: Remove the backend daily section 4 contract**

In both `prompts/daily-ai-pm.md` and `automations/ai-pm.toml`, replace the state-file list:

```markdown
- pools/product-inspiration.jsonl
- pools/paper-candidates.jsonl
- pools/demo-replication.jsonl
- pools/knowledge-gap.jsonl
- pools/personal-work.jsonl
- pools/archive.jsonl
```

with:

```markdown
- pools/product-inspiration.jsonl
- pools/paper-candidates.jsonl
- pools/demo-replication.jsonl
- pools/knowledge-gap.jsonl
- pools/archive.jsonl
```

Then delete the entire section headed:

```markdown
## 4. 今日练习三选一
```

and replace references to final user structure with:

```markdown
用户阅读版输出结构只包含：
1. 五段式日报
2. 今日 30mins 阅读包
3. 未入选阅读包的剩余链接

日报不再生成“今日练习三选一”，不再选择 formal daily practice，也不写入 personal_work。产品和工程候选通过每条链接的 `reason` / `priority_rationale` / `pool_rationale` 进入 Web 端建议卡片。
```

- [ ] **Step 3: Update source policy**

In `docs/source-policy.md`, replace the daily practice rule:

```markdown
Produce three daily practice options, select one formal practice, and give manual routing suggestions for the other two.
```

with:

```markdown
Do not produce daily practice options in the daily report. Instead, keep product and engineering recommendations attached to individual link records through `reason`, `priority_rationale`, and `pool_rationale`; Web Workbench renders those records as editable product or engineering suggestion cards.
```

- [ ] **Step 4: Update ingestion normalization**

Replace active-output references to formal daily practice with:

```markdown
Current active pools are product, paper, and engineering. Legacy `personal_work` rows are migrated into engineering for compatibility; new daily runs must not write `personal_work`.
```

- [ ] **Step 5: Verify prompt and policy cleanup**

Run:

```bash
rg -n "今日练习三选一|Produce three daily practice options|formal daily practice|pools/personal-work|personal_work" prompts/daily-ai-pm.md automations/ai-pm.toml docs/source-policy.md docs/ingestion-normalization.md docs/cortexops-data-contract.md
```

Expected after implementation: no matches in the active daily prompt or active daily policy. Matches in historical `docs/superpowers/plans` are acceptable when the search includes those directories; this command does not include them.

- [ ] **Step 6: Commit backend prompt cleanup**

```bash
git add prompts/daily-ai-pm.md automations/ai-pm.toml docs/source-policy.md docs/ingestion-normalization.md docs/cortexops-data-contract.md
git commit -m "fix(daily): remove generated practice section"
```

## Task 2: Canonical Three-Pool Semantics In Frontend

**Files:**
- Modify: `src/shared/poolOptions.ts`
- Create: `src/server/__tests__/poolOptions.test.ts`
- Modify: `src/server/importers/recordMapper.ts`
- Modify: `src/server/importers/__tests__/recordMapper.test.ts`
- Modify: `src/server/services/candidateSync.ts`
- Modify: `src/server/__tests__/candidateSync.test.ts`

**Interfaces:**
- Produces: `normalizePoolName(pool: string | null | undefined): string | null`.
- Produces: `poolNameFromOption(option: PoolOption): string`.
- Produces: canonical values stored in `Candidate.poolName`, `Candidate.finalPool`, `Candidate.suggestedPool`, `Signal.finalPool`, and `Signal.suggestedPool` where import code owns the value.

- [ ] **Step 1: Write failing pool option tests**

Create `src/server/__tests__/poolOptions.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  POOL_OPTIONS,
  migratePoolName,
  normalizePoolName,
  poolNameFromOption,
  poolOptionFromName
} from "@/shared/poolOptions";

describe("poolOptions", () => {
  it("exposes only active workflow pools plus archive/drop", () => {
    expect(POOL_OPTIONS).toEqual(["product", "paper", "engineering", "archive", "drop"]);
  });

  it("migrates legacy pools into the three active pools", () => {
    expect(migratePoolName("product_inspiration")).toBe("product");
    expect(migratePoolName("product-inspiration")).toBe("product");
    expect(migratePoolName("paper_candidate")).toBe("paper");
    expect(migratePoolName("paper-candidates")).toBe("paper");
    expect(migratePoolName("demo_replication")).toBe("engineering");
    expect(migratePoolName("demo-replication")).toBe("engineering");
    expect(migratePoolName("knowledge_gap")).toBe("engineering");
    expect(migratePoolName("personal_work")).toBe("engineering");
  });

  it("normalizes unknown and empty values conservatively", () => {
    expect(normalizePoolName(null)).toBeNull();
    expect(normalizePoolName(undefined)).toBeNull();
    expect(normalizePoolName("")).toBeNull();
    expect(normalizePoolName("archive")).toBe("archive");
    expect(normalizePoolName("drop")).toBe("drop");
    expect(normalizePoolName("not_a_pool")).toBeNull();
  });

  it("uses canonical option names for storage and UI", () => {
    expect(poolNameFromOption("engineering")).toBe("engineering");
    expect(poolOptionFromName("demo-replication")).toBe("engineering");
  });
});
```

- [ ] **Step 2: Run the failing test**

Run:

```bash
npm test -- src/server/__tests__/poolOptions.test.ts
```

Expected before implementation: fails because `normalizePoolName` is not exported and legacy `demo_replication` still maps to `product`.

- [ ] **Step 3: Implement canonical pool helpers**

Update `src/shared/poolOptions.ts` so the core section reads:

```ts
export const POOL_OPTIONS = ["product", "paper", "engineering", "archive", "drop"] as const;

export type PoolOption = (typeof POOL_OPTIONS)[number];

export const POOL_DISPLAY_ORDER = ["product", "paper", "engineering"] as const;

export const POOL_MIGRATION_MAP: Record<string, PoolOption> = {
  product_inspiration: "product",
  "product-inspiration": "product",
  paper_candidate: "paper",
  "paper-candidate": "paper",
  "paper-candidates": "paper",
  demo_replication: "engineering",
  "demo-replication": "engineering",
  engineering_learning: "engineering",
  "engineering-learning": "engineering",
  knowledge_gap: "engineering",
  "knowledge-gap": "engineering",
  personal_work: "engineering",
  "personal-work": "engineering",
  product: "product",
  paper: "paper",
  engineering: "engineering",
  archive: "archive",
  drop: "drop"
};

export function normalizePoolName(pool: string | null | undefined): PoolOption | null {
  if (!pool) return null;
  return POOL_MIGRATION_MAP[pool] ?? null;
}

export function migratePoolName(oldName: string): PoolOption {
  return normalizePoolName(oldName) ?? "archive";
}

export function poolNameFromOption(option: PoolOption): string {
  return option;
}
```

Keep `isValidPool`, `assertValidPool`, `sortPools`, and `poolOptionFromName`, but route them through `normalizePoolName`.

- [ ] **Step 4: Canonicalize imported pools**

In `src/server/importers/recordMapper.ts`, import `normalizePoolName` and normalize common fields:

```ts
import { normalizePoolName } from "@/shared/poolOptions";
```

Set:

```ts
suggestedPool: normalizePoolName(s(v.suggested_pool)),
finalPool: normalizePoolName(s(v.final_pool)),
```

In `mapToCandidate`, set:

```ts
poolName: normalizePoolName(ctx.poolName) ?? "archive",
```

- [ ] **Step 5: Canonicalize signal sync**

In `src/server/services/candidateSync.ts`, replace:

```ts
const poolName = (s.finalPool ?? s.suggestedPool ?? "archive").replace(/_/g, "-");
```

with:

```ts
const poolName = normalizePoolName(s.finalPool ?? s.suggestedPool) ?? "archive";
```

and import `normalizePoolName`.

- [ ] **Step 6: Update existing tests**

Update `src/server/importers/__tests__/recordMapper.test.ts` expected values:

```ts
expect(rec.poolName).toBe("product");
expect(rec.finalPool).toBe("product");
expect(rec.recordKey).toBe("product-inspiration:2026-07-02-11");
```

Keep the record key scope tied to the source file name for import idempotency.

- [ ] **Step 7: Verify pool semantics**

Run:

```bash
npm test -- src/server/__tests__/poolOptions.test.ts src/server/importers/__tests__/recordMapper.test.ts src/server/__tests__/candidateSync.test.ts
```

Expected after implementation: all tests pass.

- [ ] **Step 8: Commit frontend pool semantics**

```bash
git add src/shared/poolOptions.ts src/server/__tests__/poolOptions.test.ts src/server/importers/recordMapper.ts src/server/importers/__tests__/recordMapper.test.ts src/server/services/candidateSync.ts src/server/__tests__/candidateSync.test.ts
git commit -m "feat(pools): canonicalize three active pools"
```

## Task 3: Today Engineering Practice Ranking

**Files:**
- Modify: `src/server/services/poolRanking.ts`
- Create: `src/server/__tests__/poolRanking.test.ts`
- Modify: `src/app/dashboard/today/page.tsx`
- Modify: `src/components/dashboard/practice-picker.tsx`

**Interfaces:**
- Produces: `rankEngineeringPracticeItems(limit?: number): Promise<RankedItem[]>`.
- Consumes: canonical engineering candidates with `practiceFit`, `sourceType`, `publishedAt`, and `decisionConfidence`.

- [ ] **Step 1: Write failing ranking unit test**

Create `src/server/__tests__/poolRanking.test.ts` with a pure test around exported scoring helpers:

```ts
import { describe, expect, it } from "vitest";
import { isEngineeringPracticeCandidate, scoreEngineeringPracticeCandidate } from "@/server/services/poolRanking";

describe("engineering practice ranking", () => {
  it("excludes low-fit general knowledge items from Today practice recommendations", () => {
    expect(
      isEngineeringPracticeCandidate({
        contentType: "general",
        practiceFit: "low",
        sourceType: "news"
      })
    ).toBe(false);
  });

  it("accepts high-fit GitHub and tool candidates", () => {
    expect(
      isEngineeringPracticeCandidate({
        contentType: "github",
        practiceFit: "high",
        sourceType: "github_repo"
      })
    ).toBe(true);
  });

  it("scores practice fit for all engineering candidate types", () => {
    const high = scoreEngineeringPracticeCandidate({
      contentType: "general",
      decisionConfidence: 0.5,
      practiceFit: "high",
      publishedAt: "2026-07-18T00:00:00Z",
      sourceType: "tool"
    });
    const low = scoreEngineeringPracticeCandidate({
      contentType: "general",
      decisionConfidence: 0.5,
      practiceFit: "low",
      publishedAt: "2026-07-18T00:00:00Z",
      sourceType: "tool"
    });
    expect(high).toBeGreaterThan(low);
  });
});
```

- [ ] **Step 2: Run the failing test**

Run:

```bash
npm test -- src/server/__tests__/poolRanking.test.ts
```

Expected before implementation: fails because the exported helpers do not exist.

- [ ] **Step 3: Add engineering practice helpers**

In `src/server/services/poolRanking.ts`, export:

```ts
export type PracticeCandidateInput = {
  contentType: ContentType;
  decisionConfidence: number;
  practiceFit: string | null;
  publishedAt: string | null;
  sourceType: string | null;
};

const PRACTICE_SOURCE_TYPES = new Set(["github_repo", "tool", "release", "personal_blog"]);

export function isEngineeringPracticeCandidate(input: {
  contentType: ContentType;
  practiceFit: string | null;
  sourceType: string | null;
}): boolean {
  const fit = input.practiceFit?.toLowerCase();
  if (fit !== "high" && fit !== "medium") return false;
  if (input.contentType === "paper") return false;
  if (input.contentType === "github") return true;
  return input.sourceType ? PRACTICE_SOURCE_TYPES.has(input.sourceType) : false;
}

export function scoreEngineeringPracticeCandidate(input: PracticeCandidateInput): number {
  const freshness = computeFreshness(input.publishedAt);
  const pf = mapPracticeFit(input.practiceFit);
  const sourceBoost = input.contentType === "github" ? 1 : 0.7;
  return 0.5 * pf + 0.25 * input.decisionConfidence + 0.15 * freshness + 0.1 * sourceBoost;
}
```

- [ ] **Step 4: Add Today-specific ranking**

Add:

```ts
export async function rankEngineeringPracticeItems(limit = 3): Promise<RankedItem[]> {
  const candidates = await loadRankableCandidates("engineering");
  const items = await buildRankedItems(candidates, "engineering");
  return items
    .filter((item) =>
      isEngineeringPracticeCandidate({
        contentType: item.contentType,
        practiceFit: item.practiceFit,
        sourceType: item.sourceType
      })
    )
    .map((item) => ({
      ...item,
      rankScore: scoreEngineeringPracticeCandidate({
        contentType: item.contentType,
        decisionConfidence: item.decisionConfidence ?? 0.5,
        practiceFit: item.practiceFit,
        publishedAt: item.publishedAt,
        sourceType: item.sourceType
      })
    }))
    .sort((a, b) => b.rankScore - a.rankScore)
    .slice(0, limit);
}
```

Refactor existing `rankPoolItems` enough to share `loadRankableCandidates` and `buildRankedItems` without changing its external return type.

- [ ] **Step 5: Update Today page**

In `src/app/dashboard/today/page.tsx`, replace:

```ts
const practiceItems = await rankPoolItems("engineering", 3);
```

with:

```ts
const practiceItems = await rankEngineeringPracticeItems(3);
```

and update the import.

- [ ] **Step 6: Update Today copy**

In `src/components/dashboard/practice-picker.tsx`, change visible strings to:

```tsx
工程池暂无可练习条目。导入数据后，系统会从 practice_fit 为 high/medium 的工程候选中推荐三项。
```

and:

```tsx
以下来自工程池练习适配 Top 3，选定后自动创建 Task。
```

- [ ] **Step 7: Verify Today ranking**

Run:

```bash
npm test -- src/server/__tests__/poolRanking.test.ts
```

Expected after implementation: pass.

Manual check after import:

```bash
npx tsx -e "import { rankEngineeringPracticeItems } from './src/server/services/poolRanking'; (async () => { console.log(await rankEngineeringPracticeItems(3)); })();"
```

Expected: returned rows have `practiceFit` of `high` or `medium` and do not include low-fit general news/legal/cost items.

- [ ] **Step 8: Commit Today practice ranking**

```bash
git add src/server/services/poolRanking.ts src/server/__tests__/poolRanking.test.ts src/app/dashboard/today/page.tsx src/components/dashboard/practice-picker.tsx
git commit -m "fix(today): rank engineering practice candidates"
```

## Task 4: Candidate Pools List Suggestion Cards

**Files:**
- Modify: `src/shared/inboxTypes.ts`
- Modify: `src/server/services/candidatePools.ts`
- Modify: `src/server/actions/candidateActions.ts`
- Modify: `src/server/__tests__/candidatePools.test.ts`
- Modify: `src/components/inbox/pool-list-view.tsx`
- Modify: `src/components/inbox/pool-views.tsx`
- Modify: `src/components/inbox/pool-board.tsx`
- Modify: `src/app/inbox/pools/page.tsx`
- Modify: `src/components/inbox/pool-filters-bar.tsx`

**Interfaces:**
- Produces: `updateCandidateSuggestion(candidateId: string, suggestion: string): Promise<void>`.
- Produces server action: `updateCandidateSuggestionAction(candidateId: string, suggestion: string): Promise<void>`.
- Extends `PoolGroup.items[]` with `poolName`, `date`, `sourceName`, `priorityRationale`, `poolRationale`, `contentTags`, and `suggestion`.

- [ ] **Step 1: Write failing service test**

In `src/server/__tests__/candidatePools.test.ts`, add:

```ts
import { updateCandidateSuggestion } from "@/server/services/candidatePools";

it("updates editable candidate suggestion text", async () => {
  candidateFindUnique.mockResolvedValue({
    id: "candidate-1",
    recordKey: "product:c1",
    reason: "old suggestion"
  });
  candidateUpdate.mockResolvedValue({});

  await updateCandidateSuggestion("candidate-1", "new product suggestion");

  expect(candidateUpdate).toHaveBeenCalledWith({
    where: { id: "candidate-1" },
    data: { reason: "new product suggestion" }
  });
});
```

Adjust existing mocks to include `candidate.findUnique` and `candidate.update` if the file already defines them under different local names.

- [ ] **Step 2: Run failing service test**

Run:

```bash
npm test -- src/server/__tests__/candidatePools.test.ts
```

Expected before implementation: fails because `updateCandidateSuggestion` is missing.

- [ ] **Step 3: Extend shared pool item type**

In `src/shared/inboxTypes.ts`, add fields to `PoolGroup.items[]`:

```ts
poolName: string;
date: string | null;
sourceName: string | null;
suggestion: string;
priorityRationale?: string;
poolRationale?: string;
contentTags?: string[];
```

- [ ] **Step 4: Populate suggestion-card fields**

In `getCandidatePoolGroups`, map each candidate with:

```ts
const raw = parseSignalRaw(c.rawJson);
const poolName = normalizePoolName(c.poolName) ?? "archive";
```

and include:

```ts
poolName,
date: c.date,
sourceName: c.sourceName,
suggestion: c.reason ?? "",
priorityRationale: raw.priorityRationale,
poolRationale: raw.poolRationale,
contentTags: raw.contentTags
```

- [ ] **Step 5: Implement editable suggestion service and action**

In `src/server/services/candidatePools.ts`, export:

```ts
export async function updateCandidateSuggestion(candidateId: string, suggestion: string): Promise<void> {
  const next = suggestion.trim();
  if (!next) throw new Error("suggestion cannot be empty");
  await prisma.candidate.update({
    where: { id: candidateId },
    data: { reason: next }
  });
}
```

In `src/server/actions/candidateActions.ts`, add:

```ts
export async function updateCandidateSuggestionAction(candidateId: string, suggestion: string): Promise<void> {
  await updateCandidateSuggestionService(candidateId, suggestion);
  revalidatePath("/inbox/pools");
  revalidatePath("/dashboard/today");
}
```

Import it as `updateCandidateSuggestion as updateCandidateSuggestionService`.

- [ ] **Step 6: Make List the detailed suggestion workspace**

In `src/components/inbox/pool-views.tsx`, change initial mode:

```ts
const [mode, setMode] = useState<"board" | "list">("list");
```

Replace `src/components/inbox/pool-list-view.tsx` table rows with cards that render:

```tsx
<article className="rounded-md border border-border bg-surface p-4">
  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
    <span>{item.priority || "no priority"}</span>
    <span>{item.poolOption ?? item.poolName}</span>
    {item.date && <span>{item.date}</span>}
    {item.sourceName && <span>{item.sourceName}</span>}
  </div>
  <a href={item.url} target="_blank" rel="noreferrer" className="mt-2 block text-base font-semibold text-foreground hover:underline">
    {item.title}
  </a>
  {item.summary && <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.summary}</p>}
  {item.priorityRationale && <p className="mt-2 text-xs text-muted-foreground">优先级建议：{item.priorityRationale}</p>}
  {item.poolRationale && <p className="mt-1 text-xs text-muted-foreground">分池建议：{item.poolRationale}</p>}
  {(item.poolOption === "product" || item.poolOption === "engineering") && (
    <EditableSuggestion candidateId={item.id} initialValue={item.suggestion} disabled={pending} />
  )}
  <div className="mt-3 flex flex-wrap gap-2">
    {/* keep existing priority select, pool select, watch, task, drop controls */}
  </div>
</article>
```

Create `EditableSuggestion` in the same file. It uses local state and calls `updateCandidateSuggestionAction` on save.

- [ ] **Step 7: Keep Board compact**

In `src/components/inbox/pool-board.tsx`, keep summary tooltip and remove any long suggestion text from the card body. Keep only title, status chips, priority select, task action, and pool select.

- [ ] **Step 8: Update visible copy**

In `src/app/inbox/pools/page.tsx`, replace:

```tsx
description="Organize product inspiration, paper candidates, demo replication, knowledge gaps, personal work, archive, and dropped items."
```

with:

```tsx
description="Use List for editable product and engineering suggestion cards; use Board for quick pool and priority overview."
```

In `src/components/inbox/pool-filters-bar.tsx`, show Chinese labels:

```ts
const POOL_LABELS = { product: "产品", paper: "论文", engineering: "工程" };
```

- [ ] **Step 9: Verify suggestion cards**

Run:

```bash
npm test -- src/server/__tests__/candidatePools.test.ts
npm run typecheck
```

Expected: tests pass; typecheck has no new errors.

- [ ] **Step 10: Commit List/Board split**

```bash
git add src/shared/inboxTypes.ts src/server/services/candidatePools.ts src/server/actions/candidateActions.ts src/server/__tests__/candidatePools.test.ts src/components/inbox/pool-list-view.tsx src/components/inbox/pool-views.tsx src/components/inbox/pool-board.tsx src/app/inbox/pools/page.tsx src/components/inbox/pool-filters-bar.tsx
git commit -m "feat(pools): show editable suggestion cards in list"
```

## Task 5: Active Daily Import And Backups Exclusion

**Files:**
- Modify: `src/server/importers/importSources.ts`
- Modify: `src/server/importers/__tests__/runImport.test.ts`
- Modify: `src/app/api/import/route.ts`
- Modify: `scripts/import.ts`
- Modify: `docs/cortexops-data-contract.md`

**Interfaces:**
- Produces: `DAILY_ACTIVE_DIR = "state/daily/active"`.
- Produces daily import sources that include `state/daily/active/*-links.jsonl` and `state/daily/active/*-report.md`.

- [ ] **Step 1: Write failing import source test**

Create or update an import source test with:

```ts
import { describe, expect, it, vi } from "vitest";
import { buildDefaultSources, listDailyReportFiles } from "@/server/importers/importSources";

vi.mock("node:fs/promises", () => ({
  readdir: vi.fn(async (dir: string) => {
    if (dir === "state/daily/active") {
      return ["2026-07-18-links.jsonl", "2026-07-18-report.md", "2026-07-18-ingest-error.md"];
    }
    if (dir === "pools") {
      return ["product-inspiration.jsonl", "paper-candidates.jsonl", "demo-replication.jsonl"];
    }
    return [];
  })
}));

describe("importSources", () => {
  it("reads daily reports from active only", async () => {
    await expect(listDailyReportFiles()).resolves.toEqual([
      "state/daily/active/2026-07-18-report.md"
    ]);
  });

  it("builds default daily link sources from active only", async () => {
    const sources = await buildDefaultSources();
    expect(sources[0]).toEqual({
      stream: "daily",
      files: [{ path: "state/daily/active/2026-07-18-links.jsonl" }]
    });
  });
});
```

- [ ] **Step 2: Run failing import source test**

Run:

```bash
npm test -- src/server/importers/__tests__/importSources.test.ts
```

Expected before implementation: fails if the test file is new or because current code reads `state/daily`.

- [ ] **Step 3: Implement active daily directory**

In `src/server/importers/importSources.ts`, add:

```ts
export const DAILY_ACTIVE_DIR = "state/daily/active";
```

Replace:

```ts
return listBySuffix("state/daily", "-report.md");
```

with:

```ts
return listBySuffix(DAILY_ACTIVE_DIR, "-report.md");
```

Replace:

```ts
const dailyFiles = await listBySuffix("state/daily", "-links.jsonl");
```

with:

```ts
const dailyFiles = await listBySuffix(DAILY_ACTIVE_DIR, "-links.jsonl");
```

- [ ] **Step 4: Update user-facing import copy**

In Today empty state, change:

```tsx
Import state/daily/*-links.jsonl
```

to:

```tsx
Import state/daily/active/*-links.jsonl
```

Update `docs/cortexops-data-contract.md` to state that backups are ignored by implementation, not only by policy.

- [ ] **Step 5: Verify import source behavior**

Run:

```bash
npm test -- src/server/importers/__tests__/importSources.test.ts src/server/importers/__tests__/runImport.test.ts
```

Expected: tests pass; no backup path appears in expected sources.

- [ ] **Step 6: Commit active import path**

```bash
git add src/server/importers/importSources.ts src/server/importers/__tests__/importSources.test.ts src/server/importers/__tests__/runImport.test.ts src/app/dashboard/today/page.tsx docs/cortexops-data-contract.md
git commit -m "fix(import): read active daily inputs only"
```

## Task 6: Controlled SQLite Rebuild And Symlink Git Hygiene

**Files:**
- Create: `docs/superpowers/plans/2026-07-19-daily-import-rebuild-runbook.md`
- Modify only after approval: `.gitignore` or tracked `state` / `pools` entries if symlink policy is confirmed.

**Interfaces:**
- Produces: documented operator runbook for rebuilding imported SQLite state.
- Does not run destructive cleanup without explicit approval.

- [ ] **Step 1: Write the rebuild runbook**

Create `docs/superpowers/plans/2026-07-19-daily-import-rebuild-runbook.md` with:

```markdown
# Daily Import Rebuild Runbook

This runbook is for the one-time migration after the web importer switches to `state/daily/active`.

## Approval Required

Before running any database cleanup, ask the user to approve deleting imported rows from:

- Signal
- Candidate
- DailyReport
- ImportRun rows created by the old import process

Do not delete:

- Task
- AuditLog
- BehaviorEvent
- Artifact
- Memo
- FocusRule

## Read-Only Audit

Run:

sqlite3 prisma/dev.db "select max(date) from DailyReport; select max(date) from Signal; select max(date) from Candidate;"
sqlite3 prisma/dev.db "select sourceFile, count(*) from Signal group by sourceFile order by sourceFile;"
sqlite3 prisma/dev.db "select sourceFile, count(*) from Candidate group by sourceFile order by sourceFile;"

## Approved Cleanup

After approval, run a transaction that deletes imported report/signal/candidate rows and then run:

npm run import

## Expected Result

The newest DailyReport, Signal, and Candidate dates match files in `state/daily/active`.
No `state/daily/backups` path appears in Signal or DailyReport sourceFile values.
```

- [ ] **Step 2: Decide symlink policy with the user**

Ask:

```text
当前 web worktree 的 state 和 pools 是 symlink 到 /Users/jiexinlv/CortexOps。是否确认把这个作为长期方案提交？
```

If approved, stage symlink changes intentionally. If rejected, restore ordinary directories and keep backend data access through import configuration.

- [ ] **Step 3: Verify no accidental tracked backup import**

Run:

```bash
git status --short state pools
find state/daily/backups -maxdepth 2 -type f | head
```

Expected: backups may exist on disk but are not staged for import logic changes.

- [ ] **Step 4: Commit runbook only**

```bash
git add docs/superpowers/plans/2026-07-19-daily-import-rebuild-runbook.md
git commit -m "docs(import): add daily rebuild runbook"
```

## Task 7: End-To-End Verification And PR

**Files:**
- No new source files.
- Uses committed changes from Tasks 1-6.

**Interfaces:**
- Produces: PR with backend prompt cleanup, frontend pool semantics, Today engineering practice ranking, List suggestion cards, active import path, and rebuild runbook.

- [ ] **Step 1: Run mechanical checks**

In `/Users/jiexinlv/CortexOps-web-workbench`, run:

```bash
npm test
npm run lint
npm run build
npm run typecheck
```

Expected: all pass. If typedRoutes are stale, run `npm run build` before `npm run typecheck` and record the exact result.

- [ ] **Step 2: Run backend prompt checks**

In `/Users/jiexinlv/CortexOps`, run:

```bash
rg -n "今日练习三选一|formal daily practice|pools/personal-work|personal_work" prompts automations docs/source-policy.md docs/ingestion-normalization.md docs/cortexops-data-contract.md
```

Expected: no active prompt/policy matches.

- [ ] **Step 3: Run import path audit**

In `/Users/jiexinlv/CortexOps-web-workbench`, run:

```bash
rg -n "listBySuffix\\(\"state/daily\"" src scripts
rg -n "state/daily/backups" src scripts
```

Expected: no old flat daily import call; no backups import usage.

- [ ] **Step 4: Run structure search**

Run:

```bash
rg -n "catch \\{|as any|console\\.log|personal_work|personal-work|demo_replication|knowledge_gap" src
```

Expected: no new `catch {` introduced by this implementation; legacy pool strings appear only in migration tests or compatibility maps.

- [ ] **Step 5: Manual UI verification**

Start dev server:

```bash
npm run dev
```

Open:

```text
http://localhost:3000/dashboard/today
http://localhost:3000/inbox/pools
```

Expected:

- Today shows three engineering practice candidates, not report section 4 content.
- Candidate Pools defaults to List.
- Product and Engineering list cards show editable suggestion text and Add to Task action.
- Paper cards show reading information without editable suggestion block.
- Board remains compact and focused on quick pool/priority/status overview.

- [ ] **Step 6: Create PR**

Push the working branch:

```bash
git push -u origin <branch-name>
```

Create PR:

```bash
gh pr create --base main --head <branch-name> --title "Align daily practice and pool semantics" --body-file /tmp/daily-practice-pool-pr.md
```

Use this PR body:

```markdown
## Summary

- Removes generated daily report practice options from backend prompt/policy.
- Canonicalizes active pools to product / paper / engineering.
- Keeps Today practice selection sourced from engineering candidates.
- Turns Candidate Pools List into detailed editable suggestion cards while keeping Board compact.
- Reads daily web imports from state/daily/active only and documents SQLite rebuild.

## Verification

- npm test
- npm run lint
- npm run build
- npm run typecheck
- rg prompt/policy cleanup checks
- manual /dashboard/today and /inbox/pools check

## Notes

- No dependency changes.
- No Prisma schema changes.
- SQLite rebuild is documented but not executed without approval.
```

## Self-Review

- Spec coverage: backend daily practice removal is covered by Task 1; three-pool semantics by Task 2; Today engineering recommendations by Task 3; product/engineering suggestion cards and Board/List split by Task 4; active/backups import by Task 5; SQLite and symlink concerns by Task 6; verification and PR by Task 7.
- Placeholder scan: no unfinished-marker terms or open implementation placeholders remain.
- Type consistency: `normalizePoolName`, `rankEngineeringPracticeItems`, `updateCandidateSuggestion`, and `updateCandidateSuggestionAction` are defined before later tasks reference them.
