import Link from "next/link";
import type { DailyReportListItem, ArchiveReportListItem } from "@/server/services/reports";

export function ReportLibrary({
  dailyReports,
  archiveReports
}: {
  dailyReports: DailyReportListItem[];
  archiveReports: ArchiveReportListItem[];
}) {
  if (dailyReports.length === 0 && archiveReports.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        暂无导入报告。运行 <code className="text-xs">npm run import</code> 加载 state/daily 与 weekly/monthly 输出。
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {dailyReports.length > 0 && (
        <section>
          <h3 className="mb-3 text-lg font-semibold text-foreground">Daily reports</h3>
          <ul className="flex flex-col gap-2">
            {dailyReports.map((r) => (
              <li key={r.date} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm">
                <div>
                  <span className="font-medium">{r.date}</span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    {r.sectionCount} sections · {r.practiceCount} practices
                  </span>
                </div>
                <div className="flex gap-2">
                  <Link href={`/dashboard/today`} className="text-xs font-medium text-primary hover:underline">
                    打开 Today 视图
                  </Link>
                  <Link
                    href={`/library/reports/${r.date}` as "/library/reports"}
                    className="text-xs text-muted-foreground hover:underline"
                  >
                    详情
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {archiveReports.length > 0 && (
        <section>
          <h3 className="mb-3 text-lg font-semibold text-foreground">Weekly / Monthly / Other</h3>
          <ul className="flex flex-col gap-2">
            {archiveReports.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm">
                <div>
                  <span className="font-medium">{r.title}</span>
                  <span className="ml-2 text-xs capitalize text-muted-foreground">{r.reportType}</span>
                  {r.periodStart && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      {r.periodStart}
                      {r.periodEnd ? ` → ${r.periodEnd}` : ""}
                    </span>
                  )}
                </div>
                <Link
                  href={`/library/reports/archive/${r.id}` as "/library/reports"}
                  className="text-xs font-medium text-primary hover:underline"
                >
                  阅读
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
