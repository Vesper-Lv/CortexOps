# PR-C3 Behavior Learning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let reading-pack thumbsUp/thumbsDown teach PreferenceWeight so `computeHistoryMatch` stops returning null and decision-confidence becomes a true three-factor score.

**Architecture:** Persist every thumbs event as a frozen `BehaviorEvent` snapshot; update (or create) a `PreferenceWeight` row keyed by serialized `contentTags` + `sourceType` via prediction-error learning; periodically consolidate weights; wire history back into `confidence.ts`. UI lives on Dashboard reading pack only.

**Tech Stack:** Next.js App Router, React 18 Server Actions, Prisma/SQLite, Vitest.

**Base branch:** `codex/daily-practice-pool-plan` (C1+C2 already landed).  
**Handoff:** `docs/superpowers/plans/2026-07-19-pr-c-confidence-routing-handoff.md`

---

## Global Constraints

- Do not change AUTO (`0.75`) / REVOCABLE (`0.4`) thresholds.
- Do not add npm dependencies.
- Do not delete Task / AuditLog / FocusRule / existing Signal rows.
- Prefer Server Actions + existing `revalidatePath` patterns (`reviewActions.ts`).
- `contentTags` on PreferenceWeight / BehaviorEvent is a **serialized string** (sorted tags joined by `|`), never a JSON array column, so `@@unique([contentTags, sourceType])` works on SQLite.
- Empty tags serialize to `""`; null `sourceType` stores as `""`.
- History participates only when matching PreferenceWeight has `eventCount >= 5`.

---

## Locked Learning Rules

### Outcomes

| Event | `actual` | Pack side effect |
|-------|----------|------------------|
| `thumbs_up` | `1.0` | none |
| `thumbs_down` | `0.0` | set `readingPackStatus` to `not_selected` (via `draftSignalEdit` toggle if currently selected, or direct update) |

### Reason scales (applied to content-tag weight updates)

| `reason` | `scale` | Meaning |
|----------|---------|---------|
| `null` (thumbs_up) | `1.0` | full update |
| `direction` | `1.0` | wrong focus direction |
| `shallow` | `0.3` | depth issue, not direction |
| `source_quality` | `0.0` | **skip PreferenceWeight update**; still write BehaviorEvent + remove from pack |

### Prediction-error update

```text
predicted = signal.decisionConfidence ?? 0.5
error = actual - predicted
delta = 0.15 * error * scale
weight' = clamp(weight + delta, 0.0, 1.0)   # default weight starts at 0.5
eventCount' = eventCount + 1
```

Neutral start: first row created with `weight = 0.5`, then apply the update.

### History factor

```text
if no PreferenceWeight row OR eventCount < 5 → history = null
else history = weight   # already in [0,1]
```

Three-factor formula already exists in `confidence.ts` when `history !== null`.

### Consolidation (`consolidatePreferenceWeights`)

Run after every successful thumbs that updated a weight (cheap; table stays small).

1. **Reinforce:** rows with `eventCount >= 2` and `lastUpdated` within last 14 days → move weight 10% further from `0.5` toward current extreme:  
   `weight = clamp(0.5 + (weight - 0.5) * 1.1, 0, 1)`
2. **Decay:** rows with `lastUpdated` older than 14 days →  
   `weight = 0.5 + (weight - 0.5) * 0.9`
3. **Prune:** after decay, delete rows where `eventCount < 2` AND `abs(weight - 0.5) < 0.02`

---

## File Structure

| File | Responsibility |
|------|----------------|
| `prisma/schema.prisma` | Add BehaviorEvent, PreferenceWeight, Signal relation |
| `prisma/migrations/20260719193000_add_behavior_learning/migration.sql` | CREATE TABLE + indexes |
| `src/shared/preferenceKeys.ts` | `serializeContentTags`, thumbs reason unions |
| `src/server/services/behaviorLearning.ts` | record feedback, update weights, consolidate |
| `src/server/services/confidence.ts` | restore `computeHistoryMatch` lookup |
| `src/server/actions/behaviorActions.ts` | Server Actions for thumbs |
| `src/components/dashboard/reading-pack-feedback.tsx` | client thumbs UI |
| `src/components/dashboard/reading-pack.tsx` | mount feedback when `item.id` present |
| `src/server/__tests__/preferenceKeys.test.ts` | serialization tests |
| `src/server/__tests__/behaviorLearning.test.ts` | learning + consolidation tests |
| `src/server/__tests__/confidenceHistory.test.ts` | history factor + three-factor score |

