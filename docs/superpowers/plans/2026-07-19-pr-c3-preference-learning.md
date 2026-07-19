# PR-C3 Preference Learning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist thumbs-up/thumbs-down feedback from the reading pack, learn `PreferenceWeight` via prediction error, and wire that weight into `confidence.ts` history so scoring becomes three-factor when sample size is sufficient.

**Architecture:** Add `BehaviorEvent` + `PreferenceWeight` tables. Reading-pack UI calls server actions that freeze signal snapshots into events and update weights. `computeHistoryMatch` queries weights (`eventCount >= 5`). A consolidation service reinforces recent active patterns and decays inactive ones. No new npm dependencies.

**Tech Stack:** Next.js 16 App Router, React 18, TypeScript, Prisma/SQLite, Vitest, existing `"use server"` actions + `revalidatePath`.

## Global Constraints

- Base branch: `codex/daily-practice-pool-plan` (must include C1+C2 commits `2b4d125` / `14d5482`).
- Do not change C2 thresholds (`AUTO_CONFIRM_THRESHOLD=0.75`, `REVOCABLE_THRESHOLD=0.4`) or source/focus maps.
- Do not add npm dependencies.
- Schema is additive only — no drops/renames of existing Signal columns.
- History factor stays `null` until matching weight has `eventCount >= 5`.
- `thumbsUp` does not remove from reading pack; `thumbsDown` does (`readingPackStatus = not_selected`).
- Down reasons are exactly: `direction` | `shallow` | `source_quality`.
- `source_quality` must not update content-tag `PreferenceWeight`.
- Prefer pure functions for learning math (unit-testable without DB); Prisma I/O in thin service wrappers.
- Follow existing action pattern: `"use server"` + `revalidatePath("/dashboard/today")`.

---

## File Structure

| File | Responsibility |
|------|----------------|
| `prisma/schema.prisma` | Add `BehaviorEvent`, `PreferenceWeight`, `Signal.behaviorEvents` |
| `prisma/migrations/20260719140000_add_preference_learning/` | CREATE TABLE SQL |
| `src/shared/preferenceLearning.ts` | Pure helpers: tag key, actual score, reason scale, weight update, history clamp |
| `src/server/services/behaviorLearning.ts` | Record event, upsert weight, consolidate |
| `src/server/services/confidence.ts` | Restore `computeHistoryMatch` PreferenceWeight lookup |
| `src/server/actions/behaviorActions.ts` | `thumbsUp` / `thumbsDown` server actions |
| `src/components/dashboard/reading-pack.tsx` | Thumbs UI + down-reason picker |
| `src/server/__tests__/preferenceLearning.test.ts` | Pure math unit tests |
| `src/server/__tests__/behaviorLearning.test.ts` | Service logic with Prisma mocks / fakes |
| `src/server/__tests__/confidence.test.ts` | History null vs three-factor scoring |
| `docs/superpowers/plans/2026-07-19-pr-c-confidence-routing-handoff.md` | Keep progress in sync after merge |

---

## Locked algorithms (from approved design)

### Preference key

```ts
export function preferenceKey(contentTags: string[], sourceType: string | null): {
  contentTags: string;
  sourceType: string;
} {
  const tags = [...contentTags]
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean)
    .sort();
  return {
    contentTags: tags.join("|"), // empty string allowed (untagged)
    sourceType: (sourceType ?? "").trim().toLowerCase()
  };
}
```

### Actual outcome & reason scale

```ts
export type ThumbsDownReason = "direction" | "shallow" | "source_quality";

export function actualFromEvent(eventType: "thumbs_up" | "thumbs_down"): number {
  return eventType === "thumbs_up" ? 1 : 0;
}

/** Multiplier for content-tag weight updates. source_quality → 0 (skip). */
export function reasonScale(reason: ThumbsDownReason | null): number {
  if (reason === null) return 1; // thumbs_up
  if (reason === "direction") return 1;
  if (reason === "shallow") return 0.4;
  return 0; // source_quality
}
```

### Weight update (prediction error)

