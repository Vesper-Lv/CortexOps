export type FivePartSection = { key: string; label: string; content: string };
export type PracticeOption = {
  index: number;
  title: string;
  body: string;
  duration?: string;
  suggestedPool?: string;
};

const FIVE_PART_SECTIONS = [
  { key: "industry", label: "行业信号", aliases: ["行业信号", "产品 / 行业动态", "产品", "行业动态"] },
  { key: "engineering", label: "工程信号", aliases: ["工程信号", "GitHub / 工程信号", "GitHub"] },
  { key: "research", label: "研究信号", aliases: ["研究信号", "论文 / 研究信号", "论文"] },
  { key: "workflow", label: "工作流信号", aliases: ["工作流信号", "工具 / 工作流信号", "工具"] },
  { key: "risk", label: "风险提示", aliases: ["风险提示", "风险 / 限制 / 反例", "风险", "限制", "反例"] }
];

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractSection(markdown: string, sectionNumber: number): string {
  const start = markdown.match(new RegExp(`^##\\s*${sectionNumber}[.．][^\\n]*\\n?`, "m"));
  if (!start || start.index === undefined) return "";
  const bodyStart = start.index + start[0].length;
  const rest = markdown.slice(bodyStart);
  const next = rest.match(/^##\s+\S/m);
  return next?.index === undefined ? rest : rest.slice(0, next.index);
}

function findFivePartContent(block: string, aliases: string[]): string {
  const labelAlternation = aliases.map(escapeRegex).join("|");
  const allLabels = FIVE_PART_SECTIONS.flatMap((section) => section.aliases).map(escapeRegex).join("|");
  const re = new RegExp(
    `^\\s*\\*\\*\\s*(?:${labelAlternation})\\s*\\*\\*\\s*[：:]\\s*([\\s\\S]*?)(?=^\\s*\\*\\*\\s*(?:${allLabels})\\s*\\*\\*\\s*[：:]|(?![\\s\\S]))`,
    "m"
  );
  return (block.match(re)?.[1] ?? "").trim();
}

export function parseDailyReportMarkdown(markdown: string): {
  fivePart: FivePartSection[];
  practices: PracticeOption[];
} {
  const fiveBlock = extractSection(markdown, 1);
  const practiceBlock = extractSection(markdown, 4);

  const fivePart = FIVE_PART_SECTIONS.map((section) => ({
    key: section.key,
    label: section.label,
    content: findFivePartContent(fiveBlock, section.aliases)
  }));

  const practices: PracticeOption[] = [];
  const lines = practiceBlock.split("\n").filter((l) => /^\d+\./.test(l.trim()));
  lines.forEach((line, index) => {
    const m = line.trim().match(/^\d+\.\s*\*\*(.+?)\*\*\s*[｜|]\s*(.+)$/);
    if (!m) return;
    practices.push({ index, title: m[1].trim(), body: m[2].trim() });
  });

  return { fivePart, practices };
}
