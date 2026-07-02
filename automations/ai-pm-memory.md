# Deprecated Daily Radar Memory Notes

This file is kept only as a historical snapshot from the earlier automation
design. New daily AI PM radar runs should use:

- `../state/memory/ai-pm-7d.jsonl` for structured 7-day deduplication
- `../state/daily/YYYY-MM-DD-links.jsonl` for daily link state
- `../state/daily/YYYY-MM-DD-report.md` for the human-readable daily report

Do not use this file as the source of truth for future duplicate checks,
candidate-pool routing, weekly reviews, or monthly reviews.
