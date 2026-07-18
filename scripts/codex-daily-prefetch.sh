#!/usr/bin/env bash
set -euo pipefail

# Entry point: Terminal prefetch + verify before Codex daily automation.
# Usage:
#   ./scripts/codex-daily-prefetch.sh [YYYY-MM-DD]
#   ./scripts/codex-daily-prefetch.sh --ab [YYYY-MM-DD]   # also prints A/B steps

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

AB_MODE=0
DATE=""

for arg in "$@"; do
  case "$arg" in
    --ab) AB_MODE=1 ;;
    *) DATE="$arg" ;;
  esac
done

if [[ -z "$DATE" ]]; then
  DATE="$(TZ=Asia/Shanghai date +%Y-%m-%d)"
fi

echo "== CortexOps daily prefetch (Terminal) =="
echo "date: ${DATE}"
echo ""

chmod +x scripts/ai-pm-ingest-prefetch.sh
./scripts/ai-pm-ingest-prefetch.sh "$DATE"

python3 scripts/verify-daily-ingest.py "$DATE"

MANIFEST="state/daily/active/${DATE}-ingest-manifest.json"
ITEMS=$(python3 - "$MANIFEST" <<'PY'
import json, sys
print(json.load(open(sys.argv[1])).get("sources", {}).get("aihot", {}).get("item_count", 0))
PY
)

echo ""
echo "== Ready for Codex =="
echo "Manifest: ${MANIFEST} (ready=true, aihot_items=${ITEMS})"
echo ""
echo "Next:"
echo "  1. cp automations/ai-pm.toml ~/.codex/automations/ai-pm.toml"
echo "  2. Codex App → 每日 AI PM 行业雷达 → Run Now"
echo "  3. Codex must NOT curl AIhot; it reads state/daily/active/${DATE}-aihot-raw.json only"
echo ""

if [[ "$AB_MODE" -eq 1 ]]; then
  echo "== A/B test (same prefetch, two Codex runs) =="
  echo "Run A (default output paths):"
  echo "  - state/daily/active/${DATE}-links.jsonl"
  echo "  - state/daily/active/${DATE}-report.md"
  echo ""
  echo "Before run B, snapshot A:"
  echo "  cp state/daily/active/${DATE}-links.jsonl state/daily/backups/2026-07-18-ab-test/${DATE}-links.a.jsonl"
  echo "  cp state/daily/active/${DATE}-report.md state/daily/backups/2026-07-18-ab-test/${DATE}-report.a.md"
  echo ""
  echo "Run B (change model in Codex automation settings if needed), then snapshot:"
  echo "  cp state/daily/active/${DATE}-links.jsonl state/daily/backups/2026-07-18-ab-test/${DATE}-links.b.jsonl"
  echo "  cp state/daily/active/${DATE}-report.md state/daily/backups/2026-07-18-ab-test/${DATE}-report.b.md"
  echo ""
  echo "Compare:"
  echo "  python3 scripts/compare-daily-links.py state/daily/backups/2026-07-18-ab-test/${DATE}-links.a.jsonl state/daily/backups/2026-07-18-ab-test/${DATE}-links.b.jsonl"
  echo ""
fi
