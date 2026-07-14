import { prisma } from "@/server/db";

export type PeriodTrackingMetrics = {
  periodStart: string;
  periodEnd: string;
  signalCount: number;
  triage: {
    pending: number;
    confirmedOrChanged: number;
    dropped: number;
  };
  conversion: {
    withTask: number;
    withArtifact: number;
  };
};

export type PeriodTrackingTables = {
  signals: { date: string; title: string; priority: string; humanStatus: string; pool: string }[];
  triageRows: { status: string; count: number }[];
  conversionRows: {
    title: string;
    date: string;
    kind: "task" | "artifact";
    linkedFrom: "signal" | "candidate";
  }[];
};

export async function getPeriodTracking(
  periodStart: string,
  periodEnd: string
): Promise<{ metrics: PeriodTrackingMetrics; tables: PeriodTrackingTables }> {
  const [signals, candidates, tasks, artifacts] = await Promise.all([
    prisma.signal.findMany({
      where: { stream: "daily", date: { gte: periodStart, lte: periodEnd } },
      select: {
        id: true,
        date: true,
        title: true,
        priority: true,
        humanStatus: true,
        suggestedPool: true,
        finalPool: true,
        status: true
      },
      orderBy: [{ date: "desc" }, { sourceLine: "asc" }]
    }),
    prisma.candidate.findMany({
      where: { date: { gte: periodStart, lte: periodEnd } },
      select: {
        id: true,
        date: true,
        title: true,
        humanStatus: true,
        finalPool: true,
        status: true
      }
    }),
    prisma.task.findMany({
      where: {
        OR: [{ linkedSignalId: { not: null } }, { linkedCandidateId: { not: null } }]
      },
      select: { id: true, title: true, linkedSignalId: true, linkedCandidateId: true }
    }),
    prisma.artifact.findMany({
      where: {
        OR: [{ linkedSignalId: { not: null } }, { linkedCandidateId: { not: null } }]
      },
      select: { id: true, title: true, linkedSignalId: true, linkedCandidateId: true }
    })
  ]);

  const periodCandidates = candidates;

  const signalIds = new Set(signals.map((s) => s.id));
  const candidateIds = new Set(periodCandidates.map((c) => c.id));

  let pending = 0;
  let confirmedOrChanged = 0;
  let dropped = 0;
  for (const s of signals) {
    const human = s.humanStatus ?? "pending";
    if (s.finalPool === "drop" || s.status === "dropped") dropped += 1;
    else if (human === "pending") pending += 1;
    else if (human === "confirmed" || human === "changed") confirmedOrChanged += 1;
  }

  const conversionRows: PeriodTrackingTables["conversionRows"] = [];
  const withTaskIds = new Set<string>();
  const withArtifactIds = new Set<string>();

  for (const t of tasks) {
    if (t.linkedSignalId && signalIds.has(t.linkedSignalId)) {
      withTaskIds.add(`s:${t.linkedSignalId}`);
      const sig = signals.find((s) => s.id === t.linkedSignalId);
      conversionRows.push({
        title: t.title,
        date: sig?.date ?? "",
        kind: "task",
        linkedFrom: "signal"
      });
    } else if (t.linkedCandidateId && candidateIds.has(t.linkedCandidateId)) {
      withTaskIds.add(`c:${t.linkedCandidateId}`);
      const cand = periodCandidates.find((c) => c.id === t.linkedCandidateId);
      conversionRows.push({
        title: t.title,
        date: cand?.date ?? "",
        kind: "task",
        linkedFrom: "candidate"
      });
    }
  }

  for (const a of artifacts) {
    if (a.linkedSignalId && signalIds.has(a.linkedSignalId)) {
      withArtifactIds.add(`s:${a.linkedSignalId}`);
      const sig = signals.find((s) => s.id === a.linkedSignalId);
      conversionRows.push({
        title: a.title,
        date: sig?.date ?? "",
        kind: "artifact",
        linkedFrom: "signal"
      });
    } else if (a.linkedCandidateId && candidateIds.has(a.linkedCandidateId)) {
      withArtifactIds.add(`c:${a.linkedCandidateId}`);
      const cand = periodCandidates.find((c) => c.id === a.linkedCandidateId);
      conversionRows.push({
        title: a.title,
        date: cand?.date ?? "",
        kind: "artifact",
        linkedFrom: "candidate"
      });
    }
  }

  return {
    metrics: {
      periodStart,
      periodEnd,
      signalCount: signals.length,
      triage: { pending, confirmedOrChanged, dropped },
      conversion: {
        withTask: withTaskIds.size,
        withArtifact: withArtifactIds.size
      }
    },
    tables: {
      signals: signals.slice(0, 40).map((s) => ({
        date: s.date ?? "",
        title: s.title ?? "(untitled)",
        priority: s.priority ?? "",
        humanStatus: s.humanStatus ?? "pending",
        pool: s.finalPool ?? s.suggestedPool ?? ""
      })),
      triageRows: [
        { status: "pending", count: pending },
        { status: "confirmed|changed", count: confirmedOrChanged },
        { status: "dropped", count: dropped }
      ],
      conversionRows: conversionRows.slice(0, 40)
    }
  };
}

/** Last 7 calendar days ending on `endDate` (YYYY-MM-DD). */
export function weekWindowEnding(endDate: string): { start: string; end: string } {
  const end = new Date(`${endDate}T12:00:00Z`);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 6);
  return {
    start: start.toISOString().slice(0, 10),
    end: endDate
  };
}

/** Calendar month containing `anchor` (YYYY-MM-DD). */
export function monthWindowContaining(anchor: string): { start: string; end: string } {
  const [y, m] = anchor.split("-").map(Number);
  const start = `${y}-${String(m).padStart(2, "0")}-01`;
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const end = `${y}-${String(m).padStart(2, "0")}-${String(last).padStart(2, "0")}`;
  return { start, end };
}
