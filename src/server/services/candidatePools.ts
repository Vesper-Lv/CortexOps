import { prisma } from "@/server/db";
import {
  POOL_DISPLAY_ORDER,
  assertValidPool,
  poolNameFromOption,
  sortPools,
  type PoolOption
} from "@/shared/poolOptions";
import type { PoolGroup } from "@/shared/inboxTypes";

export async function getCandidatePoolGroups(): Promise<PoolGroup[]> {
  const rows = await prisma.candidate.findMany({
    orderBy: [{ poolName: "asc" }, { priority: "asc" }]
  });
  const map = new Map<string, PoolGroup>();
  for (const c of rows) {
    const key = c.poolName;
    if (!map.has(key)) map.set(key, { poolName: key, items: [] });
    map.get(key)!.items.push({
      id: c.id,
      title: c.title ?? "(untitled)",
      url: c.originalUrl ?? c.sourceUrl ?? "",
      humanStatus: c.humanStatus ?? "pending",
      priority: c.priority ?? ""
    });
  }

  for (const option of POOL_DISPLAY_ORDER) {
    const poolName = poolNameFromOption(option);
    if (!map.has(poolName)) {
      map.set(poolName, { poolName, items: [] });
    }
  }

  return sortPools([...map.values()]);
}

export async function moveCandidatePool(candidateId: string, toPoolName: string): Promise<void> {
  assertValidPool(toPoolName);

  const candidate = await prisma.candidate.findUnique({ where: { id: candidateId } });
  if (!candidate) throw new Error(`candidate not found: ${candidateId}`);

  const newPoolName = poolNameFromOption(toPoolName as PoolOption);
  if (candidate.poolName === newPoolName) return;

  const before = { poolName: candidate.poolName, finalPool: candidate.finalPool };
  const after = { poolName: newPoolName, finalPool: toPoolName };

  await prisma.$transaction([
    prisma.candidate.update({
      where: { id: candidateId },
      data: {
        poolName: newPoolName,
        finalPool: toPoolName,
        humanStatus: candidate.humanStatus === "rejected" ? "rejected" : "changed"
      }
    }),
    prisma.auditLog.create({
      data: {
        entityType: "candidate",
        entityId: candidateId,
        action: "change_pool",
        fromValue: JSON.stringify(before),
        toValue: JSON.stringify(after),
        rationale: null
      }
    })
  ]);
}
