# Automation Snapshots

This folder contains copies of the current automation configurations that power
the CortexOps system.

## Files

- `ai-pm.toml`: daily AI PM radar
- `weekly-execution-review.toml`: weekly AI PM execution review and planning
- `ai-paper-radar.toml`: weekly AI / cognitive science paper radar
- `demo.toml`: weekly demo replication recommendation
- `engineering-learning.toml`: weekly engineering learning task
- `monthly-review.toml`: monthly direction review
- `ai-pm-memory.md`: deprecated historical memory notes; use
  `../state/memory/ai-pm-7d.jsonl` for current deduplication

Live daily state and candidate pools live outside this snapshot folder:

- `../state/daily/YYYY-MM-DD-links.jsonl`: structured daily link state
- `../state/daily/YYYY-MM-DD-report.md`: human-readable daily report view
- `../state/memory/ai-pm-7d.jsonl`: rolling 7-day deduplication index
- `../pools/*.jsonl`: candidate pools for weekly, monthly, demo, and learning
  automations

## Convention

All meaningful automation changes should start from
`../docs/change-protocol.md`.

Automation prompts should treat `../docs/source-policy.md` as the base execution
reference for source selection, filtering, prioritization, and manual review.
They should also reference:

- `../docs/ingestion-normalization.md` when they depend on signal fields,
  candidate pool routing, or schema-level decisions
- `../docs/focus-policy.md` when they should respond to active user attention
  rules

Daily, weekly, demo, engineering-learning, and monthly automations should treat
JSONL state and pool files as reusable source-of-truth files. Long-form reports
are reading views, not the primary interface for later automation runs.

When the source policy changes, update this folder only as a snapshot of the
current automation state. The live automations remain managed in `~/.codex/automations`.

Before considering an automation snapshot valid, run:

```sh
python3 -c 'import tomllib, pathlib; [tomllib.loads(p.read_text()) for p in pathlib.Path("automations").glob("*.toml")]; print("all toml ok")'
```

For focus-rule changes, also verify the affected automations reference
`focus-policy.md`.
