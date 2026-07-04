import { readFile } from "node:fs/promises";
import { runImport } from "@/server/importers/runImport";
import {
  buildDefaultSources,
  listDailyReportFiles,
  listMonthlyReportFiles,
  listWeeklyReportFiles,
  listBySuffix
} from "@/server/importers/importSources";
import { importDailyReports } from "@/server/importers/importDailyReports";
import { importArchiveReports } from "@/server/importers/importArchiveReports";
import { importFocusPolicyFromMarkdown, refreshExpiredFocusRules } from "@/server/services/focusRules";
import { prismaSignalRepository } from "@/server/importers/prismaSignalRepository";
import { getOrCreatePolicySnapshot } from "@/server/services/policySnapshotStore";
import { detectAutomationRunsFromImport } from "@/server/services/automationRuns";
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

  const { id: policySnapshotId } = await getOrCreatePolicySnapshot({
    readFile: (p) => readFile(p, "utf8")
  });

  await prisma.importRun.update({
    where: { id: summary.importRunId },
    data: { policySnapshotId }
  });

  const dailyLinkFiles = await listBySuffix("state/daily", "-links.jsonl");
  const automationRegistered = await detectAutomationRunsFromImport({
    policySnapshotId,
    dailyLinkFiles: summary.importedSignals > 0 ? dailyLinkFiles : [],
    weeklyFiles: archiveSummary.importedTypes.includes("weekly") ? weeklyFiles : [],
    monthlyFiles: archiveSummary.importedTypes.includes("monthly") ? monthlyFiles : [],
    archiveReportTypes: archiveSummary.importedTypes
  });

  console.log("import summary:", summary);
  console.log("daily reports:", reportSummary);
  console.log("archive reports:", archiveSummary);
  console.log("focus rules:", focusSummary);
  console.log("policy snapshot:", policySnapshotId);
  console.log("automation runs registered:", automationRegistered);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
