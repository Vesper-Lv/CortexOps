import { describe, expect, it } from "vitest";
import { parseWeeklyReportMarkdown } from "@/server/importers/weeklyReportParser";

describe("parseWeeklyReportMarkdown", () => {
  it("parses level-two markdown headings into sections", () => {
    const parsed = parseWeeklyReportMarkdown(`# Weekly

Intro text before sections.

## 1. 本周执行复盘
完成了 A。

### 细节
- nested heading remains in content

## 2. 下周重点
推进 B。
`);

    expect(parsed).toEqual([
      {
        title: "1. 本周执行复盘",
        content: "完成了 A。\n\n### 细节\n- nested heading remains in content"
      },
      {
        title: "2. 下周重点",
        content: "推进 B。"
      }
    ]);
  });
});
