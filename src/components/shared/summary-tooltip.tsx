export function SummaryTooltip({ summary }: { summary: string }) {
  if (!summary.trim()) return null;

  return (
    <span className="group relative inline-flex">
      <span className="rounded border border-border px-1.5 py-0.5 text-xs text-muted-foreground">
        摘要
      </span>
      <span className="pointer-events-none absolute left-0 top-full z-20 mt-2 hidden w-64 rounded-md border border-border bg-surface p-3 text-xs leading-5 text-foreground shadow-lg group-hover:block">
        {summary}
      </span>
    </span>
  );
}
