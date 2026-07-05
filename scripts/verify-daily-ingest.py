#!/usr/bin/env python3
"""Verify daily ingest manifest + aihot raw before report generation."""

from __future__ import annotations

import json
import sys
from pathlib import Path


def main() -> int:
    date = sys.argv[1] if len(sys.argv) > 1 else None
    root = Path(__file__).resolve().parents[1]
    daily = root / "state" / "daily"
    if date is None:
        import os

        date = os.environ.get("CORTEXOPS_DATE")
        if not date:
            print("usage: verify-daily-ingest.py YYYY-MM-DD", file=sys.stderr)
            return 2

    mode = (
        (daily / ".ingest-mode").read_text().strip()
        if (daily / ".ingest-mode").exists()
        else "strict"
    )
    manifest_path = daily / f"{date}-ingest-manifest.json"
    raw_path = daily / f"{date}-aihot-raw.json"

    if not manifest_path.exists():
        print(f"FAIL: missing manifest {manifest_path}", file=sys.stderr)
        return 1

    manifest = json.loads(manifest_path.read_text())
    if manifest.get("ingest_mode") != mode:
        print(
            f"WARN: manifest mode {manifest.get('ingest_mode')} != .ingest-mode {mode}",
            file=sys.stderr,
        )

    if not manifest.get("ready"):
        print(f"FAIL: manifest ready=false for {date}", file=sys.stderr)
        return 1

    aihot = manifest.get("sources", {}).get("aihot", {})
    if aihot.get("status") != "ok":
        print(f"FAIL: aihot status={aihot.get('status')}", file=sys.stderr)
        return 1

    if not raw_path.exists():
        print(f"FAIL: missing raw {raw_path}", file=sys.stderr)
        return 1

    raw = json.loads(raw_path.read_text())
    items = raw.get("items", [])
    min_items = int(manifest.get("min_aihot_items", 1))
    if len(items) < min_items:
        print(f"FAIL: aihot items {len(items)} < min {min_items}", file=sys.stderr)
        return 1

    for src in ("github", "arxiv"):
        s = manifest.get("sources", {}).get(src, {})
        if s.get("status") != "ok":
            print(f"FAIL: {src} status={s.get('status')}", file=sys.stderr)
            return 1

    print(f"OK: ingest ready for {date} (aihot={len(items)} items, mode={mode})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
