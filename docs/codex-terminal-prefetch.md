# Codex daily workflow (Terminal prefetch + Codex exec report)

Use this when Codex should read prefetched files and generate the daily report
through the terminal runner.

## Quick start

```bash
cd /Users/jiexinlv/Documents/CortexOps
git pull origin codex/source-layering-policy   # or your feature branch

# 1) Terminal: prefetch AIhot + write manifest (uses system DNS / Clash)
./scripts/codex-daily-prefetch.sh

# 2) Run Codex from the prompt file
./scripts/codex-daily-run.sh

# Codex reads prompts/daily-ai-pm.md and state/daily/active/YYYY-MM-DD-aihot-raw.json.
# Do NOT curl AIhot inside Codex.
```

Shanghai date:

```bash
DATE=$(TZ=Asia/Shanghai date +%Y-%m-%d)
./scripts/codex-daily-prefetch.sh "$DATE"
```

## What Terminal writes

| File | Purpose |
|------|---------|
| `state/daily/active/YYYY-MM-DD-aihot-raw.json` | Raw AIhot API response (**required**) |
| `state/daily/active/YYYY-MM-DD-arxiv-raw.xml` | arXiv Atom export (**supplemental**, ok or skipped; 3 retries + timeouts by default) |
| `state/daily/active/YYYY-MM-DD-github-raw.json` | GitHub Search normalized JSON (**supplemental**) |
| `state/daily/active/YYYY-MM-DD-ingest-manifest.json` | `ready: true` gate + per-source status |
| `state/daily/.ingest-mode` | `strict` (default) |

Optional GitHub token: `~/.cortexops/github-prefetch.env` (see `scripts/github-prefetch.env.example`).

Supplemental mapping: `docs/supplemental-prefetch-api.md`.

If prefetch fails, see `state/daily/active/YYYY-MM-DD-ingest-error.md`.

## A/B test (same prefetch, two Codex models)

```bash
./scripts/codex-daily-prefetch.sh --ab

# After run A — snapshot
DATE=$(TZ=Asia/Shanghai date +%Y-%m-%d)
cp state/daily/active/${DATE}-links.jsonl state/daily/backups/2026-07-18-ab-test/${DATE}-links.a.jsonl
cp state/daily/active/${DATE}-report.md state/daily/backups/2026-07-18-ab-test/${DATE}-report.a.md

# Change model in Codex automation (e.g. gpt-5.5 vs another), Run Now again
cp state/daily/active/${DATE}-links.jsonl state/daily/backups/2026-07-18-ab-test/${DATE}-links.b.jsonl
cp state/daily/active/${DATE}-report.md state/daily/backups/2026-07-18-ab-test/${DATE}-report.b.md

python3 scripts/compare-daily-links.py \
  state/daily/backups/2026-07-18-ab-test/${DATE}-links.a.jsonl \
  state/daily/backups/2026-07-18-ab-test/${DATE}-links.b.jsonl
```

Compare reading pack counts, pool routing, and whether `aihot_summary` was rewritten.

## Verify only (no prefetch)

```bash
python3 scripts/verify-daily-ingest.py $(TZ=Asia/Shanghai date +%Y-%m-%d)
```

## Codex DNS note

Codex sandbox may show `scutil --dns` → No DNS configuration. That is expected.
**Never rely on Codex curl for AIhot, GitHub, or arXiv** in strict mode; Terminal prefetch is the source of truth.

Optional Codex config (does not fix DNS for all setups):

```toml
# ~/.codex/config.toml
sandbox_mode = "workspace-write"

[sandbox_workspace_write]
network_access = true
```

## Prompt checklist

After changing `prompts/daily-ai-pm.md`:

```bash
python3 scripts/check-prompts.py
rg -n "skipped_no_prefetch|禁止.*curl|focus-policy.md" prompts/daily-ai-pm.md
```
