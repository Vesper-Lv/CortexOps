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

# --- Supplemental env (https_proxy, GITHUB_TOKEN) — before arXiv + GitHub curl ---
PREFETCH_ENV="${GITHUB_PREFETCH_ENV:-${HOME}/.cortexops/github-prefetch.env}"
GITHUB_TOKEN=""
if [[ -f "$PREFETCH_ENV" ]]; then
  # shellcheck disable=SC1090
  source "$PREFETCH_ENV"
fi

# --- arXiv supplemental raw (optional; do not block ready) ---
ARXIV_RAW="state/daily/${DATE}-arxiv-raw.xml"
ARXIV_STATUS="skipped"
ARXIV_HTTP="000"
ARXIV_COUNT=0
ARXIV_ERR=""

set +e
ARXIV_HTTP=$(curl -4 -sS -o "$ARXIV_RAW" -w "%{http_code}" \
  --get "https://export.arxiv.org/api/query" \
  --data-urlencode "search_query=cat:cs.AI OR cat:cs.LG OR cat:cs.CL" \
  --data-urlencode "sortBy=submittedDate" \
  --data-urlencode "sortOrder=descending" \
  --data-urlencode "max_results=20" 2>/dev/null)
arxiv_curl_exit=$?
set -e
if [[ $arxiv_curl_exit -ne 0 ]]; then
  ARXIV_HTTP="000"
fi

if [[ "$ARXIV_HTTP" == "200" && -s "$ARXIV_RAW" ]]; then
  ARXIV_COUNT=$(python3 - "$ARXIV_RAW" <<'PY'
import sys
import xml.etree.ElementTree as ET
from pathlib import Path
ns = {"a": "http://www.w3.org/2005/Atom"}
try:
    root = ET.fromstring(Path(sys.argv[1]).read_text(encoding="utf-8"))
    print(len(root.findall("a:entry", ns)))
except Exception:
    print(0)
PY
)
  if [[ "$ARXIV_COUNT" -ge 1 ]]; then
    ARXIV_STATUS="ok"
  else
    ARXIV_ERR="no arxiv entries in response"
    rm -f "$ARXIV_RAW"
  fi
else
  ARXIV_ERR="HTTP ${ARXIV_HTTP} (curl exit ${arxiv_curl_exit})"
  rm -f "$ARXIV_RAW"
fi

# --- GitHub supplemental raw (optional; do not block ready) ---
GITHUB_RAW="state/daily/${DATE}-github-raw.json"
GITHUB_STATUS="skipped"
GITHUB_HTTP="000"
GITHUB_COUNT=0
GITHUB_ERR=""

export DATE GITHUB_RAW ROOT
GITHUB_URLS_FILE="/tmp/github-prefetch-urls.$$"
python3 - <<'PY' > "$GITHUB_URLS_FILE"
import os
import tomllib
from pathlib import Path
from urllib.parse import quote_plus
from datetime import datetime, timedelta, timezone

cfg = tomllib.loads((Path(os.environ["ROOT"]) / "config/github-prefetch.toml").read_text())["search"]
q = cfg["query"]
per_page = int(cfg.get("per_page", 15))
since_days = int(cfg.get("since_days", 0))

def build(query: str) -> str:
    return (
        "https://api.github.com/search/repositories?"
        f"q={quote_plus(query)}&sort=stars&order=desc&per_page={per_page}"
    )

urls = []
if since_days > 0:
    since_str = (datetime.now(timezone.utc) - timedelta(days=since_days)).strftime("%Y-%m-%d")
    urls.append(build(f"{q} pushed:>{since_str}"))
urls.append(build(q))
for u in urls:
    print(u)
PY

