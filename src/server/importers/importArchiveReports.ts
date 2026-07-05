import { prisma } from "@/server/db";

function extractTitle(markdown: string, fallback: string): string {
  const match = markdown.match(/^#\s+(.+)$/m);
  return match?.[1]?.trim() ?? fallback;
}

function extractPeriodFromPath(filePath: string): { start: string | null; end: string | null } {
  const range = filePath.match(/(\d{4}-\d{2}-\d{2})_(\d{4}-\d{2}-\d{2})/);
  if (range) return { start: range[1], end: range[2] };
  const single = filePath.match(/(\d{4}-\d{2}-\d{2})/);
  return { start: single?.[1] ?? null, end: null };
}

export async function importArchiveReports(
  readFile: (path: string) => Promise<string>,
  files: { path: string; reportType: string }[],
  importRunId?: string
): Promise<{ imported: number; errors: number; importedTypes: string[] }> {
  let imported = 0;
  let errors = 0;
  const importedTypes: string[] = [];

  for (const file of files) {
    let content: string;
    try {
      content = await readFile(file.path);
    } catch {
      errors += 1;
      continue;
    }

    const { start, end } = extractPeriodFromPath(file.path);
    const title = extractTitle(content, `${file.reportType} report`);

    await prisma.archiveReport.upsert({
      where: { sourceFile: file.path },
      create: {
        reportType: file.reportType,
        title,
        periodStart: start,
        periodEnd: end,
        rawMarkdown: content,
        sourceFile: file.path,
        importRunId: importRunId ?? null
      },
      update: {
        reportType: file.reportType,
        title,
        periodStart: start,
        periodEnd: end,
        rawMarkdown: content,
        importRunId: importRunId ?? null
      }
    });
    imported += 1;
    importedTypes.push(file.reportType);
  }

  return { imported, errors, importedTypes };
}
