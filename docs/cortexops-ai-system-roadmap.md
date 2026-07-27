# CortexOps AI 信息系统 Roadmap

## Summary

CortexOps will use a local-first Web App path instead of starting with a
native app. The current `docs/`, `automations/`, `state/`, and `pools/`
directories remain the automation and policy kernel. A separate Git worktree
will be used to build a Next.js + SQLite workbench that reads JSONL state,
supports human review, manages candidate pools, converts signals into tasks,
and helps turn work into artifacts.

The first stage does not replace Codex automations. Codex continues to generate
daily, weekly, and monthly reports. The Web App turns those file outputs into
an actionable information system. Later stages can add a Prompt Registry, an
in-app AI runner, job queues, and cloud deployment.

## Product Direction

Recommended product shape:

- Stage 1: local Web App.
- Stage 2: PWA with a desktop shortcut and more app-like experience.
- Stage 3: Tauri desktop app only if native capabilities become necessary.

Why Web App first:

- UI and backend debugging are fastest.
- Next.js gives a practical full-stack path.
- Local files, SQLite, and JSONL import are easy to validate.
- The same app can later be deployed to the cloud or wrapped as desktop.
- The current core risk is workflow usability, not native app capability.

## Architecture

### Frontend

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui
- TanStack Table
- TanStack Query can be added later when API state becomes complex.

Core pages:

- `Today`: daily report, 30-minute reading pack, remaining links, daily
  practice, and candidate-pool confirmation.
- `Reports`: daily radar, weekly execution review, paper radar, and monthly
  review.
- `Review Inbox`: confirm, reroute, reject, watch, or convert signals to tasks.
- `Candidate Pools`: product, engineering, paper, archive, and drop.
- `Tasks`: unified task board.
- `Artifacts`: demos, memos, README files, diagrams, and portfolio material.
- `Focus Rules`: view, edit, pause, extend, and archive attention rules.
- `Automations`: automation configs, run state, and referenced policy files.
- `Settings`: paths, import/export, policy files, and prompt configuration.

### Backend

MVP uses Next.js Route Handlers and Server Actions. It does not start with a
separate backend service.

Business logic lives under:

```text
src/server/
  services/
  importers/
  exporters/
  ai/
```

Rules:

- UI pages do not read or write JSONL directly.
- API routes should stay thin and delegate business logic to services.
- Service modules own state transitions.
- Importers/exporters own file-to-database synchronization.
- The AI runner is deferred so the first version stays light.

### Database And Queue

MVP:

- SQLite
- Prisma
- A `Job` table as a lightweight queue stand-in

Future:

- PostgreSQL
- Redis
- BullMQ, Inngest, or Trigger.dev
- Independent worker process

Core data objects:

```text
Report
Signal
Candidate
Task
Artifact
FocusRule
AutomationRun
Job
AuditLog
PolicySnapshot
PromptTemplate
```

## AI And Prompt Management

### Phase 1

- Terminal Codex runners remain the AI runner.
- Prompts stay in `prompts/*.md`.
- Policies stay in `docs/*.md`.
- The app reads automation outputs and does not call AI directly.

### Phase 2

- Keep daily, weekly, paper, and monthly prompts as versionable templates.
- Record prompt version, policy snapshot, input files, and output files.

### Phase 3

- Add a formal AI runner.
- Use Job/Worker execution for daily, weekly, and monthly runs.
- Store model, prompt version, policy version, inputs, outputs, status, errors,
  and token/cost metadata for each run.

## Git Worktree Strategy

Keep the current automation system as a baseline, then build the Web App in a
separate worktree.

Recommended branches:

```text
codex/source-layering-policy
codex/web-workbench
```

Recommended directories:

```text
/Users/jiexinlv/Documents/CortexOps
/Users/jiexinlv/Documents/CortexOps.worktrees/web-workbench
```

Recommended flow:

```bash
cd /Users/jiexinlv/Documents/CortexOps
git add .gitignore README.md docs automations state pools
git commit -m "chore: baseline cortexops automation system"
mkdir -p /Users/jiexinlv/Documents/CortexOps.worktrees
git worktree add /Users/jiexinlv/Documents/CortexOps.worktrees/web-workbench -b codex/web-workbench
```

Original directory purpose:

