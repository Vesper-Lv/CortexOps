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

## Rule

Automations should read state files before reading long-form reports. Reports
are useful context, but JSONL state is the stable interface for deduplication,
candidate-pool routing, and weekly or monthly review.
