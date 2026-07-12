# Daily Report Reading-Pack v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adjust AI PM daily report prompts and policy docs so the 30-minute reading pack supports human re-triage (priority/pool rationale), defers knowledge_gap cards until human confirmation, clarifies news freshness dates, and omits 7-day duplicate links from §3.

**Architecture:** Prompt-only change on `codex/source-layering-policy` kernel files (`automations/ai-pm.toml`, `prompts/daily-ai-pm.md`, `docs/source-policy.md`, `docs/ingestion-normalization.md`). No prefetch script changes. JSONL gains `priority_rationale`, `pool_rationale`, optional `knowledge_gap_card`; report §2/§3 rendering rules change in prompt. Branch bases on `cursor/launchd-codex-bin-314f` (includes PR #31 launchd/prefetch fixes) and merges to `codex/source-layering-policy`.

**Tech Stack:** TOML automation prompt, Markdown policy docs, Codex CLI `codex-daily-run.sh` (reads `automations/ai-pm.toml`).

---

## Branch strategy

| Branch | Role |
|--------|------|
| `codex/source-layering-policy` | **PR base / merge target** — policy + prompt kernel |
| `cursor/launchd-codex-bin-314f` | **Implementation base** — includes PR #31 (launchd codex path, GitHub prefetch bash fix) |
| `cursor/daily-report-reading-pack-314f` | **This PR** — reading-pack format only |

Do **not** commit `state/daily/*`, `pools/*`, or `state/memory/*` from local Mac runs.

---

## Requirement mapping

### R1 — Reading pack: priority + pool rationale

- JSONL: require `priority_rationale` and `pool_rationale` for `reading_pack_status=selected`.
- Report §2: show both lines after summary for every reading-pack item (including `knowledge_gap`).

### R2 — knowledge_gap cards deferred

- **Daily report §2:** remove `known_facts` / `open_questions` blocks for all items.
- **JSONL:** leave `known_facts` / `open_questions` empty on daily run; do not fabricate.
- **After human confirms** `human_status=confirmed` + `final_pool=knowledge_gap`: generate `knowledge_gap_card` (classification reason, gap filled, extra research beyond link) — documented for Workbench/manual; not in daily automation output.

### R3 — News date / “今天” ambiguity (recommended approach)

**Recommendation (implemented):**

1. Map `published_at` on ingest (AIhot `publishedAt`; arXiv atom date; GitHub `pushed_at` fallback).
2. Report §2/§3 first line includes `新闻日期：YYYY-MM-DD` or `新闻日期：未披露`.
3. **Do not rewrite** verbatim `display_summary` / `aihot_summary` in JSONL.
4. Codex-generated lines (`priority_rationale`, `pool_rationale`, `read_reason`, five-part narrative) **must not** use 「今天/今日/昨天」; use 「该报道/此文/消息源日期」.
5. If summary verbatim contains 「今天」 and `published_at` is known, add one neutral note: 「摘要中的相对日期请参考新闻日期」— do not edit the quoted summary text.

### R4 — Omit 7-day duplicates from §3

- If `duplicate_status` is `duplicate_7d` or `duplicate_suppressed`: keep in `*-links.jsonl`, **omit from report §3**.
- `material_update` / `carry_over` may still appear in §3 with single `novelty_reason` line.
- §1 status adds `excluded_remaining_7d_dup=N`.

---

## Files to modify

| File | Change |
|------|--------|
| `automations/ai-pm.toml` | Prompt: §2/§3, JSONL fields, Phase 1 `published_at`, quality gates |
| `prompts/daily-ai-pm.md` | Mirror prompt body (keep frontmatter) |
| `docs/source-policy.md` | Rules 17–21, §3 exclusion, date disclosure |
| `docs/ingestion-normalization.md` | Schema fields, report view rules, knowledge_gap_card |

---

### Task 1: Update policy docs

**Files:**
- Modify: `docs/source-policy.md`
- Modify: `docs/ingestion-normalization.md`

- [ ] **Step 1:** Add `priority_rationale`, `pool_rationale`, `knowledge_gap_card`, `published_at` report disclosure rules.
- [ ] **Step 2:** Replace knowledge_gap daily known_facts/open_questions policy with deferred card policy.
- [ ] **Step 3:** Add §3 exclusion for `duplicate_7d` / `duplicate_suppressed`.
- [ ] **Step 4:** Commit `docs: daily reading-pack v2 policy`

---

### Task 2: Update automation prompt

**Files:**
- Modify: `automations/ai-pm.toml`
- Modify: `prompts/daily-ai-pm.md`

- [ ] **Step 1:** AIhot mapping adds `published_at ← publishedAt`.
- [ ] **Step 2:** JSONL required fields list adds `priority_rationale`, `pool_rationale`; reading-pack selected must populate both.
- [ ] **Step 3:** Rewrite §2 template (rationale lines; no knowledge_gap facts/questions).
- [ ] **Step 4:** Rewrite §3 rule (skip 7d duplicates).
- [ ] **Step 5:** Add date + temporal language quality gates.
- [ ] **Step 6:** Commit `feat(prompt): daily reading-pack v2 for human triage`

---

### Task 3: Verify and PR

- [ ] **Step 1:** `python3 -c 'import tomllib; tomllib.loads(open("automations/ai-pm.toml").read()); print("ok")'`
- [ ] **Step 2:** `grep -E 'priority_rationale|pool_rationale|excluded_remaining|新闻日期|knowledge_gap_card' automations/ai-pm.toml`
- [ ] **Step 3:** Push `cursor/daily-report-reading-pack-314f`, open PR → base `codex/source-layering-policy`
- [ ] **Step 4:** Mac: `git pull` + `FORCE=1 ./scripts/codex-daily-run.sh` smoke test

---

## Self-review (spec coverage)

| Requirement | Task |
|-------------|------|
| R1 priority/pool rationale | Task 2 §2 + JSONL fields |
| R2 knowledge_gap card deferred | Task 1 + Task 2 |
| R3 news dates | Task 1 + Task 2 (recommended approach) |
| R4 §3 duplicate omission | Task 1 + Task 2 |

---

## Post-merge (user Mac)

```bash
cd ~/CortexOps
git pull origin codex/source-layering-policy
# optional: cp automations/ai-pm.toml ~/.codex/automations/
FORCE=1 CODEX_BIN="$HOME/.local/bin/codex" ./scripts/codex-daily-run.sh
```

**Workbench / weekly doc sync:** deferred per user — merge to `codex/web-workbench` in a follow-up.
