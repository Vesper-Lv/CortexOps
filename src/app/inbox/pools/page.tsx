import { Boxes } from "lucide-react";
import { WorkbenchPage } from "@/components/layout/workbench-page";
import { PoolBoard } from "@/components/inbox/pool-board";
import { getCandidatePoolGroups } from "@/server/services/candidatePools";

export const dynamic = "force-dynamic";

export default async function PoolsPage() {
  const groups = await getCandidatePoolGroups();
  const totalItems = groups.reduce((n, g) => n + g.items.length, 0);
  const nonEmptyPools = groups.filter((g) => g.items.length > 0).length;

  if (totalItems === 0) {
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
          {totalItems} items across {nonEmptyPools} pools · drag cards between columns or use the pool dropdown on
          mobile.
        </p>
      </div>

      <PoolBoard groups={groups} />
    </section>
  );
}
