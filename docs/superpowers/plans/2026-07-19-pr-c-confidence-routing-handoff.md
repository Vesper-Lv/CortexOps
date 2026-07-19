# PR-C Confidence Routing — Handoff

> **Status:** C1 ✅ · C2 ✅ · C3 ✅  
> **Last updated:** 2026-07-19 (C3 implemented on `cursor/pr-c3-preference-learning-plan-d108`)  
> **Implementation plan:** `docs/superpowers/plans/2026-07-19-pr-c3-preference-learning.md`  
> **Base branch for merge:** `codex/daily-practice-pool-plan` → then `codex/web-workbench`

---

## What PR-C is

Decision-confidence routing for daily signals:

1. **Score** each imported signal (source × focus × optional history)
2. **Route** by thresholds: auto-confirm / revocable / intercept
3. **Learn** from thumbs-up / thumbs-down so history becomes a real third factor

---

## Progress snapshot

| Slice | Status | Commits |
|-------|--------|---------|
| **PR-C1** schema fields on `Signal` | ✅ | `2b4d125` |
| **PR-C2** two-factor scoring + routing + inbox intercept | ✅ | `14d5482` |
| **PR-C3** behavior learning | ✅ | `a41bc61` … `8220da2` (this branch) |

### Merge note

C1–C3 live on the Workbench line (`codex/daily-practice-pool-plan` / this PR). They merge into **`codex/web-workbench`**, not `codex/source-layering-policy` (backend has no Prisma).

---

## C3 delivered

### Schema

- `BehaviorEvent` — frozen feedback snapshot (`contentTags`, `sourceType`, `predictedConfidence`)
- `PreferenceWeight` — unique `(contentTags, sourceType)` preference score
- `Signal.behaviorEvents` relation
- Migration: `prisma/migrations/20260719140000_add_preference_learning/`

### Learning

- `src/shared/preferenceLearning.ts` — prediction-error math, reason scales
- `src/server/services/behaviorLearning.ts` — record events, upsert weights, consolidate
- `confidence.ts` `computeHistoryMatch` queries PreferenceWeight; history joins scoring when `eventCount >= 5`
- Consolidation runs at end of `routeSignalsByConfidence`

### UI

- Reading pack: 赞 / 踩（原因：方向不对 / 太浅 / 来源不行）
- 赞：只记反馈；踩：记反馈并移出阅读包
- `source_quality` 不更新内容标签 PreferenceWeight

### Tests

- `preferenceLearning.test.ts`, `behaviorLearning.test.ts`, `confidence.test.ts`
- Full suite: 117 passed (as of C3 land)

---

## Local setup after pull

```bash
cp -n .env.example .env
npx prisma generate
npm run db:push   # creates BehaviorEvent + PreferenceWeight
npm test
```

If a local `dev.db` had experimental half-tables from earlier exploration: drop those two tables or recreate `dev.db`, then `db:push` again. Existing Signal/Candidate data is unaffected by additive schema.
