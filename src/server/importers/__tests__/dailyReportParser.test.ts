import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { parseDailyReportMarkdown } from "@/server/importers/dailyReportParser";

describe("parseDailyReportMarkdown", () => {
  it("parses five-part sections and three practices from sample report", () => {
    const md = readFileSync("state/daily/2026-07-02-report.md", "utf8");
    const parsed = parseDailyReportMarkdown(md);
    expect(parsed.fivePart).toHaveLength(5);
    expect(parsed.fivePart[0].label).toContain("产品");
    expect(parsed.practices).toHaveLength(3);
    expect(parsed.practices[0].title).toContain("正式推荐");
  });
});