```ts
export const DEFAULT_WEIGHT = 0.5;
export const LEARNING_RATE = 0.2;
export const MIN_WEIGHT = 0;
export const MAX_WEIGHT = 1;
export const HISTORY_MIN_EVENTS = 5;

export function nextWeight(params: {
  currentWeight: number;
  predictedConfidence: number;
  eventType: "thumbs_up" | "thumbs_down";
  reason: ThumbsDownReason | null;
}): number | null {
  const scale = reasonScale(params.reason);
  if (scale === 0) return null; // skip update
  const actual = actualFromEvent(params.eventType);
  const error = actual - params.predictedConfidence;
  const updated = params.currentWeight + LEARNING_RATE * scale * error;
  return Math.min(MAX_WEIGHT, Math.max(MIN_WEIGHT, updated));
}
```

### History match

```ts
export function historyFromWeight(weight: number | null, eventCount: number): number | null {
  if (weight === null || eventCount < HISTORY_MIN_EVENTS) return null;
  return weight;
}
```

When multiple tag keys could match a signal, C3 uses **exact** preference key from the signal’s full sorted tag set + sourceType (same as freeze key). No partial-tag averaging in C3 (YAGNI).

### Consolidation

```ts
export const CONSOLIDATION_WINDOW_DAYS = 14;
export const REINFORCE_MIN_EVENTS = 2;
export const REINFORCE_BOOST = 0.05;
export const DECAY_FACTOR = 0.97;
export const PRUNE_WEIGHT_FLOOR = 0.05;
export const PRUNE_MIN_IDLE_DAYS = 30;
```

- For each `PreferenceWeight` with ≥ `REINFORCE_MIN_EVENTS` BehaviorEvents in last 14 days whose frozen key matches: `weight = clamp(weight + REINFORCE_BOOST)`.
- Else if `lastUpdated` older than 14 days: `weight = clamp(weight * DECAY_FACTOR)`.
- Prune row if `weight < PRUNE_WEIGHT_FLOOR` AND idle ≥ 30 days AND `eventCount < HISTORY_MIN_EVENTS`.

Call site for C3: export `consolidatePreferenceWeights()` and invoke it at the **end of** `routeSignalsByConfidence` (once per import). No cron UI.

---

### Task 1: Schema + migration

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260719140000_add_preference_learning/migration.sql`
- Test: verify with `npx prisma validate` / `npm run db:push` in dev

**Interfaces:**
- Consumes: existing `Signal` model (C1 fields already present)
- Produces: `BehaviorEvent`, `PreferenceWeight`, `Signal.behaviorEvents`

- [ ] **Step 1: Add models to `prisma/schema.prisma`**

On `Signal`, after `sourceTier`, add:

```prisma
  behaviorEvents BehaviorEvent[]
```

Append:

```prisma
model BehaviorEvent {
  id                   String   @id @default(cuid())
  signalId             String
  signal               Signal   @relation(fields: [signalId], references: [id])
  eventType            String // thumbs_up | thumbs_down
  reason               String? // direction | shallow | source_quality
  contentTags          String // JSON array snapshot
  sourceType           String?
  predictedConfidence  Float?
  createdAt            DateTime @default(now())

  @@index([signalId])
  @@index([eventType])
}

model PreferenceWeight {
  id           String   @id @default(cuid())
  contentTags  String // sorted tags joined by "|"
  sourceType   String   @default("")
  weight       Float    @default(0.5)
  eventCount   Int      @default(0)
  lastUpdated  DateTime @default(now())

  @@unique([contentTags, sourceType])
}
```

- [ ] **Step 2: Add migration SQL**

`prisma/migrations/20260719140000_add_preference_learning/migration.sql`:

```sql
-- CreateTable
CREATE TABLE "BehaviorEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "signalId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "reason" TEXT,
    "contentTags" TEXT NOT NULL,
    "sourceType" TEXT,
    "predictedConfidence" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BehaviorEvent_signalId_fkey" FOREIGN KEY ("signalId") REFERENCES "Signal" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PreferenceWeight" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "contentTags" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL DEFAULT '',
    "weight" REAL NOT NULL DEFAULT 0.5,
    "eventCount" INTEGER NOT NULL DEFAULT 0,
    "lastUpdated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "BehaviorEvent_signalId_idx" ON "BehaviorEvent"("signalId");

