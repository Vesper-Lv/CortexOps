import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { WorkbenchPage } from "@/components/layout/workbench-page";
import { getLatestArchiveReport } from "@/server/services/reports";

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

  return (
    <section className="mx-auto flex max-w-4xl flex-col gap-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">Monthly review</p>
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
