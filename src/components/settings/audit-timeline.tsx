import type { AuditLogEntry } from "@/server/services/auditLogView";

function formatAction(action: string): string {
  return action.replace(/_/g, " ");
}

function summarizeValue(raw: string | null): string | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const keys = Object.keys(parsed as Record<string, unknown>).slice(0, 4);
      if (keys.length === 0) return raw;
      const parts = keys.map((k) => `${k}=${JSON.stringify((parsed as Record<string, unknown>)[k])}`);
      return parts.join(", ");
    }
    return raw.length > 120 ? `${raw.slice(0, 117)}…` : raw;
  } catch {
    return raw.length > 120 ? `${raw.slice(0, 117)}…` : raw;
  }
}

export function AuditTimeline({ entries }: { entries: AuditLogEntry[] }) {
  if (entries.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        暂无审计记录。在 Inbox 分拣、改池、Promote、Focus Rules 变更等操作后会在此显示。
      </p>
    );
  }

  return (
    <ol className="relative border-l border-border pl-4">
      {entries.map((entry) => {
        const fromSummary = summarizeValue(entry.fromValue);
        const toSummary = summarizeValue(entry.toValue);
        return (
          <li key={entry.id} className="mb-4 ml-2">
            <div className="absolute -left-[5px] mt-1.5 h-2.5 w-2.5 rounded-full border border-border bg-surface" />
            <time className="text-xs text-muted-foreground">
              {entry.createdAt.toISOString().replace("T", " ").slice(0, 19)} UTC
            </time>
            <p className="mt-1 text-sm font-medium text-foreground">
              <span className="capitalize">{formatAction(entry.action)}</span>
              <span className="font-normal text-muted-foreground">
                {" "}
                · {entry.entityType} · {entry.entityId.slice(0, 12)}
                {entry.entityId.length > 12 ? "…" : ""}
              </span>
            </p>
            {(fromSummary || toSummary) && (
              <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                {fromSummary ? <p>from: {fromSummary}</p> : null}
                {toSummary ? <p>to: {toSummary}</p> : null}
              </div>
            )}
            {entry.rationale ? (
              <p className="mt-1 text-xs italic text-muted-foreground">{entry.rationale}</p>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
