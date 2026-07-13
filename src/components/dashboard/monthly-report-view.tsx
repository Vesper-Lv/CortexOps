import type { ReportSection } from "@/server/importers/weeklyReportParser";

export function MonthlyReportView({ sections }: { sections: ReportSection[] }) {
  if (sections.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
        月报暂无结构化章节。
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {sections.map((section) => (
        <section key={section.title} className="rounded-md border border-border bg-surface p-4">
          <h3 className="text-base font-semibold text-foreground">{section.title}</h3>
          <div className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
            {section.content}
          </div>
        </section>
      ))}
    </div>
  );
}