GITHUB_HTTP="000"
github_curl_exit=1
while IFS= read -r GITHUB_URL; do
  [[ -z "$GITHUB_URL" ]] && continue
  set +e
  # macOS /bin/bash 3.2 + set -u: expanding empty GITHUB_AUTH[@] raises "unbound variable"
  if [[ -n "${GITHUB_TOKEN:-}" ]]; then
    GITHUB_HTTP=$(curl -4 -sS -o "$GITHUB_RAW.tmp" -w "%{http_code}" \
      -H "Accept: application/vnd.github+json" \
      -H "User-Agent: CortexOps-prefetch" \
      -H "Authorization: Bearer ${GITHUB_TOKEN}" \
      "$GITHUB_URL" 2>/dev/null)
  else
    GITHUB_HTTP=$(curl -4 -sS -o "$GITHUB_RAW.tmp" -w "%{http_code}" \
      -H "Accept: application/vnd.github+json" \
      -H "User-Agent: CortexOps-prefetch" \
      "$GITHUB_URL" 2>/dev/null)
  fi
  github_curl_exit=$?
  set -e
  if [[ $github_curl_exit -ne 0 ]]; then
    GITHUB_HTTP="000"
    continue
  fi
  if [[ "$GITHUB_HTTP" != "200" || ! -s "$GITHUB_RAW.tmp" ]]; then
    continue
  fi
  export GITHUB_RAW GITHUB_URL
  GITHUB_COUNT=$(python3 - <<'PY'
import json
import os
from datetime import datetime, timezone
from pathlib import Path

src = Path(os.environ["GITHUB_RAW"] + ".tmp")
dst = Path(os.environ["GITHUB_RAW"])
data = json.loads(src.read_text(encoding="utf-8"))
items = []
for repo in data.get("items", []):
    items.append({
        "full_name": repo.get("full_name"),
        "html_url": repo.get("html_url"),
        "description": repo.get("description") or "",
        "stargazers_count": repo.get("stargazers_count", 0),
        "pushed_at": repo.get("pushed_at"),
        "topics": repo.get("topics") or [],
    })
out = {
    "fetched_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    "query": os.environ.get("GITHUB_URL", ""),
    "items": items,
}
dst.write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(len(items))
PY
)
  if [[ "${GITHUB_COUNT:-0}" -ge 1 ]]; then
    GITHUB_STATUS="ok"
    break
  fi
done < "$GITHUB_URLS_FILE"

if [[ "$GITHUB_STATUS" != "ok" ]]; then
  if [[ "$GITHUB_HTTP" == "200" ]]; then
    GITHUB_ERR="search returned 0 items"
  else
    GITHUB_ERR="HTTP ${GITHUB_HTTP} (curl exit ${github_curl_exit})"
  fi
  rm -f "$GITHUB_RAW"
fi
rm -f "$GITHUB_RAW.tmp" "$GITHUB_URLS_FILE"

READY="true"
FAIL_REASONS=()
if [[ "$AIHOT_STATUS" != "ok" ]]; then
  READY="false"
  FAIL_REASONS+=("aihot: ${AIHOT_ERR:-unknown}")
fi

export DATE MODE PREFETCH_AT MIN_AIHOT_ITEMS AIHOT_STATUS AIHOT_HTTP AIHOT_COUNT
export GITHUB_STATUS GITHUB_HTTP GITHUB_COUNT GITHUB_ERR ARXIV_STATUS ARXIV_HTTP ARXIV_COUNT ARXIV_ERR
export READY AIHOT_ERR MANIFEST
python3 - <<'PY'
import json
import os
from pathlib import Path

ready = os.environ["READY"] == "true"
aihot_err = os.environ.get("AIHOT_ERR", "")
date = os.environ["DATE"]

def supplemental(name, status, http, count, raw_suffix, fetch_mode, err):
    return {
        "required": False,
        "status": status,
        "http_code": int(http),
        "item_count": int(count),
        "raw_path": f"state/daily/{date}-{raw_suffix}" if status == "ok" else None,
        "fetch_mode": fetch_mode,
        "error": err or None,
    }

manifest = {
    "date": date,
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
            "raw_path": f"state/daily/{date}-aihot-raw.json",
            "error": aihot_err or None,
        },
        "github": supplemental(
            "github",
            os.environ["GITHUB_STATUS"],
            os.environ["GITHUB_HTTP"],
            os.environ["GITHUB_COUNT"],
            "github-raw.json",
            "search_api",
            os.environ.get("GITHUB_ERR", ""),
        ),
        "arxiv": supplemental(
            "arxiv",
            os.environ["ARXIV_STATUS"],
            os.environ["ARXIV_HTTP"],
            os.environ["ARXIV_COUNT"],
            "arxiv-raw.xml",
            "export_api",
            os.environ.get("ARXIV_ERR", ""),
        ),
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

echo "INGEST PREFETCH OK: aihot_items=${AIHOT_COUNT} github_items=${GITHUB_COUNT}(${GITHUB_STATUS}) arxiv_items=${ARXIV_COUNT}(${ARXIV_STATUS})"
echo "manifest: ${MANIFEST}"
echo "raw: ${AIHOT_RAW}"
[[ "$ARXIV_STATUS" == "ok" ]] && echo "arxiv_raw: ${ARXIV_RAW}"
[[ "$GITHUB_STATUS" == "ok" ]] && echo "github_raw: ${GITHUB_RAW}"
exit 0
