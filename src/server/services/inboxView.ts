import { prisma } from "@/server/db";
import { getLatestDailyDate } from "@/server/services/dailyView";
import { parseSignalRaw, pickSummary } from "@/server/signalRaw";
import type { InboxSignal, PoolGroup } from "@/shared/inboxTypes";

export type { InboxSignal, PoolGroup } from "@/shared/inboxTypes";

export async function getInboxToday(): Promise<{ date: string; signals: InboxSignal[] } | null> {
  const date = await getLatestDailyDate();
  if (!date) return null;
  const rows = await prisma.signal.findMany({
    where: { stream: "daily", date },
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

export async function getCandidatePools(humanStatus?: string): Promise<PoolGroup[]> {
  const rows = await prisma.candidate.findMany({
    where: humanStatus ? { humanStatus } : undefined,
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
  return [...map.values()];
}
