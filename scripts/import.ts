import { readFile } from "node:fs/promises";
import { runImport } from "@/server/importers/runImport";
import {
  buildDefaultSources,
  listDailyReportFiles,
  listMonthlyReportFiles,
  listWeeklyReportFiles
} from "@/server/importers/importSources";
import { importDailyReports } from "@/server/importers/importDailyReports";
import { importArchiveReports } from "@/server/importers/importArchiveReports";
import { importFocusPolicyFromMarkdown, refreshExpiredFocusRules } from "@/server/services/focusRules";
import { prismaSignalRepository } from "@/server/importers/prismaSignalRepository";
import { prisma } from "@/server/db";

async function main() {
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
    await refreshExpiredFocusRules();
    const policyMarkdown = await readFile("docs/focus-policy.md", "utf8");
    focusSummary = await importFocusPolicyFromMarkdown(policyMarkdown, { preserveUserEdits: true });
  } catch {
    // focus-policy optional during early setup
  }

  console.log("import summary:", summary);
  console.log("daily reports:", reportSummary);
  console.log("archive reports:", archiveSummary);
  console.log("focus rules:", focusSummary);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
