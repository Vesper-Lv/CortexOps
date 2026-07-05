import type { LucideIcon } from "lucide-react";

type Metric = {
  label: string;
  value: string;
  detail: string;
};

type EmptyAction = {
  icon: LucideIcon;
  label: string;
  tone?: "primary" | "neutral";
};

type WorkbenchPageProps = {
  eyebrow: string;
  title: string;
  description: string;
  metrics: Metric[];
  emptyState: {
    icon: LucideIcon;
    title: string;
    description: string;
    actions: EmptyAction[];
  };
};

export function WorkbenchPage({
  eyebrow,
  title,
  description,
  metrics,
  emptyState
}: WorkbenchPageProps) {
  const EmptyIcon = emptyState.icon;

  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div className="max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">
          {eyebrow}
        </p>
        <h2 className="mt-3 text-4xl font-semibold tracking-normal text-foreground">
          {title}
        </h2>
        <p className="mt-3 text-base leading-7 text-muted-foreground">{description}</p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className="rounded-md border border-border bg-surface p-4 text-surface-foreground"
          >
            <p className="text-sm text-muted-foreground">{metric.label}</p>
            <p className="mt-2 text-3xl font-semibold">{metric.value}</p>
            <p className="mt-1 text-sm text-muted-foreground">{metric.detail}</p>
          </div>
        ))}
      </div>

      <div className="rounded-md border border-dashed border-border bg-surface p-8">
        <div className="flex max-w-3xl flex-col gap-4">
          <EmptyIcon className="h-8 w-8 text-primary" />
          <div>
            <h3 className="text-xl font-semibold text-surface-foreground">
              {emptyState.title}
            </h3>
            <p className="mt-2 text-base leading-7 text-muted-foreground">
              {emptyState.description}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {emptyState.actions.map((action) => (
              <span
                key={action.label}
                className={
                  action.tone === "primary"
                    ? "inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
                    : "inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium text-muted-foreground"
                }
              >
                <action.icon className="h-4 w-4" />
                {action.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
