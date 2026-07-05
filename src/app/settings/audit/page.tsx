import { ScrollText } from "lucide-react";
import { AuditTimeline } from "@/components/settings/audit-timeline";
import { listRecentAuditLogs } from "@/server/services/auditLogView";

export const dynamic = "force-dynamic";

export default async function AuditLogPage() {
  const entries = await listRecentAuditLogs();

  return (
    <section className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">Settings</p>
        <h2 className="mt-3 flex items-center gap-2 text-3xl font-semibold text-foreground">
          <ScrollText className="h-8 w-8 text-primary" />
          Audit timeline
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          最近 {entries.length} 条人工操作记录（分拣、改池、任务/制品升级、Focus Rules 等）。
        </p>
      </div>
      <div className="rounded-md border border-border bg-surface p-4">
        <AuditTimeline entries={entries} />
      </div>
    </section>
  );
}
