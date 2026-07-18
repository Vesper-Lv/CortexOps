import { prisma } from "@/server/db";
import {
  POOL_DISPLAY_ORDER,
  normalizePoolName,
  poolNameFromOption,
  poolOptionFromName,
  sortPools,
  type PoolOption
} from "@/shared/poolOptions";
import type { PoolGroup } from "@/shared/inboxTypes";
import { PRIORITY_OPTIONS, type PriorityOption } from "@/shared/priorityOptions";
import { computeStatusOnFinalize } from "@/shared/signalStatus";
import { parseSignalRaw, pickSummary } from "@/server/signalRaw";

async function loadPromoteFlags(candidateIds: string[]): Promise<{
  taskIds: Set<string>;
  artifactIds: Set<string>;
}> {
  if (candidateIds.length === 0) {
    return { taskIds: new Set(), artifactIds: new Set() };
  }

  const [tasks, artifacts] = await Promise.all([
    prisma.task.findMany({
      where: { linkedCandidateId: { in: candidateIds } },
      select: { linkedCandidateId: true }
    }),
    prisma.artifact.findMany({
      where: { linkedCandidateId: { in: candidateIds } },
      select: { linkedCandidateId: true }
    })
  ]);

  return {
    taskIds: new Set(tasks.map((t) => t.linkedCandidateId).filter(Boolean) as string[]),
    artifactIds: new Set(artifacts.map((a) => a.linkedCandidateId).filter(Boolean) as string[])
  };
}

export async function getCandidatePoolGroups(): Promise<PoolGroup[]> {
  const rows = await prisma.candidate.findMany({
    orderBy: [{ poolName: "asc" }, { priority: "asc" }]
  });
  const promoteFlags = await loadPromoteFlags(rows.map((c) => c.id));

  const map = new Map<string, PoolGroup>();
  for (const c of rows) {
    const key = normalizePoolName(c.poolName) ?? "archive";
    const raw = parseSignalRaw(c.rawJson);
    const suggestion = c.reason ?? "";
    if (!map.has(key)) map.set(key, { poolName: key, items: [] });
    map.get(key)!.items.push({
      id: c.id,
      poolName: key,
      title: c.title ?? "(untitled)",
      url: c.originalUrl ?? c.sourceUrl ?? "",
      date: c.date,
      sourceName: c.sourceName,
      humanStatus: c.humanStatus ?? "pending",
      status: c.status,
      finalPool: normalizePoolName(c.finalPool),
      priority: c.priority ?? "",
      summary: pickSummary(raw, c.aihotSummary, c.reason),
      reason: c.reason ?? c.aihotSummary ?? "",
      suggestion,
      priorityRationale: raw.priorityRationale,
      poolRationale: raw.poolRationale,
      contentTags: raw.contentTags,
      hasLinkedTask: promoteFlags.taskIds.has(c.id),
      hasLinkedArtifact: promoteFlags.artifactIds.has(c.id)
    });
  }

  for (const option of POOL_DISPLAY_ORDER) {
    const poolName = poolNameFromOption(option);
    if (!map.has(poolName)) {
      map.set(poolName, { poolName, items: [] });
    }
  }

  // Keep drop items out of the board seed/order; do not expose a drop column.
  const groups = [...map.values()].filter((g) => poolOptionFromName(g.poolName) !== "drop");
  return sortPools(groups);
}

export async function moveCandidatePool(candidateId: string, toPoolName: string): Promise<void> {
  const normalizedPool = normalizePoolName(toPoolName);
  if (!normalizedPool) {
    throw new Error(`invalid pool: ${toPoolName}`);
  }

  const candidate = await prisma.candidate.findUnique({ where: { id: candidateId } });
  if (!candidate) throw new Error(`candidate not found: ${candidateId}`);

  const newPoolName = normalizedPool;
  if (candidate.poolName === newPoolName) return;

  const status = computeStatusOnFinalize(newPoolName);
  const humanStatus = candidate.humanStatus === "rejected" ? "rejected" : "changed";
  const before = {
    poolName: candidate.poolName,
    finalPool: candidate.finalPool,
    status: candidate.status,
    humanStatus: candidate.humanStatus
  };
  const after = { poolName: newPoolName, finalPool: newPoolName, status, humanStatus };

  await prisma.$transaction([
    prisma.candidate.update({
      where: { id: candidateId },
      data: { poolName: newPoolName, finalPool: newPoolName, humanStatus, status }
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

  await syncLinkedSignal(candidate.recordKey, {
    finalPool: newPoolName,
    status,
    humanStatus
  });
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

  await syncLinkedSignal(candidate.recordKey, { status: "watching" });
}

export async function updateCandidatePriority(candidateId: string, priority: string): Promise<void> {
  if (!PRIORITY_OPTIONS.includes(priority as PriorityOption)) {
    throw new Error(`invalid priority: ${priority}`);
  }

  const candidate = await prisma.candidate.findUnique({ where: { id: candidateId } });
  if (!candidate) throw new Error(`candidate not found: ${candidateId}`);
  if (candidate.priority === priority) return;

  await prisma.$transaction([
    prisma.candidate.update({
      where: { id: candidateId },
      data: { priority }
    }),
    prisma.auditLog.create({
      data: {
        entityType: "candidate",
        entityId: candidateId,
        action: "change_priority",
        fromValue: candidate.priority,
        toValue: priority,
        rationale: null
      }
    })
  ]);

  await syncLinkedSignal(candidate.recordKey, { priority });
}

export async function updateCandidateReason(candidateId: string, reason: string): Promise<void> {
  const candidate = await prisma.candidate.findUnique({ where: { id: candidateId } });
  if (!candidate) throw new Error(`candidate not found: ${candidateId}`);

  const nextReason = reason.trim();
  if ((candidate.reason ?? "") === nextReason) return;

  await prisma.$transaction([
    prisma.candidate.update({
      where: { id: candidateId },
      data: { reason: nextReason || null }
    }),
    prisma.auditLog.create({
      data: {
        entityType: "candidate",
        entityId: candidateId,
        action: "change_reason",
        fromValue: candidate.reason,
        toValue: nextReason || null,
        rationale: null
      }
    })
  ]);
}

export async function updateCandidateSuggestion(
  candidateId: string,
  suggestion: string
): Promise<void> {
  await updateCandidateReason(candidateId, suggestion);
}

async function syncLinkedSignal(
  candidateRecordKey: string,
  patch: { finalPool?: string; status?: string; humanStatus?: string; priority?: string }
): Promise<void> {
  if (!candidateRecordKey.startsWith("signal-sync:")) return;
  const signalRecordKey = candidateRecordKey.slice("signal-sync:".length);
  const signal = await prisma.signal.findUnique({ where: { recordKey: signalRecordKey } });
  if (!signal) return;

  await prisma.signal.update({
    where: { id: signal.id },
    data: {
      ...(patch.finalPool !== undefined ? { finalPool: patch.finalPool } : {}),
      ...(patch.status !== undefined ? { status: patch.status } : {}),
      ...(patch.humanStatus !== undefined ? { humanStatus: patch.humanStatus } : {}),
      ...(patch.priority !== undefined ? { priority: patch.priority } : {})
    }
  });
}
