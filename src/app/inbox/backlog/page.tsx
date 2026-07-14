import Link from "next/link";
import { Inbox } from "lucide-react";
import { WorkbenchPage } from "@/components/layout/workbench-page";
import { FinalizeAllToolbar } from "@/components/inbox/finalize-all-toolbar";
import { SignalCard } from "@/components/inbox/signal-card";
import { getPendingBacklogInboxGroups } from "@/server/services/inboxView";

export const dynamic = "force-dynamic";

export default async function InboxBacklogPage() {
  const groups = await getPendingBacklogInboxGroups();
  const total = groups.reduce((n, g) => n + g.signals.length, 0);

  if (total === 0) {
    return (
      <WorkbenchPage
        eyebrow="Historical triage"
        title="Backlog"
        description="Non-today pending signals wait here so they are not lost outside Candidate Pools."
        metrics={[
          { label: "Pending", value: "0", detail: "No historical backlog" },
          { label: "Days", value: "0", detail: "—" },
          { label: "Today", value: "→", detail: "Inbox/Today" }
        ]}
        emptyState={{
          icon: Inbox,
          title: "Backlog 为空",
          description: "非今日 pending 信号会汇集在此。当日分拣请使用 Inbox/Today。",
          actions: [{ icon: Inbox, label: "Inbox / Today", tone: "primary" }]
        }}
      />
    );
  }

  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">Historical triage</p>
        <h2 className="mt-3 text-4xl font-semibold text-foreground">Backlog</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {total} 条非今日 pending · 可在此改优先级 / 归池 / 确定，避免只在 Pools 改动后遗忘。{" "}
          <Link href="/inbox/today" className="font-medium text-primary hover:underline">
            今日分拣 →
          </Link>
        </p>
      </div>

      {groups.map((group) => (
        <section key={group.date} className="flex flex-col gap-3">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <h3 className="text-lg font-semibold text-foreground">{group.date}</h3>
            <FinalizeAllToolbar date={group.date} />
          </div>
          <ul className="flex flex-col gap-3">
            {group.signals.map((signal) => (
              <SignalCard key={signal.id} signal={signal} />
            ))}
          </ul>
        </section>
      ))}
    </section>
  );
}
