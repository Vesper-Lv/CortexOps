# PR-C Confidence Routing — Handoff

> **Status:** C1 ✅ · C2 ✅ · C3 design approved, implementation not started  
> **Last updated:** 2026-07-19 (Cursor Cloud agent re-sync after Codex quota exhaustion)  
> **Implementation plan:** `docs/superpowers/plans/2026-07-19-pr-c3-preference-learning.md`  
> **Base branch for C3:** `codex/daily-practice-pool-plan` (contains C1+C2)

---

## What PR-C is

Decision-confidence routing for daily signals:

1. **Score** each imported signal (source × focus × optional history)
2. **Route** by thresholds: auto-confirm / revocable / intercept
3. **Learn** from thumbs-up / thumbs-down so history becomes a real third factor

---

## Progress snapshot

| Slice | Status | Where |
|-------|--------|--------|
| **PR-C1** schema fields on `Signal` | ✅ Done | `2b4d125` on `codex/daily-practice-pool-plan` |
| **PR-C2** two-factor scoring + routing + inbox intercept | ✅ Done | `14d5482` on `codex/daily-practice-pool-plan` |
| **PR-C3** behavior learning (PreferenceWeight / BehaviorEvent) | 🟡 Design approved; **no code committed** | Plan ready; execute next |
| Handoff file in git | ❌ Was local-only on Mac; restored here | this file |

### Important corrections vs Codex mid-session notes

1. **Handoff was incomplete** — Codex hit quota during the C3 decision gate; local Mac path existed, but the file was **not** in the remote repo until this restore.
2. **`BehaviorEvent` / `PreferenceWeight` are NOT in committed schema** — exploration may have `db push`’d locally, but `prisma/schema.prisma` on the C2 tip still only has C1 fields (`decisionConfidence`, `confidenceFactors`, `sourceTier`). Treat schema work as **still to do**.
3. **`codex/web-workbench` does not contain C1/C2** — C3 must branch from `codex/daily-practice-pool-plan` (or merge that tip first).

---

## C1 delivered (committed)

- `Signal.decisionConfidence Float?`
- `Signal.confidenceFactors String?` (JSON)
- `Signal.sourceTier String?`
- `@@index([humanStatus])`
- Migration: `prisma/migrations/20260719190000_add_confidence_routing_fields/`
- `poolRanking` reads `decisionConfidence` via batch `findMany` on `canonicalKey`
- `signalRaw` parses `source_type` / `source_tier` / `confidence` / `content_tags`

---

## C2 delivered (committed)

File: `src/server/services/confidence.ts`

- **Source factor:** `confidence` label × `source_tier` → numeric map
- **Focus factor:** match `contentTags` / `sourceType` against effective focus rules
- **History factor:** intentionally `null` (stub for C3)
- **Weights:** history null → `0.5·source + 0.5·focus`; else → `0.35·source + 0.3·focus + 0.35·history`
- **Thresholds:** auto ≥ 0.75, revocable ≥ 0.4, intercept < 0.4
- **Import hook:** `routeSignalsByConfidence(importRunId)` after import
- **Inbox:** `getInboxToday` only returns intercepted pending (low confidence)
- **Statuses:** `auto_confirmed` in human-status / eligibility paths
- **UI:** remaining-links shows `decisionConfidence` badge

---

## C3 approved design (user confirmed 2026-07-19)

### Goal

Let the system learn preference from reading-pack feedback so `computeHistoryMatch` stops returning `null` and three-factor scoring activates when sample size is enough.

### Schema (approved)

**`BehaviorEvent`**

| Field | Notes |
|-------|--------|
| `id` | cuid |
| `signalId` | FK → Signal |
| `eventType` | `thumbs_up` \| `thumbs_down` |
| `reason` | null on up; on down: `direction` \| `shallow` \| `source_quality` |
| `contentTags` | frozen snapshot (JSON string of tags at feedback time) |
| `sourceType` | frozen snapshot |
| `predictedConfidence` | frozen `decisionConfidence` at feedback time |
| `createdAt` | default now |

Indexes: `signalId`, `eventType`  
Relation: `Signal.behaviorEvents BehaviorEvent[]`

**`PreferenceWeight`**

| Field | Notes |
|-------|--------|
| `id` | cuid |
| `contentTags` | canonical key string (sorted tags joined) |
| `sourceType` | string (empty string if unknown) |
| `weight` | float preference score |
| `eventCount` | int |
| `lastUpdated` | DateTime |

Unique: `@@unique([contentTags, sourceType])`

### UI (approved)

On each reading-pack item:

- **👍 thumbsUp** — record positive feedback; **do not** remove from pack
- **👎 thumbsDown** — pick reason (`direction` / `shallow` / `source_quality`); record feedback; **remove from pack** (`readingPackStatus → not_selected`)

Reason → learning effect (approved intent):

| Reason | Effect on content-tag PreferenceWeight |
|--------|------------------------------------------|
| `direction` | Full prediction-error update |
| `shallow` | Reduced-magnitude update (depth ≠ direction) |
| `source_quality` | **No** content-tag weight update |

### Learning rules (locked for C3 plan)

See implementation plan for exact formulas. Summary:

- Prediction-error driven: `error = actual − predictedConfidence`
- `actual`: thumbs_up → `1.0`; thumbs_down → `0.0`
- History participates in scoring only when matching `PreferenceWeight.eventCount >= 5`
- Consolidation job: reinforce patterns with ≥2 events in last 14 days; decay / prune inactive

---

## Out of scope for C3

- Changing C2 thresholds or source/focus maps
- Multi-user preferences / auth
- Rewriting focus-policy.md YAML from PreferenceWeight
- Automatic export of preferences to JSONL memory (can be a later slice)

---

## Next action

Execute `docs/superpowers/plans/2026-07-19-pr-c3-preference-learning.md` task-by-task on a branch off `codex/daily-practice-pool-plan`.
