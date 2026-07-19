import Link from "next/link";
import { BookOpen, CheckCircle2, ListChecks } from "lucide-react";
import { WorkbenchPage } from "@/components/layout/workbench-page";
import { ActiveTasksStrip } from "@/components/dashboard/active-tasks-strip";
import { FivePartSummary } from "@/components/dashboard/five-part-summary";
import { PracticePicker } from "@/components/dashboard/practice-picker";
import { ReadingPack } from "@/components/dashboard/reading-pack";
import { RemainingLinks } from "@/components/dashboard/remaining-links";
import { getDailyPageData } from "@/server/services/dailyView";
import { getDailyReport } from "@/server/services/dailyReport";
import { listActiveTasks } from "@/server/services/tasks";
import { rankEngineeringPracticeItems } from "@/server/services/poolRanking";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ date?: string }>;
};

export default async function TodayPage({ searchParams }: PageProps) {
  const { date: dateParam } = await searchParams;
  const data = await getDailyPageData(dateParam);

  if (!data) {
    return (
      <WorkbenchPage
        eyebrow="Daily command center"
        title="Today"
        description="Read the latest radar, review the 30-minute pack, and choose one engineering practice."
        metrics={[
          { label: "Reading pack", value: "-", detail: "Run npm run import to load daily state" },
          { label: "Remaining links", value: "-", detail: "No active daily state" },
          { label: "Practice choice", value: "-", detail: "Not selected" }
        ]}
        emptyState={{
          icon: BookOpen,
          title: "No imported daily report yet",
          description:
            "Import state/daily/*-links.jsonl (npm run import), then this page renders the reading pack and remaining links.",
          actions: [
            { icon: ListChecks, label: "Import pipeline", tone: "primary" },
            { icon: CheckCircle2, label: "Codex automation remains source" }
          ]
        }}
      />
    );
  }

  const { date, view, remaining } = data;
  const practiceItems = await rankEngineeringPracticeItems(3);
  const [report, activeTasks] = await Promise.all([
    getDailyReport(date),
    listActiveTasks()
  ]);

  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div className="max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">Daily command center</p>
        <h2 className="mt-3 text-4xl font-semibold text-foreground">Today · {date}</h2>
      </div>

      <ActiveTasksStrip tasks={activeTasks} />

      <div className="rounded-md border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
        AI 已选 {view.selectedCount} 条进入阅读包 · 另有 {view.remainingCount} 条待归类 →{" "}
        <Link href="/inbox/today" className="font-medium text-primary hover:underline">
          去 Inbox 分拣
        </Link>
      </div>

      {report && (
        <div>
          <h3 className="mb-3 text-xl font-semibold text-foreground">五段式日报</h3>
          <FivePartSummary sections={report.fivePart} />
        </div>
      )}

      <div>
        <h3 className="mb-3 text-xl font-semibold text-foreground">工程池今日练习</h3>
        <PracticePicker items={practiceItems} />
      </div>

      <div>
        <h3 className="mb-3 text-xl font-semibold text-foreground">今日 30 分钟阅读包</h3>
        {view.readingPack.length > 0 ? (
          <ReadingPack items={view.readingPack} />
        ) : (
          <p className="rounded-md border border-dashed border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
            阅读包为空 — 可在{" "}
            <Link href="/inbox/today" className="font-medium text-primary hover:underline">
              Inbox/Today
            </Link>{" "}
            加入条目。
          </p>
        )}
      </div>

      <RemainingLinks items={remaining} />

    </section>
  );
}
