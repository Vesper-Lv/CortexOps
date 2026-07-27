# CortexOps Change Protocol

This document defines how to change CortexOps without drifting into scattered
prompt patches.

Use it before changing daily radar format, weekly review format, signal fields,
candidate pools, focus rules, or automation prompts.

## 1. Why This Exists

CortexOps has several policy and automation layers:

- `docs/source-policy.md`: what the system values
- `docs/ingestion-normalization.md`: how raw inputs become signal objects
- `docs/focus-policy.md`: what the user wants emphasized now
- `state/*.jsonl`: reusable machine state for daily outputs and memory
- `pools/*.jsonl`: reusable candidate pools for weekly and monthly decisions
- `prompts/*.md`: which output each terminal runner must produce

When a change only updates one layer, the next run may not show the expected
result. Every meaningful change should therefore define the desired output first,
then map the full path that makes it appear.

## 2. Change Types

Classify the change before editing files.

### Output Contract Change

Use when the visible report should change.

Examples:

- add a new daily radar section
- add required fields to GitHub recommendations
- change the weekly execution card format
- add interview proof items to monthly review

Primary files:

- `prompts/*.md`
- sometimes `docs/source-policy.md`

### Signal Schema Change

Use when the system needs new fields to judge or route signals.

Examples:

- `practice_fit`
- `entry_barrier`
- `interview_relevance`
- `proof_artifact`

Primary file:

- `docs/ingestion-normalization.md`

### Policy / Prioritization Change

Use when the system should select, upgrade, downgrade, or route information
differently.

Examples:

- prefer GitHub projects with practical replication value
- prioritize 2B / AI PM / Vibe Coding interview proof
- downgrade high-star but low-practice-fit repos

Primary files:

- `docs/source-policy.md`
- `docs/focus-policy.md`

### Automation Binding Change

Use when an automation must read a policy or emit fields from a schema.

Examples:

- daily radar must read `focus-policy.md`
- paper radar must emit interview proof candidates
- monthly review must consume prior demo and proof artifacts

Primary files:

- `prompts/*.md`
- `automations/README.md`

### State Contract Change

Use when an output should become reusable by later automations or a future UI.

Examples:

- daily radar should write link state before generating Markdown
- candidate-pool suggestions should be persisted for weekly review
- manual changes should override AI suggested routing

Primary files:

- `docs/ingestion-normalization.md`
- `state/README.md`
- `pools/README.md`
- `prompts/*.md`

## 3. Change Request Template

Before editing, write the change in this shape.

```md
## Change Intent

What result should be different after the next run?

## Target Output Contract

Which report should change, and what must visibly appear?

- report:
- new / changed sections:
- required fields:
- examples of acceptable output:

## User Scenario

Which user goal does this serve?

- job search / interview
- 2B AI PM judgment
- Vibe Coding proof
- product work
- engineering work
- paper reading
- portfolio artifact
- monthly direction decision

## Required Signal Fields

Which fields must exist before the report can output the desired result?

## Policy Changes

Which rules should affect source selection, priority, routing, upgrade,
downgrade, or drop decisions?

## Automation Binding

Which automations must read the policy or emit the new fields?

- `daily-ai-pm.md`:
- `weekly-execution-review.md`:
- `ai-paper-radar.md`:
- `monthly-review.md`:

## Acceptance Checks

How will we prove the change is connected end to end?

- Prompt specs validate successfully.
- Every affected automation references the needed policy file.
- The output contract names the new section or fields explicitly.
- The signal schema defines any new fields.
- The policy explains how those fields affect priority or routing.
- Downstream weekly or monthly outputs consume the new fields when needed.
```

## 4. Default Edit Order

Use this order unless the change is clearly tiny.

1. Define the target output contract.
2. Add or update signal fields in `docs/ingestion-normalization.md`.
3. Add or update system-level rules in `docs/source-policy.md`.
4. Add or update user focus rules in `docs/focus-policy.md`.
5. Update affected automation prompts in `prompts/*.md`.
6. Update `automations/README.md` if the convention changes.
7. Run verification checks.

This order keeps visible output, data fields, policy rules, and automation
bindings aligned.

## 5. Linkage Matrix

Use this matrix before calling a change complete.

```text
Desired output:
Required field(s):
Defined in ingestion-normalization.md? yes / no / not needed
Prioritized in source-policy.md? yes / no / not needed
Boosted in focus-policy.md? yes / no / not needed
Emitted by daily radar? yes / no / not needed
Consumed by weekly review? yes / no / not needed
Consumed by paper radar? yes / no / not needed
Consumed by monthly review? yes / no / not needed
Verification command or evidence:
Collaboration ledger updated (when `docs/collaboration/` is present)? yes / no / not needed
```

When the change is meaningful and local collaboration memory exists, update
`docs/collaboration/` history plus area `entry_files` / `impact_files` (see
`docs/collaboration/index.md`), then run
`python3 scripts/check-collaboration-navigation.py`.

## 6. Verification Commands

Run these after automation edits:

```sh
python3 scripts/check-prompts.py
rg -n "focus-policy.md" prompts/*.md
```

Run this after candidate pool routing or JSONL pool-state edits:

```sh
python3 scripts/check-pool-labels.py
```

Run targeted searches for new fields or sections:

```sh
rg -n "field_name|section_title" docs prompts
```

When the change depends on downstream consumption, search the downstream
automation too. A field appearing only in a policy file is not enough.

## 7. Anti-Patterns

Avoid these:

- adding a focus rule without checking which automations read it
- adding a field to an automation output without defining it in the signal schema
- changing a daily section without checking weekly or monthly consumption
- treating a user preference as a one-time memory note when it should be a
  policy rule
- treating a policy rule as implemented before verifying prompt bindings
- using the next failed run as the first real test

## 8. Small Change Shortcut

For tiny wording changes, use a shorter checklist:

```text
What visible output changes?
Which file owns that output?
Does any downstream automation depend on it?
Do prompt specs validate?
```

If the answer touches more than one automation or policy file, use the full
protocol.
