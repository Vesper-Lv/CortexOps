#!/usr/bin/env python3
"""Migrate legacy structured pool labels to current semantic pool labels."""

from __future__ import annotations

import argparse
import json
from collections import Counter
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
TARGETS = [
    *sorted((ROOT / "pools").glob("*.jsonl")),
    ROOT / "state" / "memory" / "ai-pm-7d.jsonl",
]

POOL_FIELDS = ("suggested_pool", "candidate_pool", "final_pool", "pool")
POOL_LABEL_MAP = {
    "product_inspiration": "product",
    "demo_replication": "engineering",
    "knowledge_gap": "engineering",
    "personal_work": "engineering",
    "paper_candidate": "paper",
    "paper_candidates": "paper",
}


def migrate_item(item: dict) -> dict[str, tuple[str, str]]:
    changed: dict[str, tuple[str, str]] = {}
    for field in POOL_FIELDS:
        old_value = item.get(field)
        if old_value in POOL_LABEL_MAP:
            new_value = POOL_LABEL_MAP[old_value]
            item[field] = new_value
            changed[field] = (old_value, new_value)
    return changed


def migrate_file(path: Path, write: bool) -> tuple[int, Counter[str]]:
    changed_lines = 0
    changes: Counter[str] = Counter()
    output_lines: list[str] = []

    for line_no, line in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
        if not line.strip():
            output_lines.append(line)
            continue

        try:
            item = json.loads(line)
        except json.JSONDecodeError as exc:
            raise AssertionError(f"{path.relative_to(ROOT)}:{line_no} invalid JSON: {exc}") from exc

        if not isinstance(item, dict):
            raise AssertionError(f"{path.relative_to(ROOT)}:{line_no} JSONL entry is not an object")

        changed = migrate_item(item)
        if changed:
            changed_lines += 1
            for field, (old_value, new_value) in changed.items():
                changes[f"{field}:{old_value}->{new_value}"] += 1
            output_lines.append(json.dumps(item, ensure_ascii=False, separators=(",", ":")))
        else:
            output_lines.append(line)

    if write and changed_lines:
        path.write_text("\n".join(output_lines) + "\n", encoding="utf-8")

    return changed_lines, changes


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write", action="store_true", help="write migrated JSONL files")
    parser.add_argument("--dry-run", action="store_true", help="print planned changes only")
    args = parser.parse_args()

    if args.write and args.dry_run:
        raise SystemExit("choose only one of --write or --dry-run")
    if not args.write and not args.dry_run:
        args.dry_run = True

    total_lines = 0
    total_changes: Counter[str] = Counter()
    mode = "write" if args.write else "dry-run"
    print(f"pool label migration mode: {mode}")

    for path in TARGETS:
        if not path.exists():
            continue
        changed_lines, changes = migrate_file(path, write=args.write)
        total_lines += changed_lines
        total_changes.update(changes)
        if changed_lines:
            print(f"{path.relative_to(ROOT)}: {changed_lines} changed lines")
            for label, count in sorted(changes.items()):
                print(f"  {label}: {count}")

    print(f"total changed lines: {total_lines}")
    if total_changes:
        print("total field changes:")
        for label, count in sorted(total_changes.items()):
            print(f"  {label}: {count}")


if __name__ == "__main__":
    main()
