export type ReportSection = {
  title: string;
  content: string;
};

export function parseWeeklyReportMarkdown(markdown: string): ReportSection[] {
  const sections: ReportSection[] = [];
  const headingRe = /^##\s+(.+)$/gm;
  const matches = [...markdown.matchAll(headingRe)];

  matches.forEach((match, index) => {
    if (match.index === undefined) return;
    const next = matches[index + 1];
    const contentStart = match.index + match[0].length;
    const contentEnd = next?.index ?? markdown.length;
    sections.push({
      title: match[1].trim(),
      content: markdown.slice(contentStart, contentEnd).trim()
    });
  });

  return sections;
}
