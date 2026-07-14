import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { MonthlyReportView } from "@/components/dashboard/monthly-report-view";
import { PeriodTrackingPanel } from "@/components/dashboard/period-tracking-panel";
import { WorkbenchPage } from "@/components/layout/workbench-page";
import { parseMonthlyReportMarkdown } from "@/server/importers/monthlyReportParser";
import { getLatestDailyDate } from "@/server/services/dailyView";
import {
  getPeriodTracking,
  monthWindowContaining
} from "@/server/services/periodTracking";
import { getLatestArchiveReport } from "@/server/services/reports";
import { displayMonthlyTitle, formatPeriodRange } from "@/shared/reportDisplay";

export const dynamic = "force-dynamic";

export default async function MonthlyPage() {
  const [report, latestDaily] = await Promise.all([
    getLatestArchiveReport("monthly"),
    getLatestDailyDate()
  ]);

  const window =
    report?.kind === "archive" && report.periodStart && report.periodEnd
      ? { start: report.periodStart, end: report.periodEnd }
      : monthWindowContaining(latestDaily ?? new Date().toISOString().slice(0, 10));
  const tracking = await getPeriodTracking(window.start, window.end);

  if (!report || report.kind !== "archive") {
    return (
      <section className="mx-auto flex max-w-4xl flex-col gap-6">
        <PeriodTrackingPanel title="本月追踪" metrics={tracking.metrics} tables={tracking.tables} />
        <WorkbenchPage
          eyebrow="Monthly review"
          title="Monthly"
          description="Read the monthly direction review and calibration signals."
          metrics={[
            { label: "Monthly reports", value: "0", detail: "Import state/monthly/*.md" },
            { label: "Signals", value: String(tracking.metrics.signalCount), detail: "In tracking window" },
            { label: "Focus alignment", value: "-", detail: "See Focus Rules" }
          ]}
          emptyState={{
            icon: CalendarDays,
            title: "No monthly report yet",
            description:
              "Place monthly automation markdown under state/monthly/ and run npm run import.",
            actions: [{ icon: CalendarDays, label: "Library / Reports", tone: "primary" }]
          }}
        />
      </section>
    );
  }

  const sections = parseMonthlyReportMarkdown(report.rawMarkdown);
  const title = displayMonthlyTitle(report.periodStart);
  const range = formatPeriodRange(report.periodStart, report.periodEnd);

  return (
    <section className="mx-auto flex max-w-4xl flex-col gap-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">Monthly review</p>
        <h2 className="mt-3 text-4xl font-semibold text-foreground">{title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {range}
          {range ? " · " : ""}
          <Link href="/library/reports" className="text-primary hover:underline">
            全部报告
          </Link>
        </p>
      </div>
      <PeriodTrackingPanel title="本月追踪" metrics={tracking.metrics} tables={tracking.tables} />
      <MonthlyReportView sections={sections} />
    </section>
  );
}
