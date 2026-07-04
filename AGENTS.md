# AGENTS.md

## Cursor Cloud specific instructions

CortexOps is a single runnable service: the **CortexOps Workbench**, a Next.js 16 (App Router, Turbopack) + React 18 + Tailwind app in the repo root. It is a Phase 1 UI skeleton — pages render navigation shells and empty states; there are no API routes or data fetching yet. The `automations/`, `state/`, `pools/`, and `docs/` directories are content/config data (not runnable services).

Standard commands live in `package.json` scripts: `npm run dev` (dev server on http://localhost:3000, `/` redirects to `/today`), `npm run build`, `npm run start`, `npm run lint` (eslint), `npm run typecheck` (`tsc --noEmit`). There is no test framework or `test` script in this repo.

Non-obvious notes:
- Copy `.env.example` to `.env` (`DATABASE_URL="file:./dev.db"`). Prisma commands require it; the dev server currently runs even without it.
- Prisma (SQLite) is scaffolded but not yet used by any code in `src/`. `npm install` has no `postinstall`, so the Prisma client is not auto-generated. Run `npx prisma generate` (and `npx prisma db push` to create `dev.db`) if you touch Prisma; not required just to run/build the current UI.
- Optional: validate automation TOML snapshots with `python3 -c 'import tomllib,pathlib;[tomllib.loads(p.read_text()) for p in pathlib.Path("automations").glob("*.toml")]'`.
