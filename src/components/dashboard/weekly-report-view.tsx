import { MarkdownBody } from "@/components/shared/markdown-body";
import type { ReportSection } from "@/server/importers/weeklyReportParser";

export function WeeklyReportView({ sections }: { sections: ReportSection[] }) {
  if (sections.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
        周报暂无结构化章节。
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {sections.map((section) => (
        <section key={section.title} className="rounded-md border border-border bg-surface p-4">
          <h3 className="text-base font-semibold text-foreground">{section.title}</h3>
          <MarkdownBody className="mt-2" markdown={section.content} />
        </section>
      ))}
    </div>
  );
}
