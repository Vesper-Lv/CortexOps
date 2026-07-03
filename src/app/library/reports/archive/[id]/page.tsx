import Link from "next/link";
import { getArchiveReportDetail } from "@/server/services/reports";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

export default async function ArchiveReportDetailPage({ params }: PageProps) {
  const { id } = await params;
  const report = await getArchiveReportDetail(id);

  if (!report || report.kind !== "archive") {
    return (
      <section className="mx-auto max-w-4xl px-4 py-8">
        <p className="text-sm text-muted-foreground">未找到报告。</p>
        <Link href="/library/reports" className="mt-2 inline-block text-sm text-primary hover:underline">
          ← 返回 Reports
        </Link>
      </section>
    );
  }

  return (
    <section className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-8">
      <div>
        <Link href="/library/reports" className="text-sm text-primary hover:underline">
          ← Reports
        </Link>
        <h2 className="mt-2 text-3xl font-semibold">{report.title}</h2>
        <p className="mt-1 text-sm capitalize text-muted-foreground">
          {report.reportType}
          {report.periodStart ? ` · ${report.periodStart}` : ""}
          {report.periodEnd ? ` → ${report.periodEnd}` : ""}
        </p>
      </div>
      <article className="prose prose-sm max-w-none whitespace-pre-wrap rounded-md border border-border bg-surface p-4 text-sm dark:prose-invert">
        {report.rawMarkdown}
      </article>
    </section>
  );
}