- Keep the automation and policy baseline.
- Continue managing `docs/`, `automations/`, `state/`, and `pools/`.
- Provide a stable rollback point.

New worktree purpose:

- Build the Web App.
- Add `src/`, `prisma/`, `package.json`, UI, API, database, and importers.
- Keep app scaffolding separate from the automation baseline.

## Proposed File Structure

```text
CortexOps/
  docs/
    source-policy.md
    ingestion-normalization.md
    focus-policy.md
    change-protocol.md
    workbench-design.md
    cortexops-ai-system-roadmap.md

  automations/
  state/
    daily/
    memory/
  pools/

  prompts/
    daily-ai-pm.md
    weekly-execution-review.md
    ai-paper-radar.md
    monthly-review.md

  prisma/
    schema.prisma

  src/
    app/
      today/
      reports/
      review/
      pools/
      tasks/
      artifacts/
      automations/
      focus-rules/
      settings/
      api/

    components/
      layout/
      reports/
      signals/
      pools/
      tasks/
      focus-rules/

    server/
      db.ts
      services/
        reports.ts
        signals.ts
        candidates.ts
        tasks.ts
        artifacts.ts
        focusRules.ts
        automationRuns.ts
      importers/
        jsonlImporter.ts
      exporters/
        jsonlExporter.ts
      ai/
        promptRegistry.ts
        runLogger.ts

    shared/
      schemas/
      constants/
      types/
```

## Phased Roadmap

### Phase 0: Baseline And Isolation

Goal: freeze the current automation system before app scaffolding starts.

Deliverables:

- Baseline commit for the current repository.
- New `codex/web-workbench` worktree.
- This Roadmap document.

Acceptance criteria:

- Current automation files are recoverable from Git.
- Web App work happens in an isolated worktree.
- Current prompt specs validate with `scripts/check-prompts.py`.

### Phase 1: Web App Skeleton

Goal: create a runnable local Web App shell.

Deliverables:

- Next.js + TypeScript project.
- Tailwind + shadcn/ui.
- Base layout and navigation.
- Empty states for Today, Reports, Review, Pools, Tasks, Focus Rules, and
  Settings.

Acceptance criteria:

- Local browser can open the app.
- Navigation works between pages.
- Empty states are clear before data is connected.

### Phase 2: Data Model And Import Layer

Goal: make the app read the current CortexOps file-system state.

Deliverables:

- Prisma schema.
- SQLite database.
- Zod schemas.
- JSONL importer.
- Import run records.

Priority imports:

```text
state/daily/active/YYYY-MM-DD-links.jsonl
state/memory/ai-pm-7d.jsonl
pools/*.jsonl
```

Acceptance criteria:

- Empty JSONL files do not fail import.
- Bad JSONL lines do not abort the full import.
- Each imported record keeps source file and line number.
- Raw JSON is stored so future schema changes remain recoverable.

### Phase 3: Review Inbox

Goal: build the human review loop.

Deliverables:

- Review Inbox page.
- Signal detail drawer.
- Confirm, Change Pool, Reject, and Watch actions.
- AuditLog.

Core rules:

- `suggested_pool` is the AI suggestion.
- `human_status` is the human review state.
- `final_pool` is the downstream pool.
- When `human_status = changed`, downstream logic must use `final_pool`.

Acceptance criteria:

- Pending signals can be confirmed.
- Pending signals can be moved into another pool.
- Rejected signals do not enter downstream recommendations.
- All human actions are traceable.

### Phase 4: Candidate Pools And Tasks

Goal: turn signals into actionable work.

Deliverables:

- Candidate Pools page.
- Tasks page.
- Signal to Task.
- Signal to Artifact Candidate.
- Pool, priority, and human-status filters.

Task states:

```text
inbox
this_week
today
in_progress
waiting
done
archived
```

Artifact states:

```text
draft
polishing
portfolio_ready
published
archived
```

Acceptance criteria:

- A signal can be confirmed, routed into a pool, and converted into a task.
- Tasks keep `linked_signal_id` and `linked_report_id`.
- Artifacts can record `proof_artifact`, `interview_story_angle`, and
  portfolio potential.

### Phase 5: Today And Reports

Goal: make daily and weekly reports actionable in the UI.

Deliverables:

- Reports page.
- Today page.
- Reading pack.
- Remaining links.
- Daily practice options.
- Candidate suggestion table.

