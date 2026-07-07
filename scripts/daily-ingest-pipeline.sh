#!/usr/bin/env bash
set -euo pipefail

# Unified daily pipeline: Terminal prefetch → verify → signal → trigger runners.
#
# Usage:
#   RUNNER=cursor ./scripts/daily-ingest-pipeline.sh     # prefetch + Cursor webhook
#   RUNNER=codex  ./scripts/daily-ingest-pipeline.sh     # prefetch + codex exec
#   RUNNER=both   ./scripts/daily-ingest-pipeline.sh     # prefetch + both (A/B)
#   RUNNER=none   ./scripts/daily-ingest-pipeline.sh     # prefetch only
#
# Schedule via launchd at 09:00 and RunAtLoad (see install-daily-launchd.sh).

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

DATE="${1:-$(TZ=Asia/Shanghai date +%Y-%m-%d)}"
RUNNER="${RUNNER:-both}"

chmod +x scripts/codex-daily-prefetch.sh scripts/ai-pm-ingest-prefetch.sh

echo "== daily-ingest-pipeline: date=${DATE} runner=${RUNNER} =="

if ! ./scripts/codex-daily-prefetch.sh "$DATE"; then
  echo "FAIL: prefetch/verify" >&2
  exit 1
fi

SIGNAL="state/daily/${DATE}-ingest-ready.signal"
cat >"$SIGNAL" <<EOF
date=${DATE}
ready=true
prefetch_host=terminal
triggered_at=$(date -u +%Y-%m-%dT%H:%M:%SZ)
runner=${RUNNER}
EOF
echo "signal: ${SIGNAL}"

case "$RUNNER" in
  cursor)
    ./scripts/cursor-trigger-daily.sh "$DATE"
    ;;
  codex)
    SKIP_CODEX=0 ./scripts/codex-daily-run.sh "$DATE"
    ;;
  both)
    ./scripts/cursor-trigger-daily.sh "$DATE" || echo "WARN: Cursor webhook failed (see above)"
    SKIP_CODEX=0 ./scripts/codex-daily-run.sh "$DATE" || echo "WARN: codex exec failed (see log)"
    ;;
  none)
    echo "Prefetch only. Trigger manually:"
    echo "  RUNNER=cursor ./scripts/daily-ingest-pipeline.sh ${DATE}"
    echo "  RUNNER=codex  ./scripts/daily-ingest-pipeline.sh ${DATE}"
    ;;
  *)
    echo "Unknown RUNNER=${RUNNER} (cursor|codex|both|none)" >&2
    exit 2
    ;;
esac

echo "== pipeline done =="
