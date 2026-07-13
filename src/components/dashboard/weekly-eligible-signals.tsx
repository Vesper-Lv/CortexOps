import Link from "next/link";
import type { WeeklyEligibleSignal } from "@/server/services/weeklyReview";

export function WeeklyEligibleSignals({ signals }: { signals: WeeklyEligibleSignal[] }) {
  if (signals.length === 0) {
    return (
      <section className="rounded-md border border-border bg-muted/20 px-4 py-3">
        <h3 className="text-sm font-semibold text-foreground">下游可消费信号</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          暂无已分拣且未丢弃的信号。完成 Inbox 分拣后，符合条件的条目会出现在此列表，供周报/自动化消费。
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-md border border-border bg-muted/20 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground">
          下游可消费信号
          <span className="ml-2 font-normal text-muted-foreground">({signals.length})</span>
        </h3>
        <Link href="/inbox/pools" className="text-xs font-medium text-primary hover:underline">
          查看 Pools →
        </Link>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        已确认/已改池、未丢弃 — 符合 weekly/monthly 自动化输入条件。
      </p>
      <ul className="mt-3 flex max-h-64 flex-col gap-2 overflow-y-auto">
        {signals.slice(0, 30).map((s) => (
          <li key={s.id} className="flex flex-wrap items-center gap-2 text-sm">
            {s.url ? (
              <a
                href={s.url}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-primary hover:underline"
              >
                {s.title ?? "(untitled)"}
              </a>
            ) : (
              <span className="font-medium text-foreground">{s.title ?? "(untitled)"}</span>
            )}
            {s.date ? (
              <span className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">{s.date}</span>
            ) : null}
            {s.priority ? (
              <span className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">{s.priority}</span>
            ) : null}
            {s.finalPool ? (
              <span className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">{s.finalPool}</span>
            ) : null}
          </li>
        ))}
      </ul>
      {signals.length > 30 ? (
        <p className="mt-2 text-xs text-muted-foreground">… 另有 {signals.length - 30} 条未显示</p>
      ) : null}
    </section>
  );
}