Acceptance criteria:

- The latest daily report can be opened.
- The 30-minute reading pack is visible.
- Remaining links can be reviewed.
- A formal daily practice can be selected.
- Links and practices can enter the candidate-pool confirmation flow.

### Phase 6: Focus Rules

Goal: make the attention layer manageable from the app.

Deliverables:

- Focus Rules page.
- Active, Paused, Expired, and Archived states.
- Source types, tags, candidate-pool boosts, and `applies_to` display.
- Impact preview.
- Markdown/YAML export path.

Acceptance criteria:

- Current `GitHub Practice Fit` and `Job Interview Proof` rules are visible.
- The user can pause, extend, or archive focus rules.
- Expired rules do not affect later runs.
- Saved structure can be synchronized back to `docs/focus-policy.md`.

### Phase 7: Prompt Registry And AI Runner Preparation

Goal: prepare migration from Codex automations to an in-app AI runner without
forcing that migration into the MVP.

Deliverables:

- `prompts/` directory.
- PromptTemplate table.
- PolicySnapshot table.
- AutomationRun table.
- Job table.

Acceptance criteria:

- Every automation config can map to a prompt template.
- Imports and runs can record policy version.
- A future AI runner can be added without restructuring the UI.

### Phase 8: Deployment Path

Goal: keep the local tool deployable later.

Local stage:

- Next.js dev server
- SQLite
- Local file system

Light deployment stage:

- Railway or Fly.io
- SQLite volume or Turso
- Manual JSONL import

Long-term deployment stage:

- Postgres
- Worker
- Queue
- Object storage
- Separate Web/API/Worker services

Acceptance criteria:

- Local data can be backed up.
- SQLite schema can migrate to Postgres.
- JSONL export works as a rollback path.
- Cloud deployment does not block existing Codex automations.

## Flexibility Rules

- Do not put JSONL read/write logic in UI pages.
- Do not hard-code prompt text in API routes.
- Do not make the database schema depend on one exact daily-report format.
- Preserve `raw_json` for all imported external file records.
- Write every human action to `AuditLog`.
- Write every AI run to `AutomationRun`.
- Treat policy files as read-only first; editing and export can come later.
- Keep importers, exporters, AI runner, and queue implementation replaceable.
- The MVP should optimize for a usable human review loop, not full automation.

## Recommended MVP Cut

First version:

1. Web App skeleton.
2. SQLite + Prisma.
3. JSONL importer.
4. Review Inbox.
5. Candidate Pools.
6. Tasks.
7. Read-only Reports.
8. Read-only Focus Rules.

Defer:

- Direct AI calls from the app.
- Cloud deployment.
- Full task queue.
- Multi-user system.
- Complex analytics.
- Browser extension.
- Native desktop app.
- Automatic portfolio publishing.

## Test Plan

- Prompt specs: current `prompts/*.md` validate with `scripts/check-prompts.py`.
- Import tests: empty JSONL, normal JSONL, bad lines, and missing fields are
  handled.
- Schema tests: Signal, Candidate, Task, and FocusRule fields match the current
  policy documents.
- Review tests: confirm, change, reject, and watch transitions are correct.
- Pool tests: confirmed and changed items rank before pending items.
- Task tests: signal-to-task conversion preserves source relationships.
- Audit tests: human actions create AuditLog records.
- UI smoke tests: main pages open and show empty states when no data exists.
- Migration tests: SQLite schema avoids features that obviously block future
  Postgres migration.

## Major Risks

- The repository needs a baseline commit before app scaffolding starts.
- JSONL and database state can diverge; phase 1 should treat database human
  review state as authoritative after import.
- Building the in-app AI runner too early will slow the MVP.
- Letting UI pages read and write files directly will make future migration
  difficult.
- A rigid schema will make importer maintenance painful when report formats
  evolve.

## Assumptions

- CortexOps is a personal local system in the first stage.
- Web App is preferred over native app.
- Codex automations continue to generate daily, weekly, and monthly reports.
- The app's first value is human review, candidate-pool management, task
  conversion, and artifact tracking.
- JSONL and Markdown remain the stable, auditable interface.
- Future expansion should prioritize Postgres, worker, queue, Prompt Registry,
  and an in-app AI runner.
