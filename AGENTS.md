# AGENTS.md

## Cursor Cloud specific instructions

CortexOps is a single runnable service: the **CortexOps Workbench**, a Next.js 16 (App Router, Turbopack) + React 18 + Tailwind + Prisma/SQLite app in the repo root. The `automations/`, `state/`, `pools/`, and `docs/` directories are content/config data (not runnable services).

Standard commands live in `package.json` scripts: `npm run dev` (dev server on http://localhost:3000, `/` redirects to `/dashboard/today`), `npm run build`, `npm run start`, `npm run lint` (eslint), `npm run typecheck` (`tsc --noEmit`), `npm test` (Vitest), `npm run import` (JSONL → SQLite importer), `npm run db:push` (sync Prisma schema to SQLite + regenerate client).

Non-obvious notes:
- Copy `.env.example` to `.env` (`DATABASE_URL="file:./dev.db"`). Prisma commands require it; the dev server currently runs even without it.
- `npm install` has no `postinstall`, so the Prisma client is not auto-generated. Run `npx prisma generate` (or `npm run db:push`) after installing or after changing `prisma/schema.prisma`.
- **`typedRoutes` is enabled** (`next.config.mjs`). Route types are generated only during `next build`/`next dev`. Running `npm run typecheck` alone right after adding/moving routes can report stale route-type errors — run `npm run build` first to regenerate `.next/types`, then typecheck.
- Tests use **Vitest** (`npm test`); `@/` path alias is resolved via `vite-tsconfig-paths` in `vitest.config.ts`. The importer's parse/map/orchestrate logic is pure and unit-tested with fakes; DB is not required to run the unit tests.
- Data import: `npm run import` (or `POST /api/import`) reads `state/daily/*-links.jsonl`, `state/memory/ai-pm-7d.jsonl`, and `pools/*.jsonl` into SQLite. It is tolerant (empty files and bad lines don't abort) and idempotent (upsert by `recordKey`); each run writes an `ImportRun` record. Discovery-stream rows land in `Signal`, pool rows in `Candidate`.
- Optional: validate automation TOML snapshots with `python3 -c 'import tomllib,pathlib;[tomllib.loads(p.read_text()) for p in pathlib.Path("automations").glob("*.toml")]'`.
