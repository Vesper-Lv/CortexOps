import { readFile } from "node:fs/promises";
import { runImport } from "@/server/importers/runImport";
import { buildDefaultSources, listDailyReportFiles } from "@/server/importers/importSources";
import { importDailyReports } from "@/server/importers/importDailyReports";
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
  console.log("import summary:", summary);
  console.log("daily reports:", reportSummary);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
