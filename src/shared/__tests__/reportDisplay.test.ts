import { describe, expect, it } from "vitest";
import {
  displayArchiveTitle,
  displayMonthlyTitle,
  displayWeeklyTitle,
  formatPeriodRange,
  weekOrdinalInMonth
} from "@/shared/reportDisplay";

describe("reportDisplay", () => {
  it("numbers weekly reports within a month by periodStart", () => {
    const peers = [
      { id: "b", reportType: "weekly", periodStart: "2026-07-12", periodEnd: "2026-07-18" },
      { id: "a", reportType: "weekly", periodStart: "2026-07-05", periodEnd: "2026-07-11" },
      { id: "c", reportType: "weekly", periodStart: "2026-07-19", periodEnd: "2026-07-25" }
    ];
    expect(weekOrdinalInMonth(peers[1]!, peers)).toBe(1);
    expect(weekOrdinalInMonth(peers[0]!, peers)).toBe(2);
    expect(weekOrdinalInMonth(peers[2]!, peers)).toBe(3);
    expect(displayWeeklyTitle(1)).toBe("第一周执行周报");
    expect(displayWeeklyTitle(2)).toBe("第二周执行周报");
  });

  it("formats monthly titles and ranges", () => {
    expect(displayMonthlyTitle("2026-07-01")).toBe("7月度复盘报告");
    expect(formatPeriodRange("2026-07-05", "2026-07-11")).toBe("2026-07-05 → 2026-07-11");
    expect(
      displayArchiveTitle({
        id: "m1",
        reportType: "monthly",
        periodStart: "2026-07-01",
        periodEnd: null
      })
    ).toBe("7月度复盘报告");
  });
});