-- CreateIndex
CREATE INDEX "BehaviorEvent_eventType_idx" ON "BehaviorEvent"("eventType");

-- CreateIndex
CREATE UNIQUE INDEX "PreferenceWeight_contentTags_sourceType_key" ON "PreferenceWeight"("contentTags", "sourceType");
```

- [ ] **Step 3: Generate client**

Run:

```bash
npx prisma generate
npx prisma validate
```

Expected: validate OK; client includes `behaviorEvent` / `preferenceWeight`.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/20260719140000_add_preference_learning
git commit -m "$(cat <<'EOF'
feat(schema): add BehaviorEvent and PreferenceWeight for PR-C3

EOF
)"
```

---

### Task 2: Pure preference learning helpers + tests (TDD)

**Files:**
- Create: `src/shared/preferenceLearning.ts`
- Create: `src/server/__tests__/preferenceLearning.test.ts`

**Interfaces:**
- Consumes: none
- Produces: `preferenceKey`, `actualFromEvent`, `reasonScale`, `nextWeight`, `historyFromWeight`, constants

- [ ] **Step 1: Write failing tests**

```ts
import { describe, expect, it } from "vitest";
import {
  preferenceKey,
  nextWeight,
  historyFromWeight,
  reasonScale,
  DEFAULT_WEIGHT,
  HISTORY_MIN_EVENTS
} from "@/shared/preferenceLearning";

describe("preferenceKey", () => {
  it("sorts and lowercases tags", () => {
    expect(preferenceKey(["B", "a"], "GitHub")).toEqual({
      contentTags: "a|b",
      sourceType: "github"
    });
  });
});

describe("reasonScale", () => {
  it("skips source_quality", () => {
    expect(reasonScale("source_quality")).toBe(0);
  });
  it("reduces shallow", () => {
    expect(reasonScale("shallow")).toBe(0.4);
  });
});

describe("nextWeight", () => {
  it("raises weight on thumbs_up when prediction was low", () => {
    const w = nextWeight({
      currentWeight: DEFAULT_WEIGHT,
      predictedConfidence: 0.2,
      eventType: "thumbs_up",
      reason: null
    });
    expect(w).toBeCloseTo(0.5 + 0.2 * 1 * (1 - 0.2), 5);
  });

  it("returns null for source_quality", () => {
    expect(
      nextWeight({
        currentWeight: 0.5,
        predictedConfidence: 0.9,
        eventType: "thumbs_down",
        reason: "source_quality"
      })
    ).toBeNull();
  });
});

describe("historyFromWeight", () => {
  it("returns null below min events", () => {
    expect(historyFromWeight(0.8, HISTORY_MIN_EVENTS - 1)).toBeNull();
  });
  it("returns weight at threshold", () => {
    expect(historyFromWeight(0.8, HISTORY_MIN_EVENTS)).toBe(0.8);
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npm test -- src/server/__tests__/preferenceLearning.test.ts
```

Expected: cannot resolve module / FAIL.

- [ ] **Step 3: Implement `src/shared/preferenceLearning.ts`**

Implement exactly the locked algorithms in the section above (same constant names and formulas).

- [ ] **Step 4: Run tests — expect PASS**

```bash
npm test -- src/server/__tests__/preferenceLearning.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/shared/preferenceLearning.ts src/server/__tests__/preferenceLearning.test.ts
git commit -m "$(cat <<'EOF'
feat(preference): add pure prediction-error learning helpers

EOF
)"
```

---

### Task 3: behaviorLearning service + tests

**Files:**
- Create: `src/server/services/behaviorLearning.ts`
- Create: `src/server/__tests__/behaviorLearning.test.ts`

**Interfaces:**
- Consumes: `preferenceKey`, `nextWeight`, consolidation constants; Prisma; `parseSignalRaw`
- Produces:
  - `recordBehaviorEvent(input): Promise<{ eventId: string; weightUpdated: boolean }>`
  - `consolidatePreferenceWeights(): Promise<{ reinforced: number; decayed: number; pruned: number }>`

