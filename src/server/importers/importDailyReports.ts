import { parseDailyReportMarkdown } from "@/server/importers/dailyReportParser";
import { prisma } from "@/server/db";

export function extractDateFromReportPath(filePath: string): string | null {
  const match = filePath.match(/(\d{4}-\d{2}-\d{2})-report\.md$/);
  return match?.[1] ?? null;
}

export async function importDailyReports(
  readFile: (path: string) => Promise<string>,
  reportFiles: string[],
  importRunId?: string
): Promise<{ imported: number; errors: number }> {
  let imported = 0;
  let errors = 0;

  for (const filePath of reportFiles) {
    const date = extractDateFromReportPath(filePath);
    if (!date) {
      errors += 1;
      continue;
    }

    let content: string;
    try {
      content = await readFile(filePath);
    } catch {
      errors += 1;
      continue;
    }

    const { fivePart, practices } = parseDailyReportMarkdown(content);

    await prisma.dailyReport.upsert({
      where: { date },
      create: {
        date,
        fivePartJson: JSON.stringify(fivePart),
        practicesJson: JSON.stringify(practices),
        sourceFile: filePath,
        importRunId: importRunId ?? null
      },
      update: {
        fivePartJson: JSON.stringify(fivePart),
        practicesJson: JSON.stringify(practices),
        sourceFile: filePath,
        importRunId: importRunId ?? null
      }
    });
    imported += 1;
  }

  return { imported, errors };
}
