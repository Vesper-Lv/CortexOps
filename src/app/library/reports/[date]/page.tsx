import Link from "next/link";
import type { Route } from "next";
import { FivePartSummary } from "@/components/dashboard/five-part-summary";
import { ReadingPack } from "@/components/dashboard/reading-pack";
import { getDailyPageData } from "@/server/services/dailyView";
import { getDailyReportDetail } from "@/server/services/reports";
import type { PracticeOption } from "@/server/importers/dailyReportParser";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ date: string }> };

function ReadOnlyPractices({ practices }: { practices: PracticeOption[] }) {
  if (practices.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
        今日练习暂无结构化内容。
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {practices.map((p) => (
        <li key={p.index} className="rounded-md border border-border bg-surface p-4">
          <p className="text-xs text-muted-foreground">练习 {p.index + 1}</p>
          <h4 className="mt-1 text-base font-semibold text-foreground">{p.title}</h4>
          {p.body ? (
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{p.body}</p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

export default async function DailyReportDetailPage({ params }: PageProps) {
  const { date } = await params;
  const [report, pageData] = await Promise.all([
    getDailyReportDetail(date),
    getDailyPageData(date)
  ]);

  const hasReport = report?.kind === "daily";
  const readingPack = pageData?.view.readingPack ?? [];
  const fivePart = hasReport ? report.fivePart : [];
  const practices = hasReport ? report.practices : [];
  const hasAnything =
    hasReport ||
    readingPack.length > 0 ||
    fivePart.some((s) => s.content.trim().length > 0);

  if (!hasAnything) {
    return (
      <section className="mx-auto max-w-4xl px-4 py-8">
        <p className="text-sm text-muted-foreground">
          未找到 {date} 的日报或阅读包数据。
        </p>
        <Link href="/library/reports" className="mt-2 inline-block text-sm text-primary hover:underline">
          ← 返回 Reports
        </Link>
      </section>
    );
  }

  return (
    <section className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-8">
      <div>
        <Link href="/library/reports" className="text-sm text-primary hover:underline">
          ← Reports
        </Link>
        <h2 className="mt-2 text-3xl font-semibold">Daily · {date}</h2>
        {hasReport ? (
          <p className="mt-1 text-xs text-muted-foreground">{report.sourceFile}</p>
        ) : (
          <p className="mt-1 text-xs text-muted-foreground">仅有分拣 / 阅读包数据（无日报文件）</p>
        )}
      </div>

      <div>
        <h3 className="mb-3 text-xl font-semibold text-foreground">五段式日报</h3>
        <FivePartSummary sections={fivePart} />
      </div>

      <div>
        <h3 className="mb-3 text-xl font-semibold text-foreground">练习（只读）</h3>
        <ReadOnlyPractices practices={practices} />
      </div>

      <div>
        <h3 className="mb-3 text-xl font-semibold text-foreground">阅读包（只读）</h3>
        {readingPack.length > 0 ? (
          <ReadingPack items={readingPack} />
        ) : (
          <p className="rounded-md border border-dashed border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
            该日阅读包为空。
          </p>
        )}
      </div>

      <Link
        href={"/dashboard/today" as Route}
        className="text-sm font-medium text-primary hover:underline"
      >
        在 Dashboard/Today 操作 →
      </Link>
    </section>
  );
}
