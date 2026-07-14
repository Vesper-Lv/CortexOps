import Link from "next/link";
import { MarkdownBody } from "@/components/shared/markdown-body";
import {
  displayArchiveTitle,
  formatPeriodRange,
  stripLeadingMarkdownH1
} from "@/shared/reportDisplay";
import { getArchiveReportDetail, listArchiveReports } from "@/server/services/reports";

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

  const peers =
    report.reportType === "weekly"
      ? (await listArchiveReports("weekly")).map((r) => ({
          id: r.id,
          reportType: r.reportType,
          periodStart: r.periodStart,
          periodEnd: r.periodEnd
        }))
      : [];

  const title = displayArchiveTitle(
    {
      id: report.id,
      reportType: report.reportType,
      periodStart: report.periodStart,
      periodEnd: report.periodEnd
    },
    peers
  );
  const range = formatPeriodRange(report.periodStart, report.periodEnd);
  const bodyMarkdown = stripLeadingMarkdownH1(report.rawMarkdown);

  return (
    <section className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-8">
      <div>
        <Link href="/library/reports" className="text-sm text-primary hover:underline">
          ← Reports
        </Link>
        <h2 className="mt-2 text-3xl font-semibold">{title}</h2>
        <p className="mt-1 text-sm capitalize text-muted-foreground">
          {report.reportType}
          {range ? ` · ${range}` : ""}
        </p>
      </div>
      <article className="rounded-md border border-border bg-surface p-4">
        <MarkdownBody markdown={bodyMarkdown} />
      </article>
    </section>
  );
}
