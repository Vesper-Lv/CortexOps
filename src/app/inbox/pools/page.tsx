import Link from "next/link";
import type { Route } from "next";
import { Boxes } from "lucide-react";
import { WorkbenchPage } from "@/components/layout/workbench-page";
import { getCandidatePools } from "@/server/services/inboxView";

export const dynamic = "force-dynamic";

const STATUS_FILTERS: { label: string; value?: string; href: Route }[] = [
  { label: "All", value: undefined, href: "/inbox/pools" },
  { label: "Pending", value: "pending", href: "/inbox/pools?status=pending" },
  { label: "Confirmed", value: "confirmed", href: "/inbox/pools?status=confirmed" },
  { label: "Changed", value: "changed", href: "/inbox/pools?status=changed" },
  { label: "Rejected", value: "rejected", href: "/inbox/pools?status=rejected" }
];

type PageProps = {
  searchParams: Promise<{ status?: string }>;
};

export default async function PoolsPage({ searchParams }: PageProps) {
  const { status } = await searchParams;
  const groups = await getCandidatePools(status);

  if (groups.length === 0) {
    return (
      <WorkbenchPage
        eyebrow="Option management"
        title="Candidate Pools"
        description="Organize product inspiration, paper candidates, demo replication, knowledge gaps, personal work, archive, and dropped items."
        metrics={[
          { label: "Pools", value: "-", detail: "Run npm run import" },
          { label: "Filtered", value: status ?? "all", detail: "No matching candidates" },
          { label: "Write-back", value: "—", detail: "Read-only; triage via Inbox/Today" }
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

  const total = groups.reduce((n, g) => n + g.items.length, 0);

  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">Option management</p>
        <h2 className="mt-3 text-4xl font-semibold text-foreground">Candidate Pools</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {total} items across {groups.length} pools · read-only view; use Inbox/Today to change daily signal pools.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((f) => {
          const active = (status ?? undefined) === f.value;
          return (
            <Link
              key={f.label}
              href={f.href}
              className={`rounded px-3 py-1 text-sm ${
                active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {f.label}
            </Link>
          );
        })}
      </div>

      <div className="flex flex-col gap-8">
        {groups.map((group) => (
          <div key={group.poolName}>
            <h3 className="mb-3 text-lg font-semibold text-foreground">
              {group.poolName}
              <span className="ml-2 text-sm font-normal text-muted-foreground">({group.items.length})</span>
            </h3>
            <ul className="flex flex-col gap-2">
              {group.items.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm"
                >
                  <a href={item.url} target="_blank" rel="noreferrer" className="font-medium text-foreground hover:underline">
                    {item.title}
                  </a>
                  <span className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    {item.priority || "—"}
                  </span>
                  <span className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    {item.humanStatus}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
