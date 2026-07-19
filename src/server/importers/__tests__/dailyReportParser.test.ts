import { describe, expect, it } from "vitest";
import { parseDailyReportMarkdown } from "@/server/importers/dailyReportParser";

// Inline fixture replaces the old readFileSync("state/daily/2026-07-02-report.md").
// The report file has moved to state/daily/backups; tests must not depend on disk layout.
const SAMPLE_REPORT = `# 今日 AI PM 行业雷达

## 1. 五段式日报

**产品 / 行业动态**：企业 AI 从"能不能用最强模型"转向"能不能承担最强模型"。

**GitHub / 工程信号**：AI 工程实践正在从"让模型写代码"走向"给 agent 提供可验证任务"。

**论文 / 研究信号**：RLI 和 Senior SWE-Bench 更接近现实工作质量评估。

**工具 / 工作流信号**：开发者工具正在围绕成本、访问控制、环境连接重组。

**风险 / 限制 / 反例**：RLI 仍只有 16.1% 专业自动化率，AI PM 不能只讲能力跃迁。

## 2. 今日 30mins 阅读包

- **P0 详细阅读**｜[花旗、Adobe等企业限制员工使用AI旗舰模型以控制成本](https://example.com/p0-1)

## 3. 未入选阅读包的剩余链接

- [browser-use 发布开源 AI 视频剪辑 Skill](https://example.com/remaining-1)

## 4. 今日练习三选一

1. **正式推荐：企业 AI 成本控制产品 memo**｜20-30 分钟。写一页产品 memo。
2. **备选：Senior SWE-Bench 评估拆解**｜30-45 分钟。画出差异表。
3. **备选：ghealth Agent-first CLI 复刻范围**｜30-45 分钟。拆出最小 API wrapper。
`;

describe("parseDailyReportMarkdown", () => {
  it("parses five-part sections and three practices from sample report", () => {
    const md = SAMPLE_REPORT;
    const parsed = parseDailyReportMarkdown(md);
    expect(parsed.fivePart).toHaveLength(5);
    expect(parsed.fivePart[0].label).toBe("行业信号");
    expect(parsed.practices).toHaveLength(3);
    expect(parsed.practices[0].title).toContain("正式推荐");
  });

  it("parses new labels without stopping at nested bold markers", () => {
    const md = `# Daily

## 1. 五段式日报

**行业信号**：
- OpenAI 发布新功能
  - nested **bold** marker should stay in 行业信号

**工程信号**：
工程内容

**研究信号**：
研究内容

**工作流信号**：
工作流内容

**风险提示**：
风险内容

## 2. 其他
`;

    const parsed = parseDailyReportMarkdown(md);

    expect(parsed.fivePart.map((s) => s.label)).toEqual([
      "行业信号",
      "工程信号",
      "研究信号",
      "工作流信号",
      "风险提示"
    ]);
    expect(parsed.fivePart[0]?.content).toContain("nested **bold** marker");
    expect(parsed.fivePart[0]?.content).not.toContain("工程内容");
  });

  it("maps old labels into new section labels", () => {
    const md = `## 1. 五段式日报
**产品 / 行业动态**：旧行业
**GitHub / 工程信号**：旧工程
**论文 / 研究信号**：旧研究
**工具 / 工作流信号**：旧工作流
**风险 / 限制 / 反例**：旧风险
## 2. End`;

    const parsed = parseDailyReportMarkdown(md);

    expect(parsed.fivePart.map((s) => [s.label, s.content])).toEqual([
      ["行业信号", "旧行业"],
      ["工程信号", "旧工程"],
      ["研究信号", "旧研究"],
      ["工作流信号", "旧工作流"],
      ["风险提示", "旧风险"]
    ]);
  });

  it("parses practice title variants and fullwidth or halfwidth separators", () => {
    const md = `## 1. 五段式日报

## 4. 练习三选一
1. **正式推荐**｜使用全角分隔
2. **备选练习** | 使用半角分隔
3. **第三项**｜继续练习
`;

    const parsed = parseDailyReportMarkdown(md);

    expect(parsed.practices).toEqual([
      { index: 0, title: "正式推荐", body: "使用全角分隔" },
      { index: 1, title: "备选练习", body: "使用半角分隔" },
      { index: 2, title: "第三项", body: "继续练习" }
    ]);
  });

  it("parses short aliases, colon-inside-bold, and multiline practices", () => {
    const md = `## 1. 五段式日报
采集状态：AIhot API 成功。

**行业：**行业短标签
**工程：**工程短标签
**研究：**研究短标签
**工作流：**工作流短标签
**风险：**风险短标签

## 4. 今日练习三选一
1. **正式推荐：企业 memo**
20-30 分钟。写一页产品 memo。
2. **备选：评估拆解**：直接跟在冒号后
3. **备选：CLI 复刻**｜半角或全角竖线
`;

    const parsed = parseDailyReportMarkdown(md);

    expect(parsed.fivePart.map((s) => [s.label, s.content])).toEqual([
      ["行业信号", "行业短标签"],
      ["工程信号", "工程短标签"],
      ["研究信号", "研究短标签"],
      ["工作流信号", "工作流短标签"],
      ["风险提示", "风险短标签"]
    ]);
    expect(parsed.practices).toHaveLength(3);
    expect(parsed.practices[0]?.body).toContain("产品 memo");
    expect(parsed.practices[1]?.body).toContain("直接跟在冒号后");
    expect(parsed.practices[2]?.title).toContain("CLI");
  });

  it("parses list-dash five-part labels used by some automation templates", () => {
    const md = `## 1. 五段式日报
- **行业信号**：行业内容
- **工程信号**：工程内容
- **研究信号**：研究内容
- **工作流信号**：工作流内容
- **风险提示**：风险内容
## 2. End`;

    const parsed = parseDailyReportMarkdown(md);
    expect(parsed.fivePart.map((s) => s.content)).toEqual([
      "行业内容",
      "工程内容",
      "研究内容",
      "工作流内容",
      "风险内容"
    ]);
  });
});
