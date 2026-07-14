"use client";

import Link from "next/link";
import type { Route } from "next";
import type { DailyReportListItem, ArchiveReportListItem } from "@/server/services/reports";
import type { ContentTagSearchResult } from "@/server/services/contentTags";
import { ReportTagSearch } from "@/components/library/report-tag-search";
import {
  displayMonthlyTitle,
  displayWeeklyTitle,
  formatPeriodRange,
  monthKeyFromPeriod,
  monthLabelFromKey,
  weekOrdinalInMonth,
  type ArchiveReportRef
} from "@/shared/reportDisplay";

function toRef(r: ArchiveReportListItem): ArchiveReportRef {
  return {
    id: r.id,
    reportType: r.reportType,
    periodStart: r.periodStart,
    periodEnd: r.periodEnd
  };
}

function groupWeeklyByMonth(weekly: ArchiveReportListItem[]): { monthKey: string; items: ArchiveReportListItem[] }[] {
  const map = new Map<string, ArchiveReportListItem[]>();
  for (const r of weekly) {
    const key = monthKeyFromPeriod(r.periodStart);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(r);
  }
  return [...map.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([monthKey, items]) => ({
      monthKey,
      items: [...items].sort((a, b) => (a.periodStart ?? "").localeCompare(b.periodStart ?? ""))
    }));
}

export function ReportLibrary({
  dailyReports,
  archiveReports,
  vocabulary,
  activeTag,
  searchResult
}: {
  dailyReports: DailyReportListItem[];
  archiveReports: ArchiveReportListItem[];
  vocabulary: string[];
  activeTag: string | null;
  searchResult: ContentTagSearchResult | null;
}) {
  if (dailyReports.length === 0 && archiveReports.length === 0 && !activeTag) {
    return (
      <p className="text-sm text-muted-foreground">
        暂无导入报告。运行 <code className="text-xs">npm run import</code> 加载 state/daily 与 weekly/monthly 输出。
      </p>
    );
  }

  const tagDates = searchResult ? new Set(searchResult.dates) : null;
  const filteredDaily =
    tagDates != null ? dailyReports.filter((r) => tagDates.has(r.date)) : dailyReports;

  const weekly = archiveReports.filter((r) => r.reportType === "weekly");
  const monthly = archiveReports.filter((r) => r.reportType === "monthly");
  const weeklyGroups = groupWeeklyByMonth(weekly);
  const weeklyRefs = weekly.map(toRef);

  return (
    <div className="flex flex-col gap-8">
      <ReportTagSearch
        vocabulary={vocabulary}
        activeTag={activeTag}
        searchResult={searchResult}
      />

      {filteredDaily.length > 0 && (
        <section>
          <h3 className="mb-3 text-lg font-semibold text-foreground">Daily reports</h3>
          <ul className="flex flex-col gap-2">
            {filteredDaily.map((r) => (
              <li
                key={r.date}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm"
              >
                <div>
                  <Link
                    href={`/library/reports/${r.date}` as "/library/reports"}
                    className="font-medium text-foreground hover:underline"
                  >
                    {r.date}
                  </Link>
                  <span className="ml-2 text-xs text-muted-foreground">
                    {r.sectionCount} sections · {r.practiceCount} practices
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {activeTag && filteredDaily.length === 0 && (
        <p className="text-sm text-muted-foreground">没有匹配标签的 Daily 报告。</p>
      )}

      {!activeTag && weekly.length > 0 && (
        <section>
          <h3 className="mb-3 text-lg font-semibold text-foreground">Weekly Report</h3>
          <div className="flex flex-col gap-5">
            {weeklyGroups.map(({ monthKey, items }) => (
              <div key={monthKey}>
                <h4 className="mb-2 text-sm font-medium text-muted-foreground">{monthLabelFromKey(monthKey)}</h4>
                <ul className="flex flex-col gap-2">
                  {items.map((r) => {
                    const ordinal = weekOrdinalInMonth(
                      toRef(r),
                      weeklyRefs.filter((p) => monthKeyFromPeriod(p.periodStart) === monthKey)
                    );
                    const range = formatPeriodRange(r.periodStart, r.periodEnd);
                    return (
                      <li
                        key={r.id}
                        className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm"
                      >
                        <Link
                          href={`/library/reports/archive/${r.id}` as Route}
                          className="font-medium text-foreground hover:underline"
                        >
                          {displayWeeklyTitle(ordinal)}
                        </Link>
                        {range && <span className="text-xs text-muted-foreground">{range}</span>}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      {!activeTag && monthly.length > 0 && (
        <section>
          <h3 className="mb-3 text-lg font-semibold text-foreground">Monthly Report</h3>
          <ul className="flex flex-col gap-2">
            {[...monthly]
              .sort((a, b) => (b.periodStart ?? "").localeCompare(a.periodStart ?? ""))
              .map((r) => (
                <li
                  key={r.id}
                  className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm"
                >
                  <Link
                    href={`/library/reports/archive/${r.id}` as Route}
                    className="font-medium text-foreground hover:underline"
                  >
                    {displayMonthlyTitle(r.periodStart)}
                  </Link>
                  {r.periodStart && (
                    <span className="text-xs text-muted-foreground">{r.periodStart}</span>
                  )}
                </li>
              ))}
          </ul>
        </section>
      )}
    </div>
  );
}
