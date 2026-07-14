const CN_ORDINALS = ["一", "二", "三", "四", "五", "六"];

export type ArchiveReportRef = {
  id: string;
  reportType: string;
  periodStart: string | null;
  periodEnd: string | null;
};

export function formatPeriodRange(start: string | null, end: string | null): string {
  if (!start) return "";
  return end ? `${start} → ${end}` : start;
}

export function monthKeyFromPeriod(periodStart: string | null): string {
  if (!periodStart || periodStart.length < 7) return "unknown";
  return periodStart.slice(0, 7);
}

export function monthLabelFromKey(monthKey: string): string {
  const m = monthKey.match(/^(\d{4})-(\d{2})$/);
  if (!m) return monthKey;
  return `${m[1]}年${Number(m[2])}月`;
}

/** 1-based ordinal of this weekly report within its calendar month (by periodStart asc). */
export function weekOrdinalInMonth(
  report: ArchiveReportRef,
  peersInSameMonth: ArchiveReportRef[]
): number {
  const sorted = [...peersInSameMonth].sort((a, b) =>
    (a.periodStart ?? "").localeCompare(b.periodStart ?? "")
  );
  const idx = sorted.findIndex((r) => r.id === report.id);
  return idx >= 0 ? idx + 1 : 1;
}

export function displayWeeklyTitle(ordinal: number): string {
  const label = CN_ORDINALS[ordinal - 1] ?? String(ordinal);
  return `第${label}周执行周报`;
}

export function displayMonthlyTitle(periodStart: string | null): string {
  if (!periodStart || periodStart.length < 7) return "月度复盘报告";
  const month = Number(periodStart.slice(5, 7));
  return `${month}月度复盘报告`;
}

export function displayArchiveTitle(
  report: ArchiveReportRef,
  weeklyPeers: ArchiveReportRef[] = []
): string {
  if (report.reportType === "monthly") {
    return displayMonthlyTitle(report.periodStart);
  }
  if (report.reportType === "weekly") {
    const month = monthKeyFromPeriod(report.periodStart);
    const peers = weeklyPeers.filter((r) => monthKeyFromPeriod(r.periodStart) === month);
    return displayWeeklyTitle(weekOrdinalInMonth(report, peers.length ? peers : [report]));
  }
  return "报告";
}