```ts
export type RecordBehaviorInput = {
  signalId: string;
  eventType: "thumbs_up" | "thumbs_down";
  reason?: "direction" | "shallow" | "source_quality" | null;
};
```

**Behavior of `recordBehaviorEvent`:**

1. Load signal; throw if missing.
2. Parse `contentTags` / `sourceType` from `rawJson`; freeze into event.
3. Set `predictedConfidence = signal.decisionConfidence`.
4. Insert `BehaviorEvent` (`contentTags` stored as `JSON.stringify(tags)` for audit; preference key uses `preferenceKey`).
5. If `reasonScale(reason) === 0`, skip weight upsert; return `{ weightUpdated: false }`.
6. Else upsert `PreferenceWeight` by unique key:
   - create with `DEFAULT_WEIGHT` then apply `nextWeight`, `eventCount: 1`
   - update: apply `nextWeight` to current, `eventCount += 1`, `lastUpdated = now`
7. For `thumbs_down` only: also set signal `readingPackStatus = "not_selected"` and write `AuditLog` action `thumbs_down` (and `thumbs_up` audit for up). Do this in the same transaction as the event insert when possible.

- [ ] **Step 1: Write service tests with prisma mocked** (follow `poolRanking.test.ts` mock style)

Cover at least:

- thumbs_up creates event + bumps weight
- thumbs_down + `source_quality` creates event but does not change weight
- thumbs_down sets `readingPackStatus` to `not_selected`
- consolidate reinforces / decays / prunes per rules

- [ ] **Step 2: Run — expect FAIL**

```bash
npm test -- src/server/__tests__/behaviorLearning.test.ts
```

- [ ] **Step 3: Implement `behaviorLearning.ts`**

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add src/server/services/behaviorLearning.ts src/server/__tests__/behaviorLearning.test.ts
git commit -m "$(cat <<'EOF'
feat(preference): record behavior events and update preference weights

EOF
)"
```

---

### Task 4: Wire history into confidence.ts

**Files:**
- Modify: `src/server/services/confidence.ts` (`computeHistoryMatch`)
- Modify: `src/server/services/confidence.ts` (`routeSignalsByConfidence` — call consolidate at end)
- Create: `src/server/__tests__/confidence.test.ts`

**Interfaces:**
- Consumes: `preferenceKey`, `historyFromWeight`, Prisma `preferenceWeight`
- Produces: non-null history when `eventCount >= 5`; three-factor score weights already exist in C2

- [ ] **Step 1: Write confidence tests**

```ts
import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/server/db", () => ({
  prisma: {
    preferenceWeight: { findUnique: vi.fn() },
    signal: { findMany: vi.fn(), update: vi.fn() },
    auditLog: { create: vi.fn() },
    $transaction: vi.fn(async (ops: unknown) => ops)
  }
}));

vi.mock("@/server/services/focusRules", () => ({
  listEffectiveFocusRules: vi.fn(async () => [])
}));

vi.mock("@/server/services/candidateSync", () => ({
  syncSignalToCandidate: vi.fn()
}));

vi.mock("@/server/services/behaviorLearning", () => ({
  consolidatePreferenceWeights: vi.fn(async () => ({ reinforced: 0, decayed: 0, pruned: 0 }))
}));

import { computeDecisionConfidence } from "@/server/services/confidence";
import { prisma } from "@/server/db";

