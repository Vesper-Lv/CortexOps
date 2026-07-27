import importlib.util
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def load_script(name: str, rel_path: str):
    spec = importlib.util.spec_from_file_location(name, ROOT / rel_path)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


class PoolLabelMigrationTest(unittest.TestCase):
    def test_migrate_pool_labels_updates_only_structured_pool_fields(self):
        migrate = load_script("migrate_pool_labels", "scripts/migrate-pool-labels.py")
        item = {
            "suggested_pool": "product_inspiration",
            "final_pool": "demo_replication",
            "candidate_pool": "knowledge_gap",
            "pool": "personal_work",
            "reason": "适合进入产品灵感池等待人工判断。",
        }

        changed = migrate.migrate_item(item)

        self.assertEqual(
            changed,
            {
                "suggested_pool": ("product_inspiration", "product"),
                "final_pool": ("demo_replication", "engineering"),
                "candidate_pool": ("knowledge_gap", "engineering"),
                "pool": ("personal_work", "engineering"),
            },
        )
        self.assertEqual(item["suggested_pool"], "product")
        self.assertEqual(item["final_pool"], "engineering")
        self.assertEqual(item["candidate_pool"], "engineering")
        self.assertEqual(item["pool"], "engineering")
        self.assertEqual(item["reason"], "适合进入产品灵感池等待人工判断。")

    def test_check_pool_labels_rejects_old_structured_values(self):
        check = load_script("check_pool_labels", "scripts/check-pool-labels.py")
        bad = {
            "suggested_pool": "paper_candidates",
            "final_pool": "paper",
            "candidate_pool": "archive",
            "reason": "paper_candidates can appear in old prose",
        }

        errors = check.validate_item(bad, "sample.jsonl", 1)

        self.assertEqual(
            errors,
            ["sample.jsonl:1 suggested_pool has old pool label 'paper_candidates'"],
        )


if __name__ == "__main__":
    unittest.main()
