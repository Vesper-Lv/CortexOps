import Link from "next/link";
import type { Route } from "next";
import { Inbox } from "lucide-react";
import { WorkbenchPage } from "@/components/layout/workbench-page";
import { SignalCard } from "@/components/inbox/signal-card";
import { FinalizeAllToolbar } from "@/components/inbox/finalize-all-toolbar";
import { getInboxToday } from "@/server/services/inboxView";
import { getLatestDailyDate } from "@/server/services/dailyView";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ date?: string }>;
};

export default async function InboxTodayPage({ searchParams }: PageProps) {
  const { date: dateParam } = await searchParams;
  const data = await getInboxToday(dateParam);
  const latestDate = await getLatestDailyDate();

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
          title: dateParam ? `No signals for ${dateParam}` : "No signals to triage",
          description: dateParam
            ? "Try another date or import daily state (npm run import)."
            : "Import daily state (npm run import) to start triaging today's signals.",
          actions: [{ icon: Inbox, label: "Import pipeline", tone: "primary" }]
        }}
      />
    );
  }

  const inPack = data.signals.filter((s) => s.readingPackStatus === "selected").length;
  const isHistorical = latestDate && data.date !== latestDate;

  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">Daily triage</p>
          <h2 className="mt-3 text-4xl font-semibold text-foreground">Today · {data.date}</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            改池 / 优先级 / 阅读包为草稿编辑；点「确定」后进入 Pools。Pending {data.signals.length} · In
            pack {inPack}
            {isHistorical && latestDate ? (
              <>
                {" "}
                ·{" "}
                <Link href="/inbox/today" className="font-medium text-primary hover:underline">
                  回到最新 {latestDate}
                </Link>
              </>
            ) : null}
          </p>
        </div>
        {data.signals.length > 0 && <FinalizeAllToolbar date={data.date} />}
      </div>
      {data.signals.length === 0 ? (
        <p className="rounded-md border border-dashed border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          当日无待分拣信号。已全部确定或尚未导入。
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {data.signals.map((s) => (
            <SignalCard key={s.id} signal={s} />
          ))}
        </ul>
      )}
    </section>
  );
}
