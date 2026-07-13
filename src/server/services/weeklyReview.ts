import { prisma } from "@/server/db";
import { isDownstreamEligible } from "@/shared/signalStatus";

export type WeeklyEligibleSignal = {
  id: string;
  title: string | null;
  url: string | null;
  date: string | null;
  priority: string | null;
  finalPool: string | null;
  humanStatus: string | null;
  status: string | null;
};

export async function listSignalsForWeeklyReview(): Promise<WeeklyEligibleSignal[]> {
  const rows = await prisma.signal.findMany({
    orderBy: [{ date: "desc" }, { priority: "asc" }],
    select: {
      id: true,
      title: true,
      originalUrl: true,
      sourceUrl: true,
      date: true,
      priority: true,
      finalPool: true,
      humanStatus: true,
      status: true
    }
  });

  return rows
    .filter((row) =>
      isDownstreamEligible({
        humanStatus: row.humanStatus,
        status: row.status,
        finalPool: row.finalPool
      })
    )
    .map((row) => ({
      id: row.id,
      title: row.title,
      url: row.originalUrl ?? row.sourceUrl,
      date: row.date,
      priority: row.priority,
      finalPool: row.finalPool,
      humanStatus: row.humanStatus,
      status: row.status
    }));
}