describe("computeDecisionConfidence history", () => {
  beforeEach(() => vi.clearAllMocks());

  it("keeps two-factor scoring when eventCount < 5", async () => {
    (prisma.preferenceWeight.findUnique as any).mockResolvedValue({
      weight: 0.9,
      eventCount: 4
    });
    const result = await computeDecisionConfidence({
      confidence: "high",
      sourceTier: "Tier 1",
      contentTags: ["agents"],
      sourceType: "github",
      focusRules: []
    });
    expect(result.factors.history).toBeNull();
    expect(result.score).toBeCloseTo(0.5 * result.factors.source + 0.5 * result.factors.focus);
  });

  it("uses three-factor scoring when eventCount >= 5", async () => {
    (prisma.preferenceWeight.findUnique as any).mockResolvedValue({
      weight: 0.8,
      eventCount: 5
    });
    const result = await computeDecisionConfidence({
      confidence: "high",
      sourceTier: "Tier 1",
      contentTags: ["agents"],
      sourceType: "github",
      focusRules: [
        {
          id: "f1",
          name: "t",
          status: "active",
          priorityBoost: "medium",
          sourceTypes: ["github"],
          contentTags: ["agents"],
          candidatePoolBoost: null,
          appliesTo: [],
          startDate: null,
          endDate: null
        }
      ]
    });
    expect(result.factors.history).toBe(0.8);
    expect(result.score).toBeCloseTo(
      0.35 * result.factors.source + 0.3 * result.factors.focus + 0.35 * 0.8
    );
  });
});
```

Adjust the focus-rule fixture shape to match `FocusRuleItem` in `src/shared/focusRules.ts` if fields differ — copy the real type fields exactly.

- [ ] **Step 2: Run — expect FAIL** (history still stubbed)

```bash
npm test -- src/server/__tests__/confidence.test.ts
```

- [ ] **Step 3: Replace `computeHistoryMatch` stub**

```ts
async function computeHistoryMatch(
  contentTags: string[],
  sourceType: string | null
): Promise<number | null> {
  const key = preferenceKey(contentTags, sourceType);
  const row = await prisma.preferenceWeight.findUnique({
    where: {
      contentTags_sourceType: {
        contentTags: key.contentTags,
        sourceType: key.sourceType
      }
    },
    select: { weight: true, eventCount: true }
  });
  if (!row) return null;
  return historyFromWeight(row.weight, row.eventCount);
}
```

At end of `routeSignalsByConfidence`, after the loop:

```ts
await consolidatePreferenceWeights();
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npm test -- src/server/__tests__/confidence.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/server/services/confidence.ts src/server/__tests__/confidence.test.ts
git commit -m "$(cat <<'EOF'
feat(confidence): enable history factor from PreferenceWeight

EOF
)"
```

---

### Task 5: Server actions + reading-pack UI

**Files:**
- Create: `src/server/actions/behaviorActions.ts`
- Modify: `src/components/dashboard/reading-pack.tsx`
- Verify: `src/app/dashboard/today/page.tsx` already passes items with `id` via `SignalView` (C2 tip includes optional `id`)

**Interfaces:**
- Consumes: `recordBehaviorEvent`
- Produces: `thumbsUpAction(signalId)`, `thumbsDownAction(signalId, reason)`

- [ ] **Step 1: Implement actions**

```ts
"use server";

import { revalidatePath } from "next/cache";
import { recordBehaviorEvent } from "@/server/services/behaviorLearning";
import type { ThumbsDownReason } from "@/shared/preferenceLearning";

export async function thumbsUpAction(signalId: string) {
  await recordBehaviorEvent({ signalId, eventType: "thumbs_up", reason: null });
  revalidatePath("/dashboard/today");
}

export async function thumbsDownAction(signalId: string, reason: ThumbsDownReason) {
  await recordBehaviorEvent({ signalId, eventType: "thumbs_down", reason });
  revalidatePath("/dashboard/today");
  revalidatePath("/inbox/today");
}
```

- [ ] **Step 2: Update `ReadingPack` UI**

Requirements:

- Only render buttons when `item.id` is defined.
- Thumbs up: single button calling `thumbsUpAction`.
- Thumbs down: opens inline reason choices (`方向不对` / `太浅` / `来源不行`) mapped to `direction` / `shallow` / `source_quality`; then calls `thumbsDownAction`.
- Use existing workbench button/muted styles — no new card chrome beyond what’s already on the list item.
- Use `useTransition` / pending disable so double-clicks don’t double-record.
- Chinese labels OK to match surrounding Today copy; keep reason enum English in code.

Sketch:

```tsx
"use client";

import { useState, useTransition } from "react";
import type { SignalView } from "@/server/services/dailyView";
import { ContentTagChips } from "@/components/shared/content-tag-chips";
import { thumbsDownAction, thumbsUpAction } from "@/server/actions/behaviorActions";
import type { ThumbsDownReason } from "@/shared/preferenceLearning";

