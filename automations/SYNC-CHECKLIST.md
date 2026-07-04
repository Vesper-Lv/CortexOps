# Automation live sync checklist

Run this checklist after every change to `automations/*.toml` (especially `ai-pm.toml`).

## 1. Export prompt from snapshot

From the main CortexOps worktree on `codex/source-layering-policy`:

```bash
cd /Users/jiexinlv/Documents/CortexOps
git show codex/source-layering-policy:automations/ai-pm.toml | \
  python3 -c "import sys,tomllib; print(tomllib.loads(sys.stdin.buffer.read())['prompt'])"
```

Copy the full printed prompt.

## 2. Paste into Cursor Automation UI

1. Open Cursor → Automations → AI 日报 → Settings → Prompt.
2. Paste the exported prompt from step 1.
3. Confirm Environment:

```text
Repository: Vesper-Lv/CortexOps
Branch: codex/source-layering-policy
```

## 3. Copy ai-pm.toml to ~/.codex/automations/

```bash
cp automations/ai-pm.toml ~/.codex/automations/ai-pm.toml
```

## 4. Verify diff is empty

```bash
diff automations/ai-pm.toml ~/.codex/automations/ai-pm.toml && echo "in sync"
```

Expected: `in sync` (no diff output).

## 5. Run Test

In Cursor → Automations → AI 日报, click **Run Test** (avoid the 08:00 peak window if possible).

If Run Test fails with `resource_exhausted`, the Git and Codex Desktop sync from steps 1–4 is still valid; retry later or run the same prompt via Codex Desktop.