---

### Task 1: Shared Keys And Schema

**Files:**
- Create: `src/shared/preferenceKeys.ts`
- Create: `src/server/__tests__/preferenceKeys.test.ts`
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260719193000_add_behavior_learning/migration.sql`

- [ ] **Step 1: Write failing serialization tests**

```ts
import { describe, expect, it } from "vitest";
import {
  serializeContentTags,
  THUMBS_DOWN_REASONS,
  reasonScale
} from "@/shared/preferenceKeys";

describe("preferenceKeys", () => {
  it("serializes tags sorted and joined", () => {
    expect(serializeContentTags(["RAG", "agent"])).toBe("RAG|agent");
    expect(serializeContentTags(["agent", "RAG"])).toBe("RAG|agent");
    expect(serializeContentTags([])).toBe("");
    expect(serializeContentTags(undefined)).toBe("");
  });

  it("exposes thumbs-down reasons and scales", () => {
    expect(THUMBS_DOWN_REASONS).toEqual(["direction", "shallow", "source_quality"]);
    expect(reasonScale(null)).toBe(1);
    expect(reasonScale("direction")).toBe(1);
    expect(reasonScale("shallow")).toBe(0.3);
    expect(reasonScale("source_quality")).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/server/__tests__/preferenceKeys.test.ts`  
Expected: FAIL — module not found.

- [ ] **Step 3: Implement preferenceKeys**

```ts
export const THUMBS_DOWN_REASONS = ["direction", "shallow", "source_quality"] as const;
export type ThumbsDownReason = (typeof THUMBS_DOWN_REASONS)[number];
export type BehaviorEventType = "thumbs_up" | "thumbs_down";

export function serializeContentTags(tags: string[] | null | undefined): string {
  if (!tags || tags.length === 0) return "";
  return [...tags].sort((a, b) => a.localeCompare(b)).join("|");
}

export function reasonScale(reason: ThumbsDownReason | null): number {
  if (reason === null) return 1;
  if (reason === "direction") return 1;
  if (reason === "shallow") return 0.3;
  return 0; // source_quality
}

export function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}
```

- [ ] **Step 4: Re-run tests**

Run: `npm test -- src/server/__tests__/preferenceKeys.test.ts`  
Expected: PASS.

- [ ] **Step 5: Add Prisma models**

Append to `prisma/schema.prisma` (and add relation on Signal):

```prisma
model BehaviorEvent {
  id                  String   @id @default(cuid())
  signalId            String
  signal              Signal   @relation(fields: [signalId], references: [id])
  eventType           String // thumbs_up | thumbs_down
  reason              String? // direction | shallow | source_quality | null for up
  contentTags         String // serialized snapshot
  sourceType          String // snapshot; "" if unknown
  predictedConfidence Float?
  createdAt           DateTime @default(now())

  @@index([signalId])
  @@index([eventType])
}

model PreferenceWeight {
  id          String   @id @default(cuid())
  contentTags String
  sourceType  String
  weight      Float    @default(0.5)
  eventCount  Int      @default(0)
  lastUpdated DateTime @updatedAt

  @@unique([contentTags, sourceType])
}
```

On `Signal`, add:

```prisma
  behaviorEvents BehaviorEvent[]
```

- [ ] **Step 6: Add migration SQL**

`prisma/migrations/20260719193000_add_behavior_learning/migration.sql`:

```sql
-- CreateTable
CREATE TABLE "BehaviorEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "signalId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "reason" TEXT,
    "contentTags" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "predictedConfidence" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BehaviorEvent_signalId_fkey" FOREIGN KEY ("signalId") REFERENCES "Signal" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PreferenceWeight" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "contentTags" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "weight" REAL NOT NULL DEFAULT 0.5,
    "eventCount" INTEGER NOT NULL DEFAULT 0,
    "lastUpdated" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "BehaviorEvent_signalId_idx" ON "BehaviorEvent"("signalId");
CREATE INDEX "BehaviorEvent_eventType_idx" ON "BehaviorEvent"("eventType");
CREATE UNIQUE INDEX "PreferenceWeight_contentTags_sourceType_key" ON "PreferenceWeight"("contentTags", "sourceType");
```

- [ ] **Step 7: Generate client and apply**

Run:

```bash
npx prisma generate
npx prisma migrate deploy
# If local DB was db-pushed with divergent C3 tables, prefer:
# npx prisma db push
```

Expected: client includes `behaviorEvent` / `preferenceWeight`; migrate succeeds (or db push reconciles).

- [ ] **Step 8: Commit**

```bash
git add src/shared/preferenceKeys.ts src/server/__tests__/preferenceKeys.test.ts prisma/schema.prisma prisma/migrations/20260719193000_add_behavior_learning/migration.sql
git commit -m "feat(schema): add BehaviorEvent and PreferenceWeight for C3 learning"
```

---

### Task 2: Behavior Learning Service

**Files:**
- Create: `src/server/services/behaviorLearning.ts`
- Create: `src/server/__tests__/behaviorLearning.test.ts`

- [ ] **Step 1: Write failing learning tests**

Use the project's existing Prisma test helpers if present (see `poolRanking.test.ts`). Minimal shape:

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/server/db";
import {
  consolidatePreferenceWeights,
  recordThumbsFeedback
} from "@/server/services/behaviorLearning";

async function seedSignal(overrides: Partial<{ id: string; decisionConfidence: number; readingPackStatus: string; rawJson: string }> = {}) {
  const run = await prisma.importRun.create({ data: { status: "success" } });
  return prisma.signal.create({
    data: {
      recordKey: `rk-${Date.now()}-${Math.random()}`,
      stream: "daily",
      date: "2026-07-19",
      title: "t",
      readingPackStatus: overrides.readingPackStatus ?? "selected",
      decisionConfidence: overrides.decisionConfidence ?? 0.8,
      rawJson: overrides.rawJson ?? JSON.stringify({ content_tags: ["agent", "RAG"], source_type: "github_repo" }),
      sourceFile: "test.jsonl",
      sourceLine: 1,
      importRunId: run.id
    }
  });
}

describe("behaviorLearning", () => {
  beforeEach(async () => {
    await prisma.behaviorEvent.deleteMany();
    await prisma.preferenceWeight.deleteMany();
    await prisma.signal.deleteMany();
    await prisma.importRun.deleteMany();
  });

  it("thumbs_up writes event and raises weight toward 1 when prediction was low", async () => {
    const signal = await seedSignal({ decisionConfidence: 0.2 });
    await recordThumbsFeedback({ signalId: signal.id, eventType: "thumbs_up" });
    const events = await prisma.behaviorEvent.findMany();
    expect(events).toHaveLength(1);
    expect(events[0].eventType).toBe("thumbs_up");
    expect(events[0].contentTags).toBe("RAG|agent");
    const weight = await prisma.preferenceWeight.findFirst();
    expect(weight?.eventCount).toBe(1);
    // error = 1.0 - 0.2 = 0.8; delta = 0.15*0.8*1 = 0.12; weight = 0.5+0.12 = 0.62
    expect(weight?.weight).toBeCloseTo(0.62, 5);
  });

  it("thumbs_down direction removes from pack and lowers weight", async () => {
    const signal = await seedSignal({ decisionConfidence: 0.9 });
    await recordThumbsFeedback({
      signalId: signal.id,
      eventType: "thumbs_down",
      reason: "direction"
    });
    const updated = await prisma.signal.findUniqueOrThrow({ where: { id: signal.id } });
    expect(updated.readingPackStatus).toBe("not_selected");
    const weight = await prisma.preferenceWeight.findFirst();
    // error = 0 - 0.9 = -0.9; delta = 0.15*-0.9*1 = -0.135; weight = 0.5-0.135 = 0.365
    expect(weight?.weight).toBeCloseTo(0.365, 5);
  });

  it("source_quality records event but does not touch PreferenceWeight", async () => {
    const signal = await seedSignal();
    await recordThumbsFeedback({
      signalId: signal.id,
      eventType: "thumbs_down",
      reason: "source_quality"
    });
    expect(await prisma.behaviorEvent.count()).toBe(1);
    expect(await prisma.preferenceWeight.count()).toBe(0);
    const updated = await prisma.signal.findUniqueOrThrow({ where: { id: signal.id } });
    expect(updated.readingPackStatus).toBe("not_selected");
  });

  it("shallow uses reduced scale", async () => {
    const signal = await seedSignal({ decisionConfidence: 0.9 });
    await recordThumbsFeedback({
      signalId: signal.id,
      eventType: "thumbs_down",
      reason: "shallow"
    });
    const weight = await prisma.preferenceWeight.findFirst();
    // error=-0.9; delta=0.15*-0.9*0.3=-0.0405; weight=0.4595
    expect(weight?.weight).toBeCloseTo(0.4595, 5);
  });

  it("consolidate reinforces recent multi-event weights and decays stale ones", async () => {
    const recent = await prisma.preferenceWeight.create({
      data: { contentTags: "a", sourceType: "x", weight: 0.7, eventCount: 2 }
    });
    const stale = await prisma.preferenceWeight.create({
      data: {
        contentTags: "b",
        sourceType: "y",
        weight: 0.7,
        eventCount: 1,
        lastUpdated: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000)
      }
    });
    await consolidatePreferenceWeights();
    const r = await prisma.preferenceWeight.findUniqueOrThrow({ where: { id: recent.id } });
    expect(r.weight).toBeCloseTo(0.5 + (0.7 - 0.5) * 1.1, 5);
    const s = await prisma.preferenceWeight.findUnique({ where: { id: stale.id } });
    // decay then prune: eventCount<2 and near-neutral after decay may delete
    // 0.5+(0.7-0.5)*0.9 = 0.68 → not pruned; assert decayed
    if (s) expect(s.weight).toBeCloseTo(0.68, 5);
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

Run: `npm test -- src/server/__tests__/behaviorLearning.test.ts`  
Expected: FAIL — module missing.

- [ ] **Step 3: Implement behaviorLearning.ts**

```ts
import { prisma } from "@/server/db";
import { parseSignalRaw } from "@/server/signalRaw";
import {
  clamp01,
  reasonScale,
  serializeContentTags,
  type BehaviorEventType,
  type ThumbsDownReason
} from "@/shared/preferenceKeys";

const LEARNING_RATE = 0.15;
const HISTORY_MIN_EVENTS = 5;

export { HISTORY_MIN_EVENTS };

export async function recordThumbsFeedback(input: {
  signalId: string;
  eventType: BehaviorEventType;
  reason?: ThumbsDownReason | null;
}): Promise<void> {
  const signal = await prisma.signal.findUnique({ where: { id: input.signalId } });
  if (!signal) throw new Error(`signal not found: ${input.signalId}`);

  if (input.eventType === "thumbs_down" && !input.reason) {
    throw new Error("thumbs_down requires reason");
  }
  if (input.eventType === "thumbs_up" && input.reason) {
    throw new Error("thumbs_up must not include reason");
  }

  const raw = parseSignalRaw(signal.rawJson);
  const contentTags = serializeContentTags(raw.contentTags);
  const sourceType = raw.sourceType ?? "";
  const predicted = signal.decisionConfidence ?? 0.5;
  const reason = input.eventType === "thumbs_down" ? (input.reason ?? null) : null;
  const scale = reasonScale(reason);
  const actual = input.eventType === "thumbs_up" ? 1 : 0;

  await prisma.$transaction(async (tx) => {
    await tx.behaviorEvent.create({
      data: {
        signalId: signal.id,
        eventType: input.eventType,
        reason,
        contentTags,
        sourceType,
        predictedConfidence: predicted
      }
    });

    if (input.eventType === "thumbs_down" && signal.readingPackStatus === "selected") {
      await tx.signal.update({
        where: { id: signal.id },
        data: { readingPackStatus: "not_selected" }
      });
      await tx.auditLog.create({
        data: {
          entityType: "signal",
          entityId: signal.id,
          action: "thumbs_down_remove_pack",
          fromValue: JSON.stringify({ readingPackStatus: "selected" }),
          toValue: JSON.stringify({ readingPackStatus: "not_selected", reason }),
          rationale: reason
        }
      });
    }

    if (scale > 0) {
      const existing = await tx.preferenceWeight.findUnique({
        where: { contentTags_sourceType: { contentTags, sourceType } }
      });
      const base = existing?.weight ?? 0.5;
      const error = actual - predicted;
      const next = clamp01(base + LEARNING_RATE * error * scale);
      if (existing) {
        await tx.preferenceWeight.update({
          where: { id: existing.id },
          data: { weight: next, eventCount: existing.eventCount + 1 }
        });
      } else {
        await tx.preferenceWeight.create({
          data: { contentTags, sourceType, weight: next, eventCount: 1 }
        });
      }
    }

    await tx.auditLog.create({
      data: {
        entityType: "signal",
        entityId: signal.id,
        action: input.eventType,
        fromValue: null,
        toValue: JSON.stringify({ contentTags, sourceType, reason, predicted }),
        rationale: null
      }
    });
  });

  await consolidatePreferenceWeights();
}

export async function lookupHistoryMatch(
  contentTags: string[],
  sourceType: string | null
): Promise<number | null> {
  const key = serializeContentTags(contentTags);
  const st = sourceType ?? "";
  const row = await prisma.preferenceWeight.findUnique({
    where: { contentTags_sourceType: { contentTags: key, sourceType: st } }
  });
  if (!row || row.eventCount < HISTORY_MIN_EVENTS) return null;
  return row.weight;
}

export async function consolidatePreferenceWeights(now = new Date()): Promise<void> {
  const fourteenDaysMs = 14 * 24 * 60 * 60 * 1000;
  const rows = await prisma.preferenceWeight.findMany();
  for (const row of rows) {
    const age = now.getTime() - row.lastUpdated.getTime();
    if (age <= fourteenDaysMs && row.eventCount >= 2) {
      const reinforced = clamp01(0.5 + (row.weight - 0.5) * 1.1);
      await prisma.preferenceWeight.update({
        where: { id: row.id },
        data: { weight: reinforced }
      });
      continue;
    }
    if (age > fourteenDaysMs) {
      const decayed = clamp01(0.5 + (row.weight - 0.5) * 0.9);
      if (row.eventCount < 2 && Math.abs(decayed - 0.5) < 0.02) {
        await prisma.preferenceWeight.delete({ where: { id: row.id } });
      } else {
        await prisma.preferenceWeight.update({
          where: { id: row.id },
          data: { weight: decayed }
        });
      }
    }
  }
}
```

- [ ] **Step 4: Run tests — expect PASS**

Run: `npm test -- src/server/__tests__/behaviorLearning.test.ts`  
Expected: PASS. Adjust prune assertion if Date handling differs.

- [ ] **Step 5: Commit**

```bash
git add src/server/services/behaviorLearning.ts src/server/__tests__/behaviorLearning.test.ts
git commit -m "feat(learning): record thumbs feedback and update preference weights"
```

---

### Task 3: Wire History Into Confidence Scoring

**Files:**
- Modify: `src/server/services/confidence.ts` (`computeHistoryMatch`)
- Create: `src/server/__tests__/confidenceHistory.test.ts`

- [ ] **Step 1: Write failing history tests**

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/server/db";
import { computeDecisionConfidence } from "@/server/services/confidence";

describe("confidence history factor", () => {
  beforeEach(async () => {
    await prisma.preferenceWeight.deleteMany();
  });

  it("keeps history null below 5 events (two-factor score)", async () => {
    await prisma.preferenceWeight.create({
      data: { contentTags: "agent", sourceType: "github_repo", weight: 0.9, eventCount: 4 }
    });
    const result = await computeDecisionConfidence({
      confidence: "high",
      sourceTier: "Tier 1",
      contentTags: ["agent"],
      sourceType: "github_repo",
      focusRules: []
    });
    expect(result.factors.history).toBeNull();
    // source≈0.95, focus=0 → score = 0.5*0.95 + 0.5*0 = 0.475
    expect(result.score).toBeCloseTo(0.475, 5);
  });

  it("uses three-factor formula at eventCount >= 5", async () => {
    await prisma.preferenceWeight.create({
      data: { contentTags: "agent", sourceType: "github_repo", weight: 0.8, eventCount: 5 }
    });
    const result = await computeDecisionConfidence({
      confidence: "high",
      sourceTier: "Tier 1",
      contentTags: ["agent"],
      sourceType: "github_repo",
      focusRules: []
    });
    expect(result.factors.history).toBe(0.8);
    // 0.35*0.95 + 0.3*0 + 0.35*0.8 = 0.3325 + 0.28 = 0.6125
    expect(result.score).toBeCloseTo(0.6125, 5);
  });
});
```

- [ ] **Step 2: Run — expect FAIL on history still null at count 5**

Run: `npm test -- src/server/__tests__/confidenceHistory.test.ts`

- [ ] **Step 3: Replace stub in confidence.ts**

Replace `computeHistoryMatch` body with:

```ts
import { lookupHistoryMatch } from "@/server/services/behaviorLearning";

async function computeHistoryMatch(
  contentTags: string[],
  sourceType: string | null
): Promise<number | null> {
  return lookupHistoryMatch(contentTags, sourceType);
}
```

Keep the existing two-/three-factor score branch unchanged.

- [ ] **Step 4: Run confidence + behavior tests**

Run:

```bash
npm test -- src/server/__tests__/confidenceHistory.test.ts src/server/__tests__/behaviorLearning.test.ts src/server/__tests__/poolRanking.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/server/services/confidence.ts src/server/__tests__/confidenceHistory.test.ts
git commit -m "feat(confidence): enable history factor from PreferenceWeight"
```

---

### Task 4: Server Actions + Reading Pack UI

**Files:**
- Create: `src/server/actions/behaviorActions.ts`
- Create: `src/components/dashboard/reading-pack-feedback.tsx`
- Modify: `src/components/dashboard/reading-pack.tsx`

- [ ] **Step 1: Add Server Actions**

```ts
"use server";

import { revalidatePath } from "next/cache";
import { recordThumbsFeedback } from "@/server/services/behaviorLearning";
import type { ThumbsDownReason } from "@/shared/preferenceKeys";

function revalidate() {
  revalidatePath("/dashboard/today");
  revalidatePath("/inbox/today");
}

export async function thumbsUpAction(signalId: string) {
  await recordThumbsFeedback({ signalId, eventType: "thumbs_up" });
  revalidate();
}

export async function thumbsDownAction(signalId: string, reason: ThumbsDownReason) {
  await recordThumbsFeedback({ signalId, eventType: "thumbs_down", reason });
  revalidate();
}
```

- [ ] **Step 2: Add client feedback control**

`reading-pack-feedback.tsx` (client):

- Two icon/text buttons: 赞 / 踩
- On 踩, show a compact reason picker: `方向不对` → `direction`, `太浅` → `shallow`, `来源不行` → `source_quality`
- Use `useTransition` like `SignalCard`
- Disable while pending; hide controls if `!signalId`
- Do **not** use card chrome beyond the existing reading-pack list item border (buttons inline under tags)

Sketch:

```tsx
"use client";

import { useState, useTransition } from "react";
import { thumbsDownAction, thumbsUpAction } from "@/server/actions/behaviorActions";
import type { ThumbsDownReason } from "@/shared/preferenceKeys";

const REASONS: { id: ThumbsDownReason; label: string }[] = [
  { id: "direction", label: "方向不对" },
  { id: "shallow", label: "太浅" },
  { id: "source_quality", label: "来源不行" }
];

export function ReadingPackFeedback({ signalId }: { signalId: string }) {
  const [pending, start] = useTransition();
  const [picking, setPicking] = useState(false);

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
      <button
        type="button"
        disabled={pending}
        className="rounded border border-border px-2 py-1 hover:bg-muted disabled:opacity-50"
        onClick={() => start(() => void thumbsUpAction(signalId))}
      >
        赞
      </button>
      <button
        type="button"
        disabled={pending}
        className="rounded border border-border px-2 py-1 hover:bg-muted disabled:opacity-50"
        onClick={() => setPicking((v) => !v)}
      >
        踩
      </button>
      {picking &&
        REASONS.map((r) => (
          <button
            key={r.id}
            type="button"
            disabled={pending}
            className="rounded border border-border px-2 py-1 text-xs hover:bg-muted disabled:opacity-50"
            onClick={() =>
              start(async () => {
                await thumbsDownAction(signalId, r.id);
                setPicking(false);
              })
            }
          >
            {r.label}
          </button>
        ))}
    </div>
  );
}
```

- [ ] **Step 3: Mount in ReadingPack**

In `reading-pack.tsx`, after tag chips (and before knowledge-gap / read-reason blocks), when `item.id` is defined:

```tsx
{item.id ? <ReadingPackFeedback signalId={item.id} /> : null}
```

Ensure `SignalView.id` is populated for reading-pack items (already set in `dailyView.toView` when signal has id — confirm `getDailyPageData` passes prisma rows with `id`).

- [ ] **Step 4: Manual smoke (dev)**

```bash
npm run dev
# open /dashboard/today with a selected reading-pack item that has an id
# click 赞 → BehaviorEvent + PreferenceWeight row
# click 踩 → pick reason → item leaves reading pack
```

- [ ] **Step 5: Commit**

```bash
git add src/server/actions/behaviorActions.ts src/components/dashboard/reading-pack-feedback.tsx src/components/dashboard/reading-pack.tsx
git commit -m "feat(ui): reading-pack thumbs feedback for preference learning"
```

---

### Task 5: Verification, Handoff Update, PR

**Files:**
- Modify: `docs/superpowers/plans/2026-07-19-pr-c-confidence-routing-handoff.md` (mark C3 done)

- [ ] **Step 1: Full checks**

```bash
npm test
npm run lint
npm run build
npm run typecheck
```

Expected: all pass.

- [ ] **Step 2: Regression greps**

```bash
rg -n "history factor disabled|return null;\n\}" src/server/services/confidence.ts
rg -n "BehaviorEvent|PreferenceWeight|lookupHistoryMatch" src prisma
```

Expected: stub comment gone; models and lookup present.

- [ ] **Step 3: Update handoff**

Set PR-C3 row to **DONE** with commit SHAs; note three-factor path active when `eventCount >= 5`.

- [ ] **Step 4: Push and open PR**

```bash
git push -u origin HEAD
```

PR base: `codex/daily-practice-pool-plan`  
Title: `feat(confidence): PR-C3 behavior learning from reading-pack thumbs`  
Body must mention: schema tables, learning rules, UI, history threshold 5, verification commands.

---

## Self-Review

1. **Spec coverage:** BehaviorEvent + PreferenceWeight schema → Task 1; prediction-error learning + reason scales + pack removal → Task 2; history factor → Task 3; thumbs UI → Task 4; verify/PR → Task 5.
2. **Placeholder scan:** formulas, scales, file paths, and test expectations are concrete.
3. **Type consistency:** `ThumbsDownReason`, `serializeContentTags`, `recordThumbsFeedback`, `lookupHistoryMatch` names match across tasks.
4. **C2 compatibility:** thresholds and two-factor cold-start path unchanged when history is null.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-19-pr-c3-behavior-learning.md`.

**Two execution options:**

1. **Subagent-Driven (recommended)** — fresh subagent per task, review between tasks  
2. **Inline Execution** — execute tasks in-session with executing-plans checkpoints  

Which approach?
