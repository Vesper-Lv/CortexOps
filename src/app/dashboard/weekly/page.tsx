import Link from "next/link";
import { CalendarRange } from "lucide-react";
import { WeeklyEligibleSignals } from "@/components/dashboard/weekly-eligible-signals";
import { WeeklyReportView } from "@/components/dashboard/weekly-report-view";
import { WorkbenchPage } from "@/components/layout/workbench-page";
import { parseWeeklyReportMarkdown } from "@/server/importers/weeklyReportParser";
import { getPendingSignalBacklog } from "@/server/services/inboxView";
import { getLatestArchiveReport } from "@/server/services/reports";
import { listSignalsForWeeklyReview } from "@/server/services/weeklyReview";

export const dynamic = "force-dynamic";

export default async function WeeklyPage() {
  const [report, eligibleSignals, pendingBacklog] = await Promise.all([
    getLatestArchiveReport("weekly"),
    listSignalsForWeeklyReview(),
    getPendingSignalBacklog()
  ]);
  const pendingBanner =
    pendingBacklog.length > 0 ? (
      <div className="rounded-md border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
        仍有 {pendingBacklog.length} 条历史待分拣信号 →{" "}
        <Link href="/inbox/today" className="font-medium text-primary hover:underline">
          去 Inbox 处理
        </Link>
      </div>
    ) : null;

  if (!report || report.kind !== "archive") {
    return (
      <section className="mx-auto flex max-w-4xl flex-col gap-6">
        {pendingBanner}
        <WeeklyEligibleSignals signals={eligibleSignals} />
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

  const sections = parseWeeklyReportMarkdown(report.rawMarkdown);

  return (
    <section className="mx-auto flex max-w-4xl flex-col gap-6">
      {pendingBanner}
      <WeeklyEligibleSignals signals={eligibleSignals} />
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
      <WeeklyReportView sections={sections} />
    </section>
  );
}
