export type FivePartSection = { key: string; label: string; content: string };
export type PracticeOption = {
  index: number;
  title: string;
  body: string;
  duration?: string;
  suggestedPool?: string;
};

const FIVE_PART_LABELS = [
  "产品 / 行业动态",
  "GitHub / 工程信号",
  "论文 / 研究信号",
  "工具 / 工作流信号",
  "风险 / 限制 / 反例"
];

export function parseDailyReportMarkdown(markdown: string): {
  fivePart: FivePartSection[];
  practices: PracticeOption[];
} {
  const fiveBlock = markdown.match(/## 1\. 五段式日报([\s\S]*?)(?=## 2\.)/)?.[1] ?? "";
  const practiceBlock = markdown.match(/## 4\. 今日练习三选一([\s\S]*)$/)?.[1] ?? "";

  const fivePart = FIVE_PART_LABELS.map((label) => {
    const re = new RegExp(`\\*\\*${label.replace(/[/.]/g, "\\$&")}\\*\\*：([\\s\\S]*?)(?=\\*\\*|$)`);
    const m = fiveBlock.match(re);
    return { key: label, label, content: (m?.[1] ?? "").trim() };
  });

  const practices: PracticeOption[] = [];
  const lines = practiceBlock.split("\n").filter((l) => /^\d+\./.test(l.trim()));
  lines.forEach((line, index) => {
    const m = line.match(/^\d+\.\s*\*\*(.+?)\*\*｜(.+)$/);
    if (!m) return;
    practices.push({ index, title: m[1].trim(), body: m[2].trim() });
  });

  return { fivePart, practices };
}
