import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { MonthlyReportView } from "@/components/dashboard/monthly-report-view";
import { WorkbenchPage } from "@/components/layout/workbench-page";
import { parseMonthlyReportMarkdown } from "@/server/importers/monthlyReportParser";
import { getLatestArchiveReport } from "@/server/services/reports";
import { displayMonthlyTitle, formatPeriodRange } from "@/shared/reportDisplay";

export const dynamic = "force-dynamic";

export default async function MonthlyPage() {
  const report = await getLatestArchiveReport("monthly");

  if (!report || report.kind !== "archive") {
    return (
      <WorkbenchPage
        eyebrow="Monthly review"
        title="Monthly"
        description="Read the monthly direction review and calibration signals."
        metrics={[
          { label: "Monthly reports", value: "0", detail: "Import state/monthly/*.md" },
          { label: "Themes", value: "-", detail: "No active month" },
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
      <MonthlyReportView sections={sections} />
    </section>
  );
}
