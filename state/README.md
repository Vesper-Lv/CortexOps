# CortexOps State Files

This directory stores machine-readable daily state for CortexOps automations.

## Daily Files

Daily radar runs should create:

- `daily/YYYY-MM-DD-links.jsonl`: one JSON object per collected link
- `daily/YYYY-MM-DD-report.md`: the human-readable daily report

The JSONL file is the source of truth for link state. The Markdown report is a
reading view generated from that state.

Optionally, daily radar runs may also write `daily/YYYY-MM-DD-aihot-raw.json`
with the raw AIhot Public API response for provenance auditing. This file is
not read by downstream automations; it exists so operators can verify that
`aihot_summary` values were copied verbatim from the API.

## Memory Files

- `memory/ai-pm-7d.jsonl`: rolling 7-day deduplication index for the daily AI PM
  radar

Only selected reading-pack items, main GitHub recommendations, formal daily
practice items, and confirmed or pending candidate-pool entries should enter
the 7-day memory file.

## Weekly Files

Weekly execution review runs should create:

- `weekly/YYYY-MM-DD-report.md`: human-readable weekly execution report

`YYYY-MM-DD` is the **Sunday date** for that week (the scheduled run day).
Weekly reports are scheduling views over daily JSONL state, 7-day memory, and
candidate pools. They do not need a JSONL companion unless a future automation
needs structured weekly selection state.

Terminal scheduling: `scripts/codex-weekly-run.sh` + `scripts/install-weekly-launchd.sh`
(Sunday 20:30 Asia/Shanghai, with login catch-up via `RunAtLoad`).

Sub-reports (Monday, same week Sunday date):

- `weekly/paper/YYYY-MM-DD-paper-radar.md` — `codex-automation-run.sh paper-radar`
- `weekly/demo/YYYY-MM-DD-demo-recommendation.md` — `codex-automation-run.sh demo`
- `weekly/engineering/YYYY-MM-DD-engineering-learning.md` — `codex-automation-run.sh engineering`

Install Monday + monthly launchd: `scripts/install-automation-launchd.sh`.

## Monthly Files

- `monthly/YYYY-MM-DD-monthly-review.md` — first day of month; `codex-automation-run.sh monthly`

## Rule

Automations should read state files before reading long-form reports. Reports
are useful context, but JSONL state is the stable interface for deduplication,
candidate-pool routing, and weekly or monthly review.
