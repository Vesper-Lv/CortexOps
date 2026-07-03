import Link from "next/link";
import type { PendingBacklogSignal } from "@/shared/inboxTypes";

export function PendingBacklogList({ signals }: { signals: PendingBacklogSignal[] }) {
  if (signals.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
        无非今日待分拣信号。当日待分拣请去{" "}
        <Link href="/inbox/today" className="font-medium text-primary hover:underline">
          Inbox/Today
        </Link>
        。
      </p>
    );
  }

  return (
    <section className="flex flex-col gap-3">
      <div>
        <h3 className="text-sm font-semibold text-foreground">待分拣 backlog（非今日）</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          {signals.length} 条历史 pending 信号 · 当日信号在 Inbox/Today 分拣
        </p>
      </div>
      <ul className="flex flex-col gap-2">
        {signals.map((s) => (
          <li key={s.id} className="rounded-md border border-border bg-surface p-3 text-sm">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {s.date && <span>{s.date}</span>}
              {s.priority && (
                <span className="rounded bg-muted px-2 py-0.5">{s.priority}</span>
              )}
              <span className="rounded bg-muted px-2 py-0.5">pending</span>
              {s.suggestedPool && (
                <span className="rounded bg-muted px-2 py-0.5">{s.suggestedPool}</span>
              )}
            </div>
            <a
              href={s.url}
              target="_blank"
              rel="noreferrer"
              className="mt-1 block font-medium text-foreground hover:underline"
            >
              {s.title}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
