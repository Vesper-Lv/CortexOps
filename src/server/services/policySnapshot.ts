import { createHash } from "node:crypto";

export const POLICY_FILES = [
  "docs/source-policy.md",
  "docs/ingestion-normalization.md",
  "docs/focus-policy.md"
] as const;

export type PolicySnapshotComputed = {
  snapshotKey: string;
  sourcePolicyHash: string;
  ingestionHash: string;
  focusPolicyHash: string;
  sourcePaths: string[];
};

export function hashContent(content: string): string {
  return createHash("sha256").update(content, "utf8").digest("hex");
}

export function computeSnapshotKey(hashes: {
  sourcePolicyHash: string;
  ingestionHash: string;
  focusPolicyHash: string;
}): string {
  return createHash("sha256")
    .update(`${hashes.sourcePolicyHash}:${hashes.ingestionHash}:${hashes.focusPolicyHash}`, "utf8")
    .digest("hex");
}

export async function computePolicySnapshot(deps: {
  readFile: (path: string) => Promise<string>;
}): Promise<PolicySnapshotComputed> {
  const contents = await Promise.all(POLICY_FILES.map((p) => deps.readFile(p)));

  const sourcePolicyHash = hashContent(contents[0]);
  const ingestionHash = hashContent(contents[1]);
  const focusPolicyHash = hashContent(contents[2]);

  return {
    snapshotKey: computeSnapshotKey({ sourcePolicyHash, ingestionHash, focusPolicyHash }),
    sourcePolicyHash,
    ingestionHash,
    focusPolicyHash,
    sourcePaths: [...POLICY_FILES]
  };
}
