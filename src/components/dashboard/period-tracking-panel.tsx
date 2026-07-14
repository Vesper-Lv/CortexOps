import type { PeriodTrackingMetrics, PeriodTrackingTables } from "@/server/services/periodTracking";

export function PeriodTrackingPanel({
  title,
  metrics,
  tables
}: {
  title: string;
  metrics: PeriodTrackingMetrics;
  tables: PeriodTrackingTables;
}) {
  return (
    <section className="flex flex-col gap-4 rounded-md border border-border bg-muted/20 p-4">
      <div>
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          {metrics.periodStart} → {metrics.periodEnd}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-md border border-border bg-surface px-3 py-2">
          <p className="text-xs text-muted-foreground">历史信号</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{metrics.signalCount}</p>
        </div>
        <div className="rounded-md border border-border bg-surface px-3 py-2">
          <p className="text-xs text-muted-foreground">分拣</p>
          <p className="mt-1 text-sm tabular-nums text-foreground">
            pending {metrics.triage.pending} · confirmed {metrics.triage.confirmedOrChanged} · drop{" "}
            {metrics.triage.dropped}
          </p>
        </div>
        <div className="rounded-md border border-border bg-surface px-3 py-2">
          <p className="text-xs text-muted-foreground">转化</p>
          <p className="mt-1 text-sm tabular-nums text-foreground">
            Task {metrics.conversion.withTask} · Artifact {metrics.conversion.withArtifact}
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <TrackingTable
          heading="历史信号（抽样）"
          headers={["日期", "标题", "P", "状态", "池"]}
          rows={tables.signals.map((s) => [s.date, s.title, s.priority, s.humanStatus, s.pool])}
        />
        <TrackingTable
          heading="分拣统计"
          headers={["状态", "数量"]}
          rows={tables.triageRows.map((r) => [r.status, String(r.count)])}
        />
        <TrackingTable
          heading="转化明细"
          headers={["标题", "日期", "类型", "来源"]}
          rows={tables.conversionRows.map((r) => [r.title, r.date, r.kind, r.linkedFrom])}
        />
      </div>
    </section>
  );
}

function TrackingTable({
  heading,
  headers,
  rows
}: {
  heading: string;
  headers: string[];
  rows: string[][];
}) {
  return (
    <div className="overflow-hidden rounded-md border border-border bg-surface">
      <div className="border-b border-border px-3 py-2 text-xs font-semibold text-muted-foreground">
        {heading}
      </div>
      {rows.length === 0 ? (
        <p className="px-3 py-3 text-xs text-muted-foreground">暂无数据</p>
      ) : (
        <div className="max-h-56 overflow-auto">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-muted/50 text-muted-foreground">
              <tr>
                {headers.map((h) => (
                  <th key={h} className="px-2 py-1.5 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className="border-t border-border/70">
                  {row.map((cell, j) => (
                    <td key={j} className="max-w-[10rem] truncate px-2 py-1 text-foreground">
                      {cell || "—"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
