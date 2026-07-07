#!/usr/bin/env bash
set -euo pipefail

# Trigger Cursor daily Automation AFTER Terminal prefetch succeeded.
#
# Prerequisite: Cursor Automation uses **Webhook** trigger (not cron-only).
# Save automation in cursor.com/automations → copy Webhook URL + auth header.
#
# Usage:
#   export CURSOR_AUTOMATION_WEBHOOK_URL="https://api2.cursor.sh/automations/webhook/..."
#   export CURSOR_AUTOMATION_WEBHOOK_TOKEN="crsr_..."   # Bearer token without "Bearer "
#   ./scripts/cursor-trigger-daily.sh
#   ./scripts/cursor-trigger-daily.sh 2026-07-07
#
# Optional: store secrets in ~/.cortexops/cursor-webhook.env (not committed):
#   CURSOR_AUTOMATION_WEBHOOK_URL=...
#   CURSOR_AUTOMATION_WEBHOOK_TOKEN=...

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

DATE="${1:-$(TZ=Asia/Shanghai date +%Y-%m-%d)}"
ENV_FILE="${CURSOR_WEBHOOK_ENV:-${HOME}/.cortexops/cursor-webhook.env}"

if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  source "$ENV_FILE"
fi

WEBHOOK_URL="${CURSOR_AUTOMATION_WEBHOOK_URL:-}"
WEBHOOK_TOKEN="${CURSOR_AUTOMATION_WEBHOOK_TOKEN:-}"

if [[ -z "$WEBHOOK_URL" || -z "$WEBHOOK_TOKEN" ]]; then
  echo "FAIL: set CURSOR_AUTOMATION_WEBHOOK_URL and CURSOR_AUTOMATION_WEBHOOK_TOKEN" >&2
  echo "  or create ${ENV_FILE}" >&2
  exit 1
fi

if ! python3 scripts/verify-daily-ingest.py "$DATE" >/dev/null; then
  echo "FAIL: ingest not ready for ${DATE} — run ./scripts/codex-daily-prefetch.sh first" >&2
  exit 1
fi

MANIFEST="state/daily/${DATE}-ingest-manifest.json"
RAW="state/daily/${DATE}-aihot-raw.json"
ITEMS=$(python3 - "$MANIFEST" <<'PY'
import json, sys
print(json.load(open(sys.argv[1]))["sources"]["aihot"]["item_count"])
PY
)

PAYLOAD=$(python3 - "$DATE" "$MANIFEST" "$RAW" "$ITEMS" <<'PY'
import json, sys
date, manifest, raw, items = sys.argv[1:5]
print(json.dumps({
    "event": "daily_ingest_ready",
    "date": date,
    "ingest_ready": True,
    "prefetch_host": "terminal",
    "manifest_path": manifest,
    "raw_path": raw,
    "aihot_items": int(items),
    "instruction": (
        f"Daily ingest prefetch completed for {date}. "
        "Run Phase 0 verify-daily-ingest.py, then map raw only — do NOT curl AIhot."
    ),
}))
PY
)

echo "Triggering Cursor Automation webhook for ${DATE} (aihot_items=${ITEMS})..."
HTTP=$(curl -4 -sS -o /tmp/cursor-webhook-response.txt -w "%{http_code}" \
  -X POST "$WEBHOOK_URL" \
  -H "Authorization: Bearer ${WEBHOOK_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD")

if [[ "$HTTP" =~ ^2 ]]; then
  echo "OK: Cursor webhook accepted (HTTP ${HTTP})"
  cat /tmp/cursor-webhook-response.txt
  echo ""
  exit 0
fi

echo "FAIL: Cursor webhook HTTP ${HTTP}" >&2
cat /tmp/cursor-webhook-response.txt >&2
echo "" >&2
echo "If 401: regenerate auth header in cursor.com/automations (known intermittent issue)." >&2
exit 1
