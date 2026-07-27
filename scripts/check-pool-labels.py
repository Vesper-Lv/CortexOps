#!/usr/bin/env python3
"""Validate current structured pool labels in CortexOps JSONL state."""

from __future__ import annotations

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
TARGETS = [
    *sorted((ROOT / "pools").glob("*.jsonl")),
    ROOT / "state" / "memory" / "ai-pm-7d.jsonl",
]

POOL_FIELDS = ("suggested_pool", "candidate_pool", "final_pool", "pool")
CURRENT_LABELS = {"product", "engineering", "paper", "archive", "drop"}
OLD_LABELS = {
    "product_inspiration",
    "demo_replication",
    "knowledge_gap",
    "personal_work",
    "paper_candidate",
    "paper_candidates",
}


def validate_item(item: dict, rel_path: str, line_no: int) -> list[str]:
    errors: list[str] = []
    for field in POOL_FIELDS:
        value = item.get(field)
        if value in OLD_LABELS:
            errors.append(f"{rel_path}:{line_no} {field} has old pool label {value!r}")
        elif value is not None and value not in CURRENT_LABELS:
            errors.append(f"{rel_path}:{line_no} {field} has unknown pool label {value!r}")
    return errors


def validate_file(path: Path) -> list[str]:
    errors: list[str] = []
    rel_path = str(path.relative_to(ROOT))
    for line_no, line in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
        if not line.strip():
            continue
        try:
            item = json.loads(line)
        except json.JSONDecodeError as exc:
            errors.append(f"{rel_path}:{line_no} invalid JSON: {exc}")
            continue
        if not isinstance(item, dict):
            errors.append(f"{rel_path}:{line_no} JSONL entry is not an object")
            continue
        errors.extend(validate_item(item, rel_path, line_no))
    return errors


def main() -> None:
    errors: list[str] = []
    for path in TARGETS:
        if path.exists():
            errors.extend(validate_file(path))

    if errors:
        for error in errors:
            print(error)
        raise SystemExit(1)

    print("pool labels ok")


if __name__ == "__main__":
    main()
