import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { runImport } from "@/server/importers/runImport";
import {
  buildDefaultSources,
  listDailyReportFiles,
  listMonthlyReportFiles,
  listWeeklyReportFiles
} from "@/server/importers/importSources";
import { importDailyReports } from "@/server/importers/importDailyReports";
import { importArchiveReports } from "@/server/importers/importArchiveReports";
import { importFocusPolicyFromMarkdown } from "@/server/services/focusRules";
import { prismaSignalRepository } from "@/server/importers/prismaSignalRepository";

export async function POST() {
  try {
    const sources = await buildDefaultSources();
    const summary = await runImport(
      { readFile: (p) => readFile(p, "utf8"), repo: prismaSignalRepository },
      sources
    );
    const reportFiles = await listDailyReportFiles();
    const reportSummary = await importDailyReports(
      (p) => readFile(p, "utf8"),
      reportFiles,
      summary.importRunId
    );
    const weeklyFiles = await listWeeklyReportFiles();
    const monthlyFiles = await listMonthlyReportFiles();
    const archiveSummary = await importArchiveReports(
      (p) => readFile(p, "utf8"),
      [
        ...weeklyFiles.map((path) => ({ path, reportType: "weekly" })),
        ...monthlyFiles.map((path) => ({ path, reportType: "monthly" }))
      ],
      summary.importRunId
    );
    let focusSummary = { imported: 0, skipped: 0 };
    try {
      const policyMarkdown = await readFile("docs/focus-policy.md", "utf8");
      focusSummary = await importFocusPolicyFromMarkdown(policyMarkdown, { preserveUserEdits: true });
    } catch {
      // optional
    }
    return NextResponse.json({
      ...summary,
      dailyReports: reportSummary,
      archiveReports: archiveSummary,
      focusRules: focusSummary
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "import failed" },
      { status: 500 }
    );
  }
}
