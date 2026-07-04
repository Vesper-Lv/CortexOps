import { prisma } from "@/server/db";
import {
  computePolicySnapshot,
  type PolicySnapshotComputed
} from "@/server/services/policySnapshot";

export async function getOrCreatePolicySnapshot(deps: {
  readFile: (path: string) => Promise<string>;
}): Promise<{ id: string; computed: PolicySnapshotComputed }> {
  const computed = await computePolicySnapshot(deps);

  const existing = await prisma.policySnapshot.findUnique({
    where: { snapshotKey: computed.snapshotKey }
  });

  if (existing) {
    return { id: existing.id, computed };
  }

  const created = await prisma.policySnapshot.create({
    data: {
      snapshotKey: computed.snapshotKey,
      sourcePolicyHash: computed.sourcePolicyHash,
      ingestionHash: computed.ingestionHash,
      focusPolicyHash: computed.focusPolicyHash,
      sourcePathsJson: JSON.stringify(computed.sourcePaths)
    }
  });

  return { id: created.id, computed };
}

export function shortHash(hash: string, length = 8): string {
  return hash.slice(0, length);
}
