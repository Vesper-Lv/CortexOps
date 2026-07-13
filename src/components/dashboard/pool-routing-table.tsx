import Link from "next/link";
import type { SignalView } from "@/server/services/dailyView";

export function PoolRoutingTable({ signals }: { signals: SignalView[] }) {
  if (signals.length === 0) return null;

  return (
    <section>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <h3 className="text-xl font-semibold text-foreground">候选池路由一览</h3>
        <Link href="/inbox/today" className="text-sm font-medium text-primary hover:underline">
          在 Inbox 确认/改池 →
        </Link>
      </div>
      <div className="overflow-x-auto rounded-md border border-border">
        <table className="min-w-full text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2">优先级</th>
              <th className="px-3 py-2">建议池</th>
              <th className="px-3 py-2">标题</th>
            </tr>
          </thead>
          <tbody>
            {signals.map((s, idx) => (
              <tr key={s.id ?? idx} className="border-t border-border">
                <td className="px-3 py-2 whitespace-nowrap">{s.priority || "—"}</td>
                <td className="px-3 py-2 whitespace-nowrap">{s.pool || "—"}</td>
                <td className="px-3 py-2">
                  <a href={s.url} target="_blank" rel="noreferrer" className="hover:underline">
                    {s.title}
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
