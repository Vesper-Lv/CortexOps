# PR-C Confidence Routing — Handoff Status

> Updated 2026-07-19 after user approval of C3 schema + reading-pack thumbs UI.
> Local Mac path referenced earlier (`~/CortexOps-web-workbench/...`) was not pushed;
> this file is the repo source of truth going forward.

**Working branch for C1–C2:** `codex/daily-practice-pool-plan`  
**C3 plan doc:** `docs/superpowers/plans/2026-07-19-pr-c3-behavior-learning.md`  
**Base for C3 implementation:** `codex/daily-practice-pool-plan` (contains C1+C2; not yet merged to `codex/web-workbench`)

---

## Progress Snapshot

| Slice | Intent | Git status | Notes |
|-------|--------|------------|-------|
| **PR-C1** | Signal schema: `decisionConfidence`, `confidenceFactors`, `sourceTier` + `humanStatus` index; poolRanking reads confidence | **DONE** — `2b4d125` | Migration `20260719190000_add_confidence_routing_fields` |
| **PR-C2** | Two-factor scoring (source × focus); import-time `routeSignalsByConfidence`; inbox only shows intercept (`dc < 0.4`); `auto_confirmed` | **DONE** — `14d5482` | `computeHistoryMatch` intentionally returns `null` until C3 |
| **PR-C3** | Behavior learning: BehaviorEvent + PreferenceWeight + consolidation; reading-pack thumbs; history factor | **NOT STARTED in git** | Schema/UI **approved by user 2026-07-19**; implementation plan written; no app code yet |

### Explicitly not done yet (C3)

- No `BehaviorEvent` / `PreferenceWeight` models in committed `prisma/schema.prisma`
- No thumbs UI on `ReadingPack`
- No preference update / consolidation services
- `computeHistoryMatch` still stubbed

> If a local Mac `dev.db` already has C3 tables from an exploratory `db push`, treat that as **local drift**. Reconcile by applying the C3 migration from the plan (or reset those tables) so schema matches git.

---

## Locked Product Decisions (C3)

Approved by user (schema approval card + UI confirmation):

1. **BehaviorEvent** freezes `contentTags`, `sourceType`, `predictedConfidence` at feedback time.
2. **PreferenceWeight** unique on `(contentTags, sourceType)`; prediction-error learning.
3. **`eventCount >= 5`** required before history participates in scoring (else history stays `null`, two-factor formula).
4. **Reading-pack UI:** thumbsUp / thumbsDown per item.
5. **thumbsDown reasons:** `direction` | `shallow` | `source_quality` (different learning impact).
6. **thumbsDown** also removes item from reading pack (`readingPackStatus → not_selected`).
7. **thumbsUp** records positive feedback only; does not remove from pack.
8. **memoryConsolidation:** reinforce patterns with ≥2 events in 14 days; decay/prune inactive.

---

## C1/C2 Runtime Contract (do not regress)

```text
score = 0.5 * source + 0.5 * focus          # when history === null (current / cold start)
score = 0.35 * source + 0.3 * focus + 0.35 * history  # when history available (C3)

route:
  score >= 0.75 → auto / auto_confirmed / reading_pack selected
  score >= 0.4  → revocable / auto_confirmed / reading_pack selected
  score <  0.4  → intercept / pending / reading_pack not_selected
```

Import hook: `src/app/api/import/route.ts` calls `routeSignalsByConfidence(importRunId)` after import.

---

## Next Action

1. Execute `2026-07-19-pr-c3-behavior-learning.md` task-by-task on a branch off `codex/daily-practice-pool-plan`.
2. After C3 lands and verifies, open/merge PR into `codex/daily-practice-pool-plan` (or forward-merge stack into `codex/web-workbench` per release order).
3. Keep this handoff updated at each C3 task commit.

---

## Out of Scope for C3

- Changing AUTO/REVOCABLE thresholds
- Kernel/Codex automation prompt changes for confidence labels (already in JSONL)
- Merging daily-practice-pool-plan → web-workbench (separate release step)
- Obsidian / workbench UX-next batch items