const DOWN_REASONS: { reason: ThumbsDownReason; label: string }[] = [
  { reason: "direction", label: "方向不对" },
  { reason: "shallow", label: "太浅" },
  { reason: "source_quality", label: "来源不行" }
];

export function ReadingPack({ items }: { items: SignalView[] }) {
  return (
    <ul className="flex flex-col gap-4">
      {items.map((item, i) => (
        <ReadingPackItem key={item.id ?? i} item={item} />
      ))}
    </ul>
  );
}

function ReadingPackItem({ item }: { item: SignalView }) {
  const [pending, startTransition] = useTransition();
  const [pickingReason, setPickingReason] = useState(false);

  // ...existing title/summary/tags/reason blocks...

  if (!item.id) return /* existing markup without buttons */;

  return (
    /* existing markup + */
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={pending}
        className="text-sm text-muted-foreground hover:text-foreground"
        onClick={() => startTransition(() => thumbsUpAction(item.id!))}
      >
        赞
      </button>
      <button
        type="button"
        disabled={pending}
        className="text-sm text-muted-foreground hover:text-foreground"
        onClick={() => setPickingReason((v) => !v)}
      >
        踩
      </button>
      {pickingReason &&
        DOWN_REASONS.map(({ reason, label }) => (
          <button
            key={reason}
            type="button"
            disabled={pending}
            className="text-sm underline"
            onClick={() =>
              startTransition(async () => {
                await thumbsDownAction(item.id!, reason);
                setPickingReason(false);
              })
            }
          >
            {label}
          </button>
        ))}
    </div>
  );
}
```

Preserve all existing fields (`readReason`, knowledge-gap blocks, tags). Convert file to client component only if needed; if parent is server component, splitting `ReadingPackItem` as `"use client"` child is preferred to keep the list shell server-friendly — either approach is fine if Today page still compiles.

- [ ] **Step 3: Ensure Today view supplies `id`**

In `getDailyReadingView` / `toView` path, confirm `id` is selected from Prisma and passed through (already optional on C2 tip). If missing, add `id: true` to the query select / map.

- [ ] **Step 4: Manual smoke (dev)**

```bash
npm run db:push
npm run dev
```

Open `/dashboard/today` with a selected reading pack: click 赞 (stays); click 踩 → reason → item leaves pack.

- [ ] **Step 5: Commit**

```bash
git add src/server/actions/behaviorActions.ts src/components/dashboard/reading-pack.tsx src/server/services/dailyView.ts
git commit -m "$(cat <<'EOF'
feat(reading-pack): thumbs up/down feedback for preference learning

EOF
)"
```

---

### Task 6: Verification + handoff update

**Files:**
- Modify: `docs/superpowers/plans/2026-07-19-pr-c-confidence-routing-handoff.md`

- [ ] **Step 1: Run full checks**

```bash
npm test
npm run lint
npm run typecheck
```

If typecheck complains about new routes only, run `npm run build` first per AGENTS.md (`typedRoutes`).

Expected: all green.

- [ ] **Step 2: Update handoff status**

Set C3 to ✅ with commit SHAs; note migration name; remove “no code committed”.

- [ ] **Step 3: Final commit**

```bash
git add docs/superpowers/plans/2026-07-19-pr-c-confidence-routing-handoff.md
git commit -m "$(cat <<'EOF'
docs(handoff): mark PR-C3 preference learning complete

EOF
)"
```

---

## Self-review

1. **Spec coverage:** Schema, freeze snapshots, prediction-error learning, reason scales, history≥5, consolidation, reading-pack UI, confidence wiring — all have tasks.
2. **Placeholders:** None intentional; focus-rule fixture in Task 4 must be aligned to real `FocusRuleItem` at implement time.
3. **Type consistency:** `ThumbsDownReason`, `preferenceKey`, `recordBehaviorEvent`, `thumbsUpAction` / `thumbsDownAction` names are stable across tasks.
4. **Branch risk:** Implementing on `codex/web-workbench` without C1/C2 will fail — always start from `codex/daily-practice-pool-plan`.
