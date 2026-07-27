# CortexOps Candidate Pools

This directory stores candidate pools as JSONL files. Each line is one signal or
link object suggested by AI and later confirmed, changed, or rejected by the
user.

## Files

- `product-inspiration.jsonl` - product pool storage
- `demo-replication.jsonl` - engineering pool storage
- `knowledge-gap.jsonl` - engineering pool storage
- `personal-work.jsonl` - engineering pool storage
- `paper-candidates.jsonl` - paper pool storage
- `archive.jsonl` - archive pool storage

The current semantic pools in the UI are `product`, `engineering`, and
`paper`. `archive` and `drop` are terminal dispositions used after the primary
three-way review. `drop` does not have a dedicated JSONL file.

Structured pool fields use only these values:

```text
product
engineering
paper
archive
drop
```

This applies to `suggested_pool`, `candidate_pool`, `final_pool`, and `pool`.

## Status Model

AI may write a suggested pool route, but the user owns the final decision.

- `human_status: pending`: AI suggested the route; user has not reviewed it
- `human_status: confirmed`: user accepted the suggested route
- `human_status: changed`: user changed the route; use `final_pool`
- `human_status: rejected`: user rejected the item

Weekly, paper, and monthly automations should use confirmed and changed items
first, then pending items when they need fresh candidates.

## Validation

Run this after changing candidate pool routing or JSONL pool state:

```sh
python3 scripts/check-pool-labels.py
```
