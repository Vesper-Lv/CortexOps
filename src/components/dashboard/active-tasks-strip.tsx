import Link from "next/link";
import type { TaskItem } from "@/shared/tasks";

export function ActiveTasksStrip({ tasks }: { tasks: TaskItem[] }) {
  if (tasks.length === 0) return null;

  return (
    <section className="rounded-md border border-border bg-muted/30 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground">进行中任务</h3>
        <Link href="/dashboard/tasks" className="text-xs font-medium text-primary hover:underline">
          查看全部 →
        </Link>
      </div>
      <ul className="mt-2 flex flex-col gap-1">
        {tasks.map((t) => (
          <li key={t.id} className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-foreground">{t.title}</span>
            <span className="rounded bg-muted px-2 py-0.5 text-xs capitalize text-muted-foreground">
              {t.status.replace(/_/g, " ")}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
