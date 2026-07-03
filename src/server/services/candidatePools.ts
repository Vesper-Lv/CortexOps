import { prisma } from "@/server/db";
import {
  POOL_DISPLAY_ORDER,
  assertValidPool,
  poolNameFromOption,
  sortPools,
  type PoolOption
} from "@/shared/poolOptions";
import type { PoolGroup } from "@/shared/inboxTypes";
import { computeStatusOnFinalize } from "@/shared/signalStatus";

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
      status: c.status,
      finalPool: c.finalPool,
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

  const status = computeStatusOnFinalize(toPoolName);
  const before = {
    poolName: candidate.poolName,
    finalPool: candidate.finalPool,
    status: candidate.status
  };
  const after = { poolName: newPoolName, finalPool: toPoolName, status };

  await prisma.$transaction([
    prisma.candidate.update({
      where: { id: candidateId },
      data: {
        poolName: newPoolName,
        finalPool: toPoolName,
        humanStatus: candidate.humanStatus === "rejected" ? "rejected" : "changed",
        status
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

  await syncLinkedSignalStatus(candidate.recordKey, { finalPool: toPoolName, status });
}

export async function watchCandidate(candidateId: string): Promise<void> {
  const candidate = await prisma.candidate.findUnique({ where: { id: candidateId } });
  if (!candidate) throw new Error(`candidate not found: ${candidateId}`);
  if ((candidate.humanStatus ?? "pending") === "pending") {
    throw new Error("cannot watch pending candidate");
  }
  if (candidate.status === "dropped" || candidate.finalPool === "drop") {
    throw new Error("cannot watch dropped candidate");
  }

  const before = { status: candidate.status };
  const after = { status: "watching" };

  await prisma.$transaction([
    prisma.candidate.update({
      where: { id: candidateId },
      data: { status: "watching" }
    }),
    prisma.auditLog.create({
      data: {
        entityType: "candidate",
        entityId: candidateId,
        action: "watch",
        fromValue: JSON.stringify(before),
        toValue: JSON.stringify(after),
        rationale: null
      }
    })
  ]);

  await syncLinkedSignalStatus(candidate.recordKey, { status: "watching" });
}

async function syncLinkedSignalStatus(
  candidateRecordKey: string,
  patch: { finalPool?: string; status?: string }
): Promise<void> {
  if (!candidateRecordKey.startsWith("signal-sync:")) return;
  const signalRecordKey = candidateRecordKey.slice("signal-sync:".length);
  const signal = await prisma.signal.findUnique({ where: { recordKey: signalRecordKey } });
  if (!signal) return;

  await prisma.signal.update({
    where: { id: signal.id },
    data: {
      ...(patch.finalPool !== undefined ? { finalPool: patch.finalPool } : {}),
      ...(patch.status !== undefined ? { status: patch.status } : {})
    }
  });
}
