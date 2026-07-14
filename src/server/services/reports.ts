import { prisma } from "@/server/db";
import type { FivePartSection, PracticeOption } from "@/server/importers/dailyReportParser";

export type DailyReportListItem = {
  date: string;
  sourceFile: string;
  sectionCount: number;
  practiceCount: number;
};

export type ArchiveReportListItem = {
  id: string;
  reportType: string;
  title: string;
  periodStart: string | null;
  periodEnd: string | null;
  sourceFile: string;
};

export type ReportDetail =
  | {
      kind: "daily";
      date: string;
      sourceFile: string;
      fivePart: FivePartSection[];
      practices: PracticeOption[];
    }
  | {
      kind: "archive";
      id: string;
      reportType: string;
      title: string;
      periodStart: string | null;
      periodEnd: string | null;
      rawMarkdown: string;
      sourceFile: string;
    };

export async function listDailyReports(): Promise<DailyReportListItem[]> {
  const rows = await prisma.dailyReport.findMany({ orderBy: { date: "desc" } });
  return rows.map((r) => {
    const fivePart = JSON.parse(r.fivePartJson) as FivePartSection[];
    const practices = JSON.parse(r.practicesJson) as PracticeOption[];
    return {
      date: r.date,
      sourceFile: r.sourceFile,
      sectionCount: Array.isArray(fivePart)
        ? fivePart.filter((s) => typeof s?.content === "string" && s.content.trim().length > 0).length
        : 0,
      practiceCount: Array.isArray(practices) ? practices.length : 0
    };
  });
}

export async function listArchiveReports(reportType?: string): Promise<ArchiveReportListItem[]> {
  const rows = await prisma.archiveReport.findMany({
    where: reportType ? { reportType } : undefined,
    orderBy: { periodStart: "desc" }
  });
  return rows.map((r) => ({
    id: r.id,
    reportType: r.reportType,
    title: r.title,
    periodStart: r.periodStart,
    periodEnd: r.periodEnd,
    sourceFile: r.sourceFile
  }));
}

export async function getDailyReportDetail(date: string): Promise<ReportDetail | null> {
  const row = await prisma.dailyReport.findUnique({ where: { date } });
  if (!row) return null;
  return {
    kind: "daily",
    date: row.date,
    sourceFile: row.sourceFile,
    fivePart: JSON.parse(row.fivePartJson) as FivePartSection[],
    practices: JSON.parse(row.practicesJson) as PracticeOption[]
  };
}

export async function getArchiveReportDetail(id: string): Promise<ReportDetail | null> {
  const row = await prisma.archiveReport.findUnique({ where: { id } });
  if (!row) return null;
  return {
    kind: "archive",
    id: row.id,
    reportType: row.reportType,
    title: row.title,
    periodStart: row.periodStart,
    periodEnd: row.periodEnd,
    rawMarkdown: row.rawMarkdown,
    sourceFile: row.sourceFile
  };
}

export async function getLatestArchiveReport(reportType: string): Promise<ReportDetail | null> {
  const row = await prisma.archiveReport.findFirst({
    where: { reportType },
    orderBy: { periodStart: "desc" }
  });
  if (!row) return null;
  return {
    kind: "archive",
    id: row.id,
    reportType: row.reportType,
    title: row.title,
    periodStart: row.periodStart,
    periodEnd: row.periodEnd,
    rawMarkdown: row.rawMarkdown,
    sourceFile: row.sourceFile
  };
}
