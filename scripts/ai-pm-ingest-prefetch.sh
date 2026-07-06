#!/usr/bin/env bash
set -euo pipefail

# CortexOps daily ingest prefetch — run in macOS Terminal BEFORE Codex automation.
# Writes manifest + aihot raw JSON. Exits non-zero when AIhot fetch fails (strict).

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

DATE="${1:-$(TZ=Asia/Shanghai date +%Y-%m-%d)}"
MODE_FILE="state/daily/.ingest-mode"
MODE="strict"
if [[ -f "$MODE_FILE" ]]; then
  MODE="$(tr -d '[:space:]' < "$MODE_FILE")"
fi

MIN_AIHOT_ITEMS="${MIN_AIHOT_ITEMS:-1}"
MANIFEST="state/daily/${DATE}-ingest-manifest.json"
AIHOT_RAW="state/daily/${DATE}-aihot-raw.json"
ERR_JSON="state/daily/${DATE}-ingest-error.json"
ERR_MD="state/daily/${DATE}-ingest-error.md"

UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
PREFETCH_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

mkdir -p state/daily

# --- AIhot (required) ---
AIHOT_STATUS="fail"
AIHOT_HTTP="000"
AIHOT_COUNT=0
AIHOT_ERR=""

if since=$(date -u -v-24H +%Y-%m-%dT%H:%M:%SZ 2>/dev/null); then
  :
else
  since=$(date -u -d '24 hours ago' +%Y-%m-%dT%H:%M:%SZ)
fi

AIHOT_URL="https://aihot.virxact.com/api/public/items?mode=selected&since=${since}&take=50"
set +e
AIHOT_HTTP=$(curl -4 -sS -o "$AIHOT_RAW" -w "%{http_code}" \
  -H "User-Agent: $UA" "$AIHOT_URL" 2>/dev/null)
curl_exit=$?
set -e
if [[ $curl_exit -ne 0 ]]; then
  AIHOT_HTTP="000"
fi

if [[ "$AIHOT_HTTP" == "200" ]]; then
  AIHOT_COUNT=$(python3 - "$AIHOT_RAW" <<'PY'
import json, sys
from pathlib import Path
p = Path(sys.argv[1])
try:
    d = json.loads(p.read_text())
    print(len(d.get("items", [])))
except Exception:
    print(0)
PY
)
  if [[ "$AIHOT_COUNT" -ge "$MIN_AIHOT_ITEMS" ]]; then
    AIHOT_STATUS="ok"
  else
    AIHOT_ERR="items count ${AIHOT_COUNT} < min ${MIN_AIHOT_ITEMS}"
  fi
else
  AIHOT_ERR="HTTP ${AIHOT_HTTP} (curl exit ${curl_exit})"
  rm -f "$AIHOT_RAW"
fi

# --- Supplemental probes (optional; do not block ready) ---
set +e
GITHUB_HTTP=$(curl -4 -sS -o /dev/null -w "%{http_code}" \
  "https://api.github.com/zen" 2>/dev/null)
[[ $? -eq 0 ]] || GITHUB_HTTP="000"
set -e
GITHUB_STATUS="ok"
[[ "$GITHUB_HTTP" == "200" ]] || GITHUB_STATUS="warn"

set +e
ARXIV_HTTP=$(curl -4 -sS -o /dev/null -w "%{http_code}" \
  --get "https://export.arxiv.org/api/query" \
  --data-urlencode "search_query=all:electron" \
  --data-urlencode "max_results=1" 2>/dev/null)
[[ $? -eq 0 ]] || ARXIV_HTTP="000"
set -e
ARXIV_STATUS="ok"
[[ "$ARXIV_HTTP" == "200" ]] || ARXIV_STATUS="warn"

READY="true"
FAIL_REASONS=()
if [[ "$AIHOT_STATUS" != "ok" ]]; then
  READY="false"
  FAIL_REASONS+=("aihot: ${AIHOT_ERR:-unknown}")
fi

export DATE MODE PREFETCH_AT MIN_AIHOT_ITEMS AIHOT_STATUS AIHOT_HTTP AIHOT_COUNT
export GITHUB_STATUS GITHUB_HTTP ARXIV_STATUS ARXIV_HTTP READY AIHOT_ERR MANIFEST
python3 - <<'PY'
import json
import os
from pathlib import Path

ready = os.environ["READY"] == "true"
aihot_err = os.environ.get("AIHOT_ERR", "")
manifest = {
    "date": os.environ["DATE"],
    "ingest_mode": os.environ["MODE"],
    "ready": ready,
    "prefetch_at": os.environ["PREFETCH_AT"],
    "prefetch_host": "terminal",
    "min_aihot_items": int(os.environ["MIN_AIHOT_ITEMS"]),
    "sources": {
        "aihot": {
            "required": True,
            "status": os.environ["AIHOT_STATUS"],
            "http_code": int(os.environ["AIHOT_HTTP"]),
            "item_count": int(os.environ["AIHOT_COUNT"]),
            "raw_path": f"state/daily/{os.environ['DATE']}-aihot-raw.json",
            "error": aihot_err or None,
        },
        "github": {
            "required": False,
            "status": os.environ["GITHUB_STATUS"],
            "http_code": int(os.environ["GITHUB_HTTP"]),
        },
        "arxiv": {
            "required": False,
            "status": os.environ["ARXIV_STATUS"],
            "http_code": int(os.environ["ARXIV_HTTP"]),
        },
    },
}
Path(os.environ["MANIFEST"]).write_text(
    json.dumps(manifest, ensure_ascii=False, indent=2) + "\n"
)
PY

if [[ "$READY" != "true" ]]; then
  REASON_STR=$(printf '%s; ' "${FAIL_REASONS[@]}")
  export REASON_STR ERR_JSON ERR_MD
  python3 - <<'PY'
import json
import os
from pathlib import Path

reasons = [r.strip() for r in os.environ["REASON_STR"].split(";") if r.strip()]
err = {
    "date": os.environ["DATE"],
    "ingest_mode": os.environ["MODE"],
    "ready": False,
    "reasons": reasons,
    "action": "Fix network/Clash, re-run scripts/codex-daily-prefetch.sh, then retry Codex automation.",
}
Path(os.environ["ERR_JSON"]).write_text(
    json.dumps(err, ensure_ascii=False, indent=2) + "\n"
)
md = f"""# Daily ingest failed ({os.environ['DATE']})

Mode: **{os.environ['MODE']}**

## Reasons
""" + "\n".join(f"- {r}" for r in reasons) + f"""

## Next steps
1. Run prefetch in Terminal: `./scripts/codex-daily-prefetch.sh {os.environ['DATE']}`
2. Confirm `state/daily/{os.environ['DATE']}-ingest-manifest.json` has `"ready": true`
3. Re-run Codex daily automation (Run Now in Codex App)

Do **not** generate report until manifest is ready.
"""
Path(os.environ["ERR_MD"]).write_text(md)
PY
  echo "INGEST PREFETCH FAILED (${MODE}): ${REASON_STR}" >&2
  exit 1
fi

echo "INGEST PREFETCH OK: aihot_items=${AIHOT_COUNT} github=${GITHUB_HTTP}(${GITHUB_STATUS}) arxiv=${ARXIV_HTTP}(${ARXIV_STATUS})"
echo "manifest: ${MANIFEST}"
echo "raw: ${AIHOT_RAW}"
exit 0
