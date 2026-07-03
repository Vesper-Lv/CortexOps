import Link from "next/link";
import type { Route } from "next";

const FILTERS: { href: Route; label: string; value?: string }[] = [
  { href: "/inbox/pools", label: "All" },
  { href: "/inbox/pools?status=pending" as Route, label: "pending", value: "pending" },
  { href: "/inbox/pools?status=confirmed" as Route, label: "confirmed", value: "confirmed" },
  { href: "/inbox/pools?status=changed" as Route, label: "changed", value: "changed" }
];

export function StatusFilterBar({ active }: { active?: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      {FILTERS.map((f) => {
        const isActive = (active ?? "") === (f.value ?? "");
        return (
          <Link
            key={f.label}
            href={f.href}
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
  );
}
