import Link from "next/link";
import type { SignalView } from "@/server/services/dailyView";

export function RemainingLinks({ items }: { items: SignalView[] }) {
  if (items.length === 0) return null;

  return (
    <section>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <h3 className="text-xl font-semibold text-foreground">剩余链接</h3>
        <Link href="/inbox/today" className="text-sm font-medium text-primary hover:underline">
          去 Inbox 分拣 →
        </Link>
      </div>
      <ul className="flex flex-col gap-2">
        {items.map((item, idx) => (
          <li key={item.id ?? idx} className="rounded-md border border-border bg-surface p-3 text-sm">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {item.priority && <span className="rounded bg-muted px-2 py-0.5">{item.priority}</span>}
              {item.pool && <span className="rounded bg-muted px-2 py-0.5">{item.pool}</span>}
            </div>
            <a
              href={item.url}
              target="_blank"
              rel="noreferrer"
              className="mt-1 block font-medium text-foreground hover:underline"
            >
              {item.title}
            </a>
            {item.summary && <p className="mt-1 text-muted-foreground">{item.summary}</p>}
          </li>
        ))}
      </ul>
    </section>
  );
}
