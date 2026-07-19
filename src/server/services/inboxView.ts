import { prisma } from "@/server/db";
import { getLatestDailyDate } from "@/server/services/dailyView";
import { getCandidatePoolGroups } from "@/server/services/candidatePools";
import { parseSignalRaw, pickSummary } from "@/server/signalRaw";
import { normalizePoolName } from "@/shared/poolOptions";
import { REVOCABLE_THRESHOLD } from "@/server/services/confidence";
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
  const normalizedPool = normalizePoolName(filters.pool) ?? (filters.pool ? filters.pool.replace(/-/g, "_") : null);

  return groups
    .filter((g) => {
      if (!normalizedPool) return true;
      return (normalizePoolName(g.poolName) ?? g.poolName).replace(/-/g, "_") === normalizedPool;
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
    suggestedPool: normalizePoolName(s.suggestedPool) ?? s.suggestedPool ?? "",
    finalPool:
      normalizePoolName(s.finalPool ?? s.suggestedPool) ?? s.finalPool ?? s.suggestedPool ?? ""
  }));
}

/** Full triage cards for Backlog (non-latest pending), grouped by date. */
export async function getPendingBacklogInboxGroups(): Promise<
  { date: string; signals: InboxSignal[] }[]
> {
  const date = await getLatestDailyDate();
  const rows = await prisma.signal.findMany({
    where: {
      stream: "daily",
      humanStatus: "pending",
      ...(date ? { NOT: { date } } : {})
    },
    orderBy: [{ date: "desc" }, { sourceLine: "asc" }]
  });

  const byDate = new Map<string, InboxSignal[]>();
  for (const s of rows) {
    const d = s.date ?? "unknown";
    const raw = parseSignalRaw(s.rawJson);
    const signal: InboxSignal = {
      id: s.id,
      title: s.title ?? "(untitled)",
      url: s.originalUrl ?? s.sourceUrl ?? "",
      priority: s.priority ?? "",
      suggestedPool: normalizePoolName(s.suggestedPool) ?? s.suggestedPool ?? "",
      finalPool:
        normalizePoolName(s.finalPool ?? s.suggestedPool) ?? s.finalPool ?? s.suggestedPool ?? "",
      humanStatus: s.humanStatus ?? "pending",
      readingPackStatus: s.readingPackStatus ?? "not_selected",
      summary: pickSummary(raw, s.aihotSummary, s.reason),
      priorityRationale: raw.priorityRationale,
      poolRationale: raw.poolRationale,
      contentTags: raw.contentTags
    };
    if (!byDate.has(d)) byDate.set(d, []);
    byDate.get(d)!.push(signal);
  }

  return [...byDate.entries()].map(([d, signals]) => ({ date: d, signals }));
}

export async function getInboxToday(date?: string): Promise<{ date: string; signals: InboxSignal[] } | null> {
  const targetDate = date ?? (await getLatestDailyDate());
  if (!targetDate) return null;

  const dateExists = await prisma.signal.findFirst({
    where: { stream: "daily", date: targetDate },
    select: { id: true }
  });
  if (!dateExists) return null;

  const rows = await prisma.signal.findMany({
    where: { stream: "daily", date: targetDate, humanStatus: "pending" },
    orderBy: { sourceLine: "asc" }
  });
  // Only return intercepted signals (low confidence pending), not all pending.
  // Threshold mirrors routeByConfidence's intercept boundary.
  const intercepted = rows.filter((s) => {
    const dc = s.decisionConfidence;
    return dc === null || dc === undefined || dc < REVOCABLE_THRESHOLD;
  });
  const signals = intercepted.map((s) => {
    const raw = parseSignalRaw(s.rawJson);
    return {
      id: s.id,
      title: s.title ?? "(untitled)",
      url: s.originalUrl ?? s.sourceUrl ?? "",
      priority: s.priority ?? "",
      suggestedPool: normalizePoolName(s.suggestedPool) ?? s.suggestedPool ?? "",
      finalPool:
        normalizePoolName(s.finalPool ?? s.suggestedPool) ?? s.finalPool ?? s.suggestedPool ?? "",
      humanStatus: s.humanStatus ?? "pending",
      readingPackStatus: s.readingPackStatus ?? "not_selected",
      summary: pickSummary(raw, s.aihotSummary, s.reason),
      priorityRationale: raw.priorityRationale,
      poolRationale: raw.poolRationale,
      contentTags: raw.contentTags
    };
  });
  return { date: targetDate, signals };
}
