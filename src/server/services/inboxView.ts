import { prisma } from "@/server/db";
import { getLatestDailyDate } from "@/server/services/dailyView";
import { getCandidatePoolGroups } from "@/server/services/candidatePools";
import { parseSignalRaw, pickSummary } from "@/server/signalRaw";
import type { InboxSignal, PoolGroup, PendingBacklogSignal } from "@/shared/inboxTypes";

export type { InboxSignal, PoolGroup, PendingBacklogSignal } from "@/shared/inboxTypes";
export { getCandidatePoolGroups } from "@/server/services/candidatePools";

export async function getCandidatePools(filters?: {
  humanStatus?: string;
  pool?: string;
  priority?: string;
}): Promise<PoolGroup[]> {
  const groups = await getCandidatePoolGroups();
  if (!filters?.humanStatus && !filters?.pool && !filters?.priority) return groups;

  return groups
    .filter((g) => {
      if (!filters.pool) return true;
      const normalized = g.poolName.replace(/-/g, "_");
      return normalized === filters.pool || g.poolName === filters.pool;
    })
    .map((g) => ({
      poolName: g.poolName,
      items: g.items.filter((i) => {
        if (filters.humanStatus && i.humanStatus !== filters.humanStatus) return false;
        if (filters.priority && i.priority !== filters.priority) return false;
        return true;
      })
    }))
    .filter((g) => g.items.length > 0 || !filters.pool);
}

export async function getPendingSignalBacklog(): Promise<PendingBacklogSignal[]> {
  const date = await getLatestDailyDate();
  const rows = await prisma.signal.findMany({
    where: {
      stream: "daily",
      humanStatus: "pending",
      ...(date ? { NOT: { date } } : {})
    },
    orderBy: [{ date: "desc" }, { priority: "asc" }, { sourceLine: "asc" }]
  });

  return rows.map((s) => ({
    id: s.id,
    title: s.title ?? "(untitled)",
    url: s.originalUrl ?? s.sourceUrl ?? "",
    date: s.date,
    priority: s.priority ?? "",
    suggestedPool: s.suggestedPool ?? "",
    finalPool: s.finalPool ?? s.suggestedPool ?? ""
  }));
}

export async function getInboxToday(): Promise<{ date: string; signals: InboxSignal[] } | null> {
  const date = await getLatestDailyDate();
  if (!date) return null;
  const rows = await prisma.signal.findMany({
    where: { stream: "daily", date, humanStatus: "pending" },
    orderBy: [{ priority: "asc" }, { sourceLine: "asc" }]
  });
  const signals = rows.map((s) => ({
    id: s.id,
    title: s.title ?? "(untitled)",
    url: s.originalUrl ?? s.sourceUrl ?? "",
    priority: s.priority ?? "",
    suggestedPool: s.suggestedPool ?? "",
    finalPool: s.finalPool ?? s.suggestedPool ?? "",
    humanStatus: s.humanStatus ?? "pending",
    readingPackStatus: s.readingPackStatus ?? "not_selected",
    summary: pickSummary(parseSignalRaw(s.rawJson), s.aihotSummary, s.reason)
  }));
  return { date, signals };
}
