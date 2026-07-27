# Prompt Runtime Notes

Current CortexOps terminal runners read prompt bodies from `../prompts/*.md`.
Prompt changes happen in those Markdown files.

Live daily state and candidate pools live outside this folder:

- `../state/daily/active/YYYY-MM-DD-links.jsonl`: structured daily link state
- `../state/daily/active/YYYY-MM-DD-report.md`: human-readable daily report view
- `../state/memory/ai-pm-7d.jsonl`: rolling 7-day deduplication index
- `../pools/product-inspiration.jsonl`: product pool storage
- `../pools/demo-replication.jsonl`, `../pools/knowledge-gap.jsonl`,
  `../pools/personal-work.jsonl`: engineering pool storage
- `../pools/paper-candidates.jsonl`: paper pool storage
- `../pools/archive.jsonl`: archive pool storage
- `drop`: terminal disposition in the UI, not a pool file

The current semantic pools in the workbench are `product`, `engineering`, and
`paper`. `archive` and `drop` are later dispositions.

## Prompt templates (`prompts/`)

`../prompts/*.md` is the canonical prompt source for terminal `codex exec`
runners. Prompt frontmatter is metadata only; runners strip it before execution.

Workflow when changing a prompt:

1. Edit the matching file in `../prompts/<slug>.md`
2. Run the relevant runner or prompt check.
3. Re-run the relevant prompt check or automation script.

CLI helpers:

- `npm run automation:register -- --id ai-pm --outputs state/daily/active/YYYY-MM-DD-links.jsonl` — manually record an external Codex run
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

After prompt changes, run the corresponding script and verify the generated
state/report files.

## Weekly AI PM — Terminal launch (Codex CLI)

The weekly execution review (`prompts/weekly-execution-review.md`) is scheduled for
**Sunday 20:30 Asia/Shanghai** via launchd, mirroring the daily pipeline:

1. `scripts/codex-weekly-run.sh` — reads pools + daily JSONL + memory, runs
   `codex exec`, writes `state/weekly/YYYY-MM-DD-report.md`
2. `scripts/install-weekly-launchd.sh` — installs `com.cortexops.weekly-ai-pm`
   with `RunAtLoad` catch-up if Sunday 20:30 was missed

Prompt source: `prompts/weekly-execution-review.md`.

## Monday weekly + monthly automations — Terminal launch

| Automation | Script key | Output path | Schedule |
|---|---|---|---|
| Paper radar | `paper-radar` | `state/weekly/paper/YYYY-MM-DD-paper-radar.md` | Mon 09:00 |
| Monthly review | `monthly` | `state/monthly/YYYY-MM-01-monthly-review.md` | 1st 09:30 |

```bash
./scripts/codex-automation-run.sh paper-radar
./scripts/install-automation-launchd.sh
```

Prompt sources: `prompts/ai-paper-radar.md` and `prompts/monthly-review.md`.

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

Daily, weekly, paper, and monthly automations should treat JSONL state and pool
files as reusable source-of-truth files. Long-form reports are reading views,
not the primary interface for later automation runs.

When the source policy changes, update `../prompts/*.md`.

Before considering prompt specs valid, run:

```sh
python3 scripts/check-prompts.py
```

For focus-rule changes, also verify the affected automations reference
`focus-policy.md`.
