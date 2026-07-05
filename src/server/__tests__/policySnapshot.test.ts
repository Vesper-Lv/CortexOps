import { readFile } from "node:fs/promises";
import { afterEach, describe, expect, it } from "vitest";
import { computePolicySnapshot, hashContent } from "@/server/services/policySnapshot";
import { getOrCreatePolicySnapshot } from "@/server/services/policySnapshotStore";
import { prisma } from "@/server/db";

describe("computePolicySnapshot", () => {
  it("returns stable snapshotKey for unchanged policy files", async () => {
    const deps = { readFile: (p: string) => readFile(p, "utf8") };
    const first = await computePolicySnapshot(deps);
    const second = await computePolicySnapshot(deps);
    expect(first.snapshotKey).toBe(second.snapshotKey);
    expect(first.sourcePaths).toEqual([
      "docs/source-policy.md",
      "docs/ingestion-normalization.md",
      "docs/focus-policy.md"
    ]);
  });

  it("changes snapshotKey when focus policy content changes", async () => {
    const original = await readFile("docs/focus-policy.md", "utf8");
    const baseline = await computePolicySnapshot({ readFile: (p) => readFile(p, "utf8") });
    const mutated = await computePolicySnapshot({
      readFile: async (p) => (p === "docs/focus-policy.md" ? `${original}\n` : readFile(p, "utf8"))
    });
    expect(mutated.snapshotKey).not.toBe(baseline.snapshotKey);
    expect(mutated.focusPolicyHash).not.toBe(baseline.focusPolicyHash);
  });
});

describe("getOrCreatePolicySnapshot", () => {
  const createdIds: string[] = [];

  afterEach(async () => {
    for (const id of createdIds.splice(0)) {
      await prisma.importRun.updateMany({ where: { policySnapshotId: id }, data: { policySnapshotId: null } });
      await prisma.automationRun.updateMany({ where: { policySnapshotId: id }, data: { policySnapshotId: null } });
      await prisma.policySnapshot.deleteMany({ where: { id } });
    }
  });

  it("reuses the same row for identical policy content", async () => {
    const deps = { readFile: (p: string) => readFile(p, "utf8") };
    const first = await getOrCreatePolicySnapshot(deps);
    createdIds.push(first.id);
    const second = await getOrCreatePolicySnapshot(deps);
    expect(second.id).toBe(first.id);
  });
});

describe("hashContent", () => {
  it("hashes utf8 content deterministically", () => {
    expect(hashContent("hello")).toHaveLength(64);
    expect(hashContent("hello")).toBe(hashContent("hello"));
  });
});
