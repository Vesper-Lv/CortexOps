#!/usr/bin/env bash
set -euo pipefail

# Runner-agnostic daily prefetch (Codex + Cursor). Wrapper kept for compatibility.
exec "$(cd "$(dirname "$0")" && pwd)/codex-daily-prefetch.sh" "$@"
