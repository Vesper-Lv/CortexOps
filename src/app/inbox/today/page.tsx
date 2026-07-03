import { Inbox } from "lucide-react";
import { WorkbenchPage } from "@/components/layout/workbench-page";
import { SignalRow } from "@/components/inbox/signal-row";
import { getInboxToday } from "@/server/services/inboxView";

export const dynamic = "force-dynamic";

export default async function InboxTodayPage() {
  const data = await getInboxToday();

  if (!data) {
    return (
      <WorkbenchPage
        eyebrow="Daily triage"
        title="Today"
        description="Route today's signals into candidate pools and toggle reading-pack membership. Changes flow to Dashboard."
        metrics={[
          { label: "Signals", value: "-", detail: "Run npm run import" },
          { label: "Pending", value: "-", detail: "—" },
          { label: "In pack", value: "-", detail: "—" }
        ]}
        emptyState={{
          icon: Inbox,
          title: "No signals to triage",
          description: "Import daily state (npm run import) to start triaging today's signals.",
          actions: [{ icon: Inbox, label: "Import pipeline", tone: "primary" }]
        }}
      />
    );
  }

  const pending = data.signals.filter((s) => s.humanStatus === "pending").length;
  const inPack = data.signals.filter((s) => s.readingPackStatus === "selected").length;

  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">Daily triage</p>
        <h2 className="mt-3 text-4xl font-semibold text-foreground">Today · {data.date}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          归池 / 确认 / 拒绝 / 切换阅读包；变更即时反映到 Dashboard。Pending {pending} · In pack{" "}
          {inPack}
        </p>
      </div>
      <ul className="flex flex-col gap-3">
        {data.signals.map((s) => (
          <SignalRow key={s.id} signal={s} />
        ))}
      </ul>
    </section>
  );
}
