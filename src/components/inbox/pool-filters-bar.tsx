import Link from "next/link";
import type { Route } from "next";
import { POOL_OPTIONS } from "@/shared/poolOptions";
import { PRIORITY_OPTIONS } from "@/shared/priorityOptions";

const STATUS_FILTERS: { label: string; value?: string }[] = [
  { label: "All" },
  { label: "pending", value: "pending" },
  { label: "confirmed", value: "confirmed" },
  { label: "changed", value: "changed" }
];

function buildHref(params: { status?: string; pool?: string; priority?: string }): Route {
  const q = new URLSearchParams();
  if (params.status) q.set("status", params.status);
  if (params.pool) q.set("pool", params.pool);
  if (params.priority) q.set("priority", params.priority);
  const qs = q.toString();
  return (qs ? `/inbox/pools?${qs}` : "/inbox/pools") as Route;
}

export function PoolFiltersBar({
  activeStatus,
  activePool,
  activePriority
}: {
  activeStatus?: string;
  activePool?: string;
  activePriority?: string;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <span className="self-center text-xs font-medium text-muted-foreground">human_status</span>
        {STATUS_FILTERS.map((f) => {
          const isActive = (activeStatus ?? "") === (f.value ?? "");
          return (
            <Link
              key={f.label}
              href={buildHref({ status: f.value, pool: activePool, priority: activePriority })}
              className={`rounded-full border px-3 py-1 text-xs font-medium capitalize transition-colors ${
                isActive
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-surface text-muted-foreground hover:bg-muted"
              }`}
            >
              {f.label}
            </Link>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground">pool</span>
        <Link
          href={buildHref({ status: activeStatus, priority: activePriority })}
          className={`rounded-full border px-3 py-1 text-xs ${
            !activePool
              ? "border-primary bg-primary/10 text-primary"
              : "border-border text-muted-foreground hover:bg-muted"
          }`}
        >
          All
        </Link>
        {POOL_OPTIONS.filter((p) => p !== "drop").map((p) => (
          <Link
            key={p}
            href={buildHref({ status: activeStatus, pool: p, priority: activePriority })}
            className={`rounded-full border px-3 py-1 text-xs ${
              activePool === p
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            {p}
          </Link>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground">priority</span>
        <Link
          href={buildHref({ status: activeStatus, pool: activePool })}
          className={`rounded-full border px-3 py-1 text-xs ${
            !activePriority
              ? "border-primary bg-primary/10 text-primary"
              : "border-border text-muted-foreground hover:bg-muted"
          }`}
        >
          All
        </Link>
        {PRIORITY_OPTIONS.map((p) => (
          <Link
            key={p}
            href={buildHref({ status: activeStatus, pool: activePool, priority: p })}
            className={`rounded-full border px-3 py-1 text-xs ${
              activePriority === p
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            {p}
          </Link>
        ))}
      </div>
    </div>
  );
}
