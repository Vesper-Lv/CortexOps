export type FivePartSection = { key: string; label: string; content: string };
export type PracticeOption = {
  index: number;
  title: string;
  body: string;
  duration?: string;
  suggestedPool?: string;
};

const FIVE_PART_SECTIONS = [
  {
    key: "industry",
    label: "行业信号",
    aliases: ["行业信号", "产品 / 行业动态", "产品", "行业动态", "行业"]
  },
  {
    key: "engineering",
    label: "工程信号",
    aliases: ["工程信号", "GitHub / 工程信号", "GitHub", "工程"]
  },
  {
    key: "research",
    label: "研究信号",
    aliases: ["研究信号", "论文 / 研究信号", "论文", "研究"]
  },
  {
    key: "workflow",
    label: "工作流信号",
    aliases: ["工作流信号", "工具 / 工作流信号", "工具", "工作流"]
  },
  {
    key: "risk",
    label: "风险提示",
    aliases: ["风险提示", "风险 / 限制 / 反例", "风险", "限制", "反例"]
  }
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
  // Colon may sit outside bold (**标签**：) or inside (**标签：**)
  const re = new RegExp(
    `^\\s*\\*\\*\\s*(?:${labelAlternation})\\s*(?:\\*\\*\\s*[：:]|[：:]\\s*\\*\\*)\\s*([\\s\\S]*?)(?=^\\s*\\*\\*\\s*(?:${allLabels})\\s*(?:\\*\\*\\s*[：:]|[：:]\\s*\\*\\*)|(?![\\s\\S]))`,
    "m"
  );
  return (block.match(re)?.[1] ?? "").trim();
}

function parsePracticeLines(practiceBlock: string): PracticeOption[] {
  const practices: PracticeOption[] = [];
  const lines = practiceBlock.split("\n");

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]?.trim() ?? "";
    if (!/^\d+\./.test(line)) continue;

    const pipe = line.match(/^\d+\.\s*\*\*(.+?)\*\*\s*[｜|]\s*(.+)$/);
    if (pipe) {
      practices.push({ index: practices.length, title: pipe[1].trim(), body: pipe[2].trim() });
      continue;
    }

    const colon = line.match(/^\d+\.\s*\*\*(.+?)\*\*\s*[：:]\s*(.+)$/);
    if (colon) {
      practices.push({ index: practices.length, title: colon[1].trim(), body: colon[2].trim() });
      continue;
    }

    const titleOnly = line.match(/^\d+\.\s*\*\*(.+?)\*\*\s*$/);
    if (titleOnly) {
      const bodyParts: string[] = [];
      let j = i + 1;
      while (j < lines.length) {
        const next = lines[j] ?? "";
        if (/^\d+\./.test(next.trim()) || /^##\s+\S/.test(next.trim())) break;
        if (next.trim()) bodyParts.push(next.trim());
        j += 1;
      }
      practices.push({
        index: practices.length,
        title: titleOnly[1].trim(),
        body: bodyParts.join(" ").trim() || titleOnly[1].trim()
      });
      continue;
    }
  }

  return practices;
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

  return { fivePart, practices: parsePracticeLines(practiceBlock) };
}
