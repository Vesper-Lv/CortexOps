# Automation live sync checklist

Run this checklist after every change to `automations/*.toml` (especially `ai-pm.toml`).

## 1. Export prompt from snapshot

From the main CortexOps worktree on `codex/source-layering-policy`:

```bash
cd /Users/jiexinlv/Documents/CortexOps
git show codex/source-layering-policy:automations/ai-pm.toml | \
  python3 -c "import sys,tomllib; print(tomllib.load(sys.stdin.buffer)['prompt'])"
```

Copy the full printed prompt.

## 2. AIhot API precheck

Verify the Public API responds before syncing the prompt:

```bash
UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
curl -sS -H "User-Agent: $UA" "https://aihot.virxact.com/api/public/items?mode=selected&take=1" | python3 -c "import sys,json; d=json.load(sys.stdin); print('ok', len(d.get('items',[])))"
```

Expected: `ok 1` (or similar non-zero item count). If this fails, the automation may enter AIhot API fallback mode; still complete steps 3–6.

## 3. Paste into Cursor Automation UI

1. Open Cursor → Automations → AI 日报 → Settings → Prompt.
2. Paste the exported prompt from step 1.
3. Confirm Environment:

```text
Repository: Vesper-Lv/CortexOps
Branch: codex/source-layering-policy
```

## 4. Copy ai-pm.toml to ~/.codex/automations/

```bash
cp automations/ai-pm.toml ~/.codex/automations/ai-pm.toml
```

## 5. Verify diff is empty

```bash
diff automations/ai-pm.toml ~/.codex/automations/ai-pm.toml && echo "in sync"
```

Expected: `in sync` (no diff output).

## 6. Run Test

In Cursor → Automations → AI 日报, click **Run Test** (avoid the 08:00 peak window if possible).

If Run Test fails with `resource_exhausted`, the Git and Codex Desktop sync from steps 1–5 is still valid; retry later or run the same prompt via Codex Desktop.
