#!/usr/bin/env python3
"""Validate prompt files used by terminal Codex runners."""

from __future__ import annotations

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]

RUNTIME_PROMPTS = [
    "prompts/daily-ai-pm.md",
    "prompts/weekly-execution-review.md",
    "prompts/ai-paper-radar.md",
    "prompts/monthly-review.md",
]

RUNNER_FILES = [
    "scripts/codex-daily-run.sh",
    "scripts/codex-weekly-run.sh",
    "scripts/codex-automation-run.sh",
    "scripts/lib/codex-automation-common.sh",
]


def prompt_body(text: str) -> str:
    if text.startswith("---\n"):
        _, sep, body = text.partition("\n---\n")
        if not sep:
            raise AssertionError("frontmatter is not closed")
        return body
    return text


def main() -> None:
    for rel_path in RUNTIME_PROMPTS:
        path = ROOT / rel_path
        if not path.exists():
            raise AssertionError(f"missing runtime prompt: {rel_path}")
        body = prompt_body(path.read_text(encoding="utf-8"))
        if not body.strip():
            raise AssertionError(f"empty runtime prompt body: {rel_path}")

    runner_text = "\n".join(
        (ROOT / rel_path).read_text(encoding="utf-8") for rel_path in RUNNER_FILES
    )
    retired_prompt_files = [
        "prompts/paper-radar.md",
        "prompts/demo-recommendation.md",
        "prompts/demo.md",
        "prompts/engineering-learning.md",
    ]
    for rel_path in retired_prompt_files:
        if (ROOT / rel_path).exists():
            raise AssertionError(f"retired prompt still exists: {rel_path}")

    if any((ROOT / "automations").glob("*.toml")):
        raise AssertionError("legacy automation TOML snapshots should not exist")

    forbidden_runtime_refs = ["automations/", ".toml", "prompts/paper-radar.md"]
    for ref in forbidden_runtime_refs:
        if ref in runner_text:
            raise AssertionError(f"runner still references retired prompt source: {ref}")

    print("prompt specs ok")


if __name__ == "__main__":
    main()
