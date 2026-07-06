#!/usr/bin/env python3
"""Compare two daily links.jsonl files for A/B testing (e.g. Codex model runs)."""

from __future__ import annotations

import json
import sys
from collections import Counter
from pathlib import Path


FIELDS = (
    "priority",
    "reading_pack_status",
    "suggested_pool",
    "duplicate_status",
    "aihot_summary_status",
)


def load_rows(path: Path) -> dict[str, dict]:
    rows: dict[str, dict] = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        obj = json.loads(line)
        key = obj.get("canonical_key") or obj.get("id") or obj.get("original_url")
        rows[str(key)] = obj
    return rows


def main() -> int:
    if len(sys.argv) != 3:
        print("usage: compare-daily-links.py links.a.jsonl links.b.jsonl", file=sys.stderr)
        return 2

    a_path = Path(sys.argv[1])
    b_path = Path(sys.argv[2])
    if not a_path.exists() or not b_path.exists():
        print("FAIL: input file missing", file=sys.stderr)
        return 1

    a = load_rows(a_path)
    b = load_rows(b_path)
    keys_a, keys_b = set(a), set(b)
    only_a = sorted(keys_a - keys_b)
    only_b = sorted(keys_b - keys_a)
    both = sorted(keys_a & keys_b)

    print(f"A: {a_path.name} ({len(a)} rows)")
    print(f"B: {b_path.name} ({len(b)} rows)")
    print(f"overlap: {len(both)} | only A: {len(only_a)} | only B: {len(only_b)}")
    print()

    if only_a:
        print("Only in A:")
        for k in only_a[:15]:
            print(f"  - {k}: {a[k].get('title', '')[:60]}")
        if len(only_a) > 15:
            print(f"  ... +{len(only_a) - 15} more")
        print()

    if only_b:
        print("Only in B:")
        for k in only_b[:15]:
            print(f"  - {k}: {b[k].get('title', '')[:60]}")
        if len(only_b) > 15:
            print(f"  ... +{len(only_b) - 15} more")
        print()

    diffs = []
    for k in both:
        row_a, row_b = a[k], b[k]
        field_diffs = []
        for f in FIELDS:
            if row_a.get(f) != row_b.get(f):
                field_diffs.append(f"{f}: {row_a.get(f)!r} -> {row_b.get(f)!r}")
        summary_a = (row_a.get("aihot_summary") or "")[:80]
        summary_b = (row_b.get("aihot_summary") or "")[:80]
        if summary_a != summary_b and row_a.get("aihot_id"):
            field_diffs.append("aihot_summary: CHANGED (provenance risk)")
        if field_diffs:
            diffs.append((k, row_a.get("title", ""), field_diffs))

    print(f"Field diffs on shared keys: {len(diffs)}")
    for k, title, field_diffs in diffs[:20]:
        print(f"- {k}")
        print(f"  {title[:70]}")
        for d in field_diffs:
            print(f"    {d}")
    if len(diffs) > 20:
        print(f"... +{len(diffs) - 20} more")

    pack_a = Counter(r.get("reading_pack_status") for r in a.values())
    pack_b = Counter(r.get("reading_pack_status") for r in b.values())
    print()
    print("reading_pack_status A:", dict(pack_a))
    print("reading_pack_status B:", dict(pack_b))

    violations = sum(
        1
        for k in both
        if a[k].get("aihot_id")
        and a[k].get("aihot_summary")
        and b[k].get("aihot_summary") != a[k].get("aihot_summary")
    )
    if violations:
        print(f"\nWARN: {violations} shared AIhot rows have different aihot_summary (B may have rewritten)")
        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
