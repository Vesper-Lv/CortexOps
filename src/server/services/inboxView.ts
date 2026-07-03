import { prisma } from "@/server/db";
import { getLatestDailyDate } from "@/server/services/dailyView";
import { getCandidatePoolGroups } from "@/server/services/candidatePools";
import { parseSignalRaw, pickSummary } from "@/server/signalRaw";
import type { InboxSignal, PoolGroup } from "@/shared/inboxTypes";

export type { InboxSignal, PoolGroup } from "@/shared/inboxTypes";
export { getCandidatePoolGroups } from "@/server/services/candidatePools";

export async function getCandidatePools(humanStatus?: string): Promise<PoolGroup[]> {
  const groups = await getCandidatePoolGroups();
  if (!humanStatus) return groups;
  return groups
    .map((g) => ({ poolName: g.poolName, items: g.items.filter((i) => i.humanStatus === humanStatus) }))
    .filter((g) => g.items.length > 0);
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
