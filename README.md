# CortexOps

CortexOps is the source-of-truth project for the AI PM information operating
system.

## Contents

- `docs/source-policy.md`: base execution policy for all automations
- `docs/ingestion-normalization.md`: rules for turning raw inputs into signal objects
- `docs/focus-policy.md`: user-controlled attention layer for future automation runs
- `docs/change-protocol.md`: change workflow for output contracts, schema, policy, automation bindings, and verification
- `docs/workbench-design.md`: product and UI design for the CortexOps workbench
- `automations/`: snapshot copies of current automation configurations
- `state/`: machine-readable daily state, weekly execution report records, and
  7-day memory
- `pools/`: machine-readable candidate pools used by weekly and monthly reviews

## Purpose

This project exists to keep the automation system maintainable.
Instead of burying rules inside long prompts only, CortexOps keeps the core
source and evaluation logic in one place.

## Current automation set

- Daily AI PM radar
- Weekly AI × cognitive science paper radar
- Weekly demo replication recommendation
- Weekly engineering learning task
- Monthly direction review

## Usage model

1. Start with `docs/change-protocol.md` for any meaningful change to report format, signal fields, policy rules, or automation behavior.
2. Define the target output contract before editing prompts.
3. Update `docs/ingestion-normalization.md` when changing signal schema, routing, or parsing rules.
4. Update `docs/source-policy.md` when changing system-wide value, priority, upgrade, or downgrade rules.
5. Update `docs/focus-policy.md` when changing the user's active attention preferences.
6. Then update the relevant automation prompt if prompt-level behavior must change.
7. Keep daily state in `state/` and candidate pools in `pools/` when a report
   needs to be reused by later automations.
8. Verify automation linkage and TOML parsing before considering the change complete.
9. Keep copies of automation configs in `automations/` for review and auditing.
10. Use weekly and monthly outputs to guide action, not just to summarize.
