import { Boxes } from "lucide-react";
import Link from "next/link";
import { WorkbenchPage } from "@/components/layout/workbench-page";
import { PendingBacklogList } from "@/components/inbox/pending-backlog-list";
import { PoolBoard } from "@/components/inbox/pool-board";
import { StatusFilterBar } from "@/components/inbox/status-filter-bar";
import { getCandidatePools, getPendingSignalBacklog } from "@/server/services/inboxView";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ status?: string }>;
};

export default async function PoolsPage({ searchParams }: PageProps) {
  const { status: humanStatusFilter } = await searchParams;
  const [groups, backlog] = await Promise.all([
    getCandidatePools(humanStatusFilter),
    humanStatusFilter === "pending" ? getPendingSignalBacklog() : Promise.resolve([])
  ]);

  const totalItems = groups.reduce((n, g) => n + g.items.length, 0);
  const nonEmptyPools = groups.filter((g) => g.items.length > 0).length;
  const showEmpty =
    totalItems === 0 && (humanStatusFilter !== "pending" || backlog.length === 0);

  if (showEmpty && !humanStatusFilter) {
    return (
      <WorkbenchPage
        eyebrow="Option management"
        title="Candidate Pools"
        description="Organize product inspiration, paper candidates, demo replication, knowledge gaps, personal work, archive, and dropped items."
        metrics={[
          { label: "Pools", value: "-", detail: "Run npm run import" },
          { label: "Items", value: "0", detail: "No candidates imported" },
          { label: "Write-back", value: "—", detail: "Drag cards or use pool dropdown" }
        ]}
        emptyState={{
          icon: Boxes,
          title: "No candidates in pools",
          description:
            "Import pools/*.jsonl (npm run import) to populate candidate pools. Pool moves for daily signals happen in Inbox/Today.",
          actions: [{ icon: Boxes, label: "Import pipeline", tone: "primary" }]
        }}
      />
    );
  }

  return (
    <section className="mx-auto flex w-full max-w-[100rem] flex-col gap-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">Option management</p>
        <h2 className="mt-3 text-4xl font-semibold text-foreground">Candidate Pools</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {humanStatusFilter
            ? `Filtered by human_status=${humanStatusFilter} · ${totalItems} pool items`
            : `${totalItems} items across ${nonEmptyPools} pools · drag cards between columns or use the pool dropdown on mobile.`}
        </p>
      </div>

      <StatusFilterBar active={humanStatusFilter} />

      {humanStatusFilter === "pending" && <PendingBacklogList signals={backlog} />}

      {totalItems === 0 && humanStatusFilter && humanStatusFilter !== "pending" ? (
        <p className="rounded-md border border-dashed border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          无 human_status={humanStatusFilter} 的池内条目。
        </p>
      ) : totalItems === 0 && humanStatusFilter === "pending" ? (
        backlog.length > 0 ? null : (
          <p className="rounded-md border border-dashed border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
            无 pending 条目。去{" "}
            <Link href="/inbox/today" className="font-medium text-primary hover:underline">
              Inbox/Today
            </Link>{" "}
            分拣今日信号。
          </p>
        )
      ) : (
        <PoolBoard groups={groups} />
      )}
    </section>
  );
}
