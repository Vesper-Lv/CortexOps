import { FileText } from "lucide-react";
import { ReportLibrary } from "@/components/library/report-library";
import { listArchiveReports, listDailyReports } from "@/server/services/reports";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const [dailyReports, archiveReports] = await Promise.all([
    listDailyReports(),
    listArchiveReports()
  ]);

  const hasData = dailyReports.length > 0 || archiveReports.length > 0;

  return (
    <section className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">Report library</p>
        <h2 className="mt-3 text-4xl font-semibold text-foreground">Reports</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          浏览已导入的 daily / weekly / monthly 报告。Daily 结构化视图见 Dashboard/Today。
        </p>
      </div>

      {!hasData ? (
        <div className="rounded-md border border-dashed border-border bg-muted/30 px-4 py-8 text-center">
          <FileText className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">
            运行 <code className="text-xs">npm run import</code> 导入 state/daily 与 state/weekly|monthly 输出。
          </p>
        </div>
      ) : (
        <ReportLibrary dailyReports={dailyReports} archiveReports={archiveReports} />
      )}
    </section>
  );
}
