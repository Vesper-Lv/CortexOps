import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { runImport } from "@/server/importers/runImport";
import { buildDefaultSources, listDailyReportFiles } from "@/server/importers/importSources";
import { importDailyReports } from "@/server/importers/importDailyReports";
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
    return NextResponse.json({ ...summary, dailyReports: reportSummary });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "import failed" },
      { status: 500 }
    );
  }
}
