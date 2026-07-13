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

## Prompt templates (`prompts/`)

Workbench keeps a versioned copy of each automation prompt under `../prompts/`.
TOML files in this folder remain snapshots for Codex; `prompts/` is the workbench
canonical copy for registry sync.

Workflow when changing a prompt:

1. Edit the matching file in `../prompts/<slug>.md`
2. Run `npm run prompts:sync` to upsert `PromptTemplate` rows (hash + metadata)
3. Optionally update the TOML snapshot here for Codex parity

CLI helpers:

- `npm run prompts:sync` — extract missing prompt files from TOML and sync DB registry
- `npm run automation:register -- --id ai-pm --outputs state/daily/YYYY-MM-DD-links.jsonl` — manually record an external Codex run
- `npm run import` — attaches a `PolicySnapshot` to each import and heuristically registers `AutomationRun` rows

View read-only status at **Settings → Automations** in the workbench.

## Daily AI PM — AIhot collection contract

The daily `ai-pm` automation must follow this order (also in `docs/source-policy.md`
and `prompts/daily-ai-pm.md`):

1. **Primary:** `mode=selected` + `since=last_run_finished_at` (rolling 24h).
2. **If selected < 12:** expand with new `canonical_key` only — AIhot daily/48h
   supplement, then GitHub/Anthropic/OpenAI/arXiv, then narrow carry-over
   (max 3–5; no bulk yesterday remaining).
3. **If still < 25:** note in the report that fresh signals were thin; do not pad
   to 30 with duplicates.

After prompt changes, run `npm run prompts:sync` and update the live Codex copy in
`~/.codex/automations` when ready.

## Weekly AI PM — Terminal launch (Codex CLI)

The weekly execution review (`weekly-execution-review.toml`) is scheduled for
**Sunday 20:30 Asia/Shanghai** via launchd, mirroring the daily pipeline:

1. `scripts/codex-weekly-run.sh` — reads pools + daily JSONL + memory, runs
   `codex exec`, writes `state/weekly/YYYY-MM-DD-report.md`
2. `scripts/install-weekly-launchd.sh` — installs `com.cortexops.weekly-ai-pm`
   with `RunAtLoad` catch-up if Sunday 20:30 was missed

Disable the Codex App built-in cron for the same automation to avoid double runs.
Prompt source: `prompts/weekly-execution-review.md` (synced to TOML snapshot).

## Monday weekly + monthly automations — Terminal launch

| Automation | Script key | Output path | Schedule |
|---|---|---|---|
| Paper radar | `paper-radar` | `state/weekly/paper/YYYY-MM-DD-paper-radar.md` | Mon 09:00 |
| Demo recommendation | `demo` | `state/weekly/demo/YYYY-MM-DD-demo-recommendation.md` | Mon 10:30 |
| Engineering learning | `engineering` | `state/weekly/engineering/YYYY-MM-DD-engineering-learning.md` | Mon 11:30 |
| Monthly review | `monthly` | `state/monthly/YYYY-MM-01-monthly-review.md` | 1st 09:30 |

```bash
./scripts/codex-automation-run.sh paper-radar
./scripts/install-automation-launchd.sh
```

Prompt sources: `prompts/paper-radar.md`, `demo-recommendation.md`, `engineering-learning.md`, `monthly-review.md`.

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
