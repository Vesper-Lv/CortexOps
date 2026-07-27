# AGENTS.md

## Session start (always)

For any meaningful coding or policy task, start from tracked sources of truth
that work after a public clone:

1. Read `README.md` for repo scope and the usage model.
2. Read `docs/change-protocol.md` before changing output contracts, signal
   schema, policy rules, or automation prompts.
3. Open the relevant policy docs (`docs/source-policy.md`,
   `docs/ingestion-normalization.md`, `docs/focus-policy.md`) and the affected
   `prompts/*.md` files for the task.
4. Run `python3 scripts/check-prompts.py` after prompt or runner edits.

Do not scan the whole repo by default when tracked docs already define the
change path.

## Optional local collaboration memory

If `docs/collaboration/index.md` exists on this machine, read it **first** for
tag-routed retrieval before broad repo search:

1. Derive query tags from the task (see the index Read Order).
2. Open the matching area index under `docs/collaboration/areas/`.
3. Read `entry_files` for matching `current` slices.
4. Use `impact_files` (or the linked history File Impact Map) when you need the
   complete owned-file set for that slice.
5. Read `docs/collaboration/history/` only for revert, conflict, rationale, or
   audit cases.

When present, `docs/collaboration/` is the canonical durable ledger. Chat /
Codex memory is advisory only. After meaningful work, reconcile decisions into
a history batch and update area indexes when retrieval behavior changes.

If the collaboration folder is missing (e.g. a fresh public clone), continue
with the tracked docs above — do not fail or block on the missing folder.

## Workspace boundary

- Policy / prompts / automation / state / pools: this repo (`CortexOps`).
- Workbench UI / Prisma / importers: `/Users/jiexinlv/CortexOps-web-workbench`
  (see that repo's `AGENTS.md` and the `web-workbench` collaboration area when
  available).

## Verification

```bash
python3 scripts/check-prompts.py
# When docs/collaboration/ is present:
python3 scripts/check-collaboration-navigation.py
```
