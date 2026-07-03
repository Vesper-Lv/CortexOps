import { prisma } from "@/server/db";
import type { FivePartSection, PracticeOption } from "@/server/importers/dailyReportParser";

export type DailyReportData = {
  date: string;
  fivePart: FivePartSection[];
  practices: PracticeOption[];
  sourceFile: string;
};

export type DailySessionData = {
  date: string;
  selectedPracticeIndex: number | null;
  practiceAlt0Disposition: string | null;
  practiceAlt1Disposition: string | null;
  practiceAlt2Disposition: string | null;
  candidatesDismissed: boolean;
};

export async function getDailyReport(date: string): Promise<DailyReportData | null> {
  const row = await prisma.dailyReport.findUnique({ where: { date } });
  if (!row) return null;
  return {
    date: row.date,
    fivePart: JSON.parse(row.fivePartJson) as FivePartSection[],
    practices: JSON.parse(row.practicesJson) as PracticeOption[],
    sourceFile: row.sourceFile
  };
}

export async function getDailySession(date: string): Promise<DailySessionData | null> {
  const row = await prisma.dailySession.findUnique({ where: { date } });
  if (!row) return null;
  return {
    date: row.date,
    selectedPracticeIndex: row.selectedPracticeIndex,
    practiceAlt0Disposition: row.practiceAlt0Disposition,
    practiceAlt1Disposition: row.practiceAlt1Disposition,
    practiceAlt2Disposition: row.practiceAlt2Disposition,
    candidatesDismissed: row.candidatesDismissed
  };
}

export type UpsertDailySessionInput = {
  selectedPracticeIndex?: number | null;
  practiceAlt0Disposition?: string | null;
  practiceAlt1Disposition?: string | null;
  practiceAlt2Disposition?: string | null;
  candidatesDismissed?: boolean;
};

export async function upsertDailySession(
  date: string,
  input: UpsertDailySessionInput
): Promise<DailySessionData> {
  const row = await prisma.dailySession.upsert({
    where: { date },
    create: { date, ...input },
    update: input
  });
  return {
    date: row.date,
    selectedPracticeIndex: row.selectedPracticeIndex,
    practiceAlt0Disposition: row.practiceAlt0Disposition,
    practiceAlt1Disposition: row.practiceAlt1Disposition,
    practiceAlt2Disposition: row.practiceAlt2Disposition,
    candidatesDismissed: row.candidatesDismissed
  };
}
