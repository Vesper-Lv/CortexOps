import type { FivePartSection } from "@/server/importers/dailyReportParser";

export function FivePartSummary({ sections }: { sections: FivePartSection[] }) {
  const hasContent = sections.some((section) => section.content.trim().length > 0);

  if (!hasContent) {
    return (
      <p className="rounded-md border border-dashed border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
        五段式日报暂无结构化内容。
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {sections.map((section) => (
        <div key={section.key} className="rounded-md border border-border bg-surface p-4">
          <h4 className="text-sm font-semibold text-foreground">{section.label}</h4>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{section.content}</p>
        </div>
      ))}
    </div>
  );
}
