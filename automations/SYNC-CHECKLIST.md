# Prompt Runtime Checklist

Run this checklist after every change to `prompts/*.md`, especially
`prompts/daily-ai-pm.md`.

## 1. Validate prompt files

From the main CortexOps worktree on `codex/source-layering-policy`:

```bash
python3 scripts/check-prompts.py
```

Expected: `prompt specs ok`.

## 2. Terminal prefetch (required for daily)

```bash
./scripts/codex-daily-prefetch.sh
```

Expected: ingest manifest is ready, with `aihot_items=N`; `arxiv_items` and
`github_items` are `ok` or `skipped`.

Optional: `~/.cortexops/github-prefetch.env` with `GITHUB_TOKEN` for higher
GitHub rate limits.

See `docs/codex-terminal-prefetch.md` and `docs/supplemental-prefetch-api.md`.

## 3. Daily prompt gate

```bash
python3 - <<'PY'
from pathlib import Path

p = Path("prompts/daily-ai-pm.md").read_text(encoding="utf-8")
assert "禁止" in p and "curl" in p
assert "skipped_no_prefetch" in p
print("daily prompt ok")
PY
rg '允许 curl' prompts/daily-ai-pm.md && exit 1 || echo "no forbidden 允许 curl phrase"
```

Expected: `daily prompt ok` and `no forbidden 允许 curl phrase`.

Daily structured output must stay compatible with the workbench
`dailyReportParser.ts`: §1 line starts with `**行业信号**：`; §4 practice items
use single-line step blocks.

## 4. Run through terminal entrypoints

```bash
SKIP_CODEX=1 ./scripts/codex-daily-run.sh
FORCE=1 ./scripts/codex-weekly-run.sh
FORCE=1 ./scripts/codex-automation-run.sh paper-radar
FORCE=1 ./scripts/codex-automation-run.sh monthly
```

`SKIP_CODEX=1` verifies daily prefetch without launching Codex. Use `FORCE=1`
only when intentionally overwriting an existing report.

## Current prompt source

Runtime scripts read `prompts/*.md` directly. Do not recreate
`automations/*.toml`; prompt changes should be made in Markdown and verified
with `python3 scripts/check-prompts.py`.
