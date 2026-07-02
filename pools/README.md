# CortexOps Candidate Pools

This directory stores candidate pools as JSONL files. Each line is one signal or
link object suggested by AI and later confirmed, changed, or rejected by the
user.

## Files

- `product-inspiration.jsonl`
- `paper-candidates.jsonl`
- `demo-replication.jsonl`
- `knowledge-gap.jsonl`
- `personal-work.jsonl`
- `archive.jsonl`

## Status Model

AI may write a suggested pool route, but the user owns the final decision.

- `human_status: pending`: AI suggested the route; user has not reviewed it
- `human_status: confirmed`: user accepted the suggested route
- `human_status: changed`: user changed the route; use `final_pool`
- `human_status: rejected`: user rejected the item

Weekly, monthly, demo, and engineering-learning automations should use confirmed
and changed items first, then pending items when they need fresh candidates.
