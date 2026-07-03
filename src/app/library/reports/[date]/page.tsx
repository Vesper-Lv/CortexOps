import Link from "next/link";
import { FivePartSummary } from "@/components/dashboard/five-part-summary";
import { getDailyReportDetail } from "@/server/services/reports";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ date: string }> };

export default async function DailyReportDetailPage({ params }: PageProps) {
  const { date } = await params;
  const report = await getDailyReportDetail(date);

  if (!report || report.kind !== "daily") {
    return (
      <section className="mx-auto max-w-4xl px-4 py-8">
        <p className="text-sm text-muted-foreground">未找到 {date} 的日报。</p>
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
        <h2 className="mt-2 text-3xl font-semibold">Daily · {report.date}</h2>
        <p className="mt-1 text-xs text-muted-foreground">{report.sourceFile}</p>
      </div>
      {report.fivePart.length > 0 && <FivePartSummary sections={report.fivePart} />}
    </section>
  );
}
