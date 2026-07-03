import Link from "next/link";
import { BookOpen, CheckCircle2, ListChecks } from "lucide-react";
import { WorkbenchPage } from "@/components/layout/workbench-page";
import { ReadingPack } from "@/components/dashboard/reading-pack";
import { getDailyReadingView } from "@/server/services/dailyView";

export const dynamic = "force-dynamic";

export default async function TodayPage() {
  const data = await getDailyReadingView();

  if (!data || data.view.selectedCount === 0) {
    return (
      <WorkbenchPage
        eyebrow="Daily command center"
        title="Today"
        description="Read the latest radar, review the 30-minute pack, choose one practice, and confirm routing suggestions."
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

  const { date, view } = data;
  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div className="max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">Daily command center</p>
        <h2 className="mt-3 text-4xl font-semibold text-foreground">Today · {date}</h2>
      </div>

      <div className="rounded-md border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
        AI 已选 {view.selectedCount} 条进入阅读包 · 另有 {view.remainingCount} 条待归类 →{" "}
        <Link href="/inbox/today" className="font-medium text-primary hover:underline">
          去 Inbox 分拣
        </Link>
      </div>

      <div>
        <h3 className="mb-3 text-xl font-semibold text-foreground">今日 30 分钟阅读包</h3>
        <ReadingPack items={view.readingPack} />
      </div>

      {view.candidates.length > 0 && (
        <div>
          <h3 className="mb-3 text-xl font-semibold text-foreground">
            快速补充（候选 {view.candidateCount} 条）
          </h3>
          <ul className="flex flex-col gap-2">
            {view.candidates.map((item, i) => (
              <li key={i} className="rounded-md border border-dashed border-border bg-surface px-3 py-2 text-sm">
                <a href={item.url} target="_blank" rel="noreferrer" className="font-medium text-foreground hover:underline">
                  {item.title}
                </a>
                <span className="ml-2 text-muted-foreground">{item.pool}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted-foreground">勾选加入阅读包的交互在 Inbox/Today（Phase C）。</p>
        </div>
      )}
    </section>
  );
}
