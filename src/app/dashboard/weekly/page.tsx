import Link from "next/link";
import { CalendarRange } from "lucide-react";
import { DownstreamEligibleSignals } from "@/components/dashboard/downstream-eligible-signals";
import { WorkbenchPage } from "@/components/layout/workbench-page";
import { getLatestArchiveReport } from "@/server/services/reports";
import { listDownstreamEligibleSignals } from "@/server/services/downstreamReview";

export const dynamic = "force-dynamic";

export default async function WeeklyPage() {
  const [report, eligibleSignals] = await Promise.all([
    getLatestArchiveReport("weekly"),
    listDownstreamEligibleSignals()
  ]);

  if (!report || report.kind !== "archive") {
    return (
      <section className="mx-auto flex max-w-4xl flex-col gap-6">
        <DownstreamEligibleSignals signals={eligibleSignals} variant="weekly" />
        <WorkbenchPage
          eyebrow="Weekly digest"
          title="Weekly"
          description="Read this week's execution review, paper radar, demo recommendation, and engineering-learning report."
          metrics={[
            { label: "Weekly reports", value: "0", detail: "Import state/weekly/*.md" },
            { label: "Eligible signals", value: String(eligibleSignals.length), detail: "Ready for automation" },
            { label: "Practice picks", value: "-", detail: "Not selected" }
          ]}
          emptyState={{
            icon: CalendarRange,
            title: "No weekly report yet",
            description:
              "Place weekly automation markdown under state/weekly/ and run npm run import. Reports also appear in Library/Reports.",
            actions: [{ icon: CalendarRange, label: "Library / Reports", tone: "primary" }]
          }}
        />
      </section>
    );
  }

  return (
    <section className="mx-auto flex max-w-4xl flex-col gap-6">
      <DownstreamEligibleSignals signals={eligibleSignals} variant="weekly" />
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">Weekly digest</p>
        <h2 className="mt-3 text-4xl font-semibold text-foreground">{report.title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {report.periodStart}
          {report.periodEnd ? ` → ${report.periodEnd}` : ""} ·{" "}
          <Link href="/library/reports" className="text-primary hover:underline">
            全部报告
          </Link>
        </p>
      </div>
      <article className="whitespace-pre-wrap rounded-md border border-border bg-surface p-4 text-sm">
        {report.rawMarkdown}
      </article>
    </section>
  );
}
