import { describe, expect, it } from "vitest";
import { parseMonthlyReportMarkdown } from "@/server/importers/monthlyReportParser";

describe("parseMonthlyReportMarkdown", () => {
  it("parses level-two markdown headings into sections", () => {
    const parsed = parseMonthlyReportMarkdown(`# Monthly

## 方向校准
保持主线。

## 风险与反例
- 风险 A
- 风险 B
`);

    expect(parsed).toEqual([
      { title: "方向校准", content: "保持主线。" },
      { title: "风险与反例", content: "- 风险 A\n- 风险 B" }
    ]);
  });
});
