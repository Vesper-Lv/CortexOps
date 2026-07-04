import { shortHash } from "@/server/services/policySnapshotStore";
import type { AutomationRegistryRow } from "@/server/services/automationRuns";

function formatSchedule(rrule: string | null): string {
  if (!rrule) return "—";
  return rrule;
}

function formatDate(value: Date | null): string {
  if (!value) return "—";
  return value.toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" });
}

export function AutomationRegistry({ rows }: { rows: AutomationRegistryRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border bg-surface p-8">
        <p className="text-sm text-muted-foreground">
          暂无 PromptTemplate 记录。请先运行{" "}
          <code className="text-xs">npm run prompts:sync</code> 从 automations/*.toml 同步模板。
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Codex 跑完 automation 后，运行{" "}
          <code className="text-xs">npm run import</code> 或{" "}
          <code className="text-xs">npm run automation:register -- --id ai-pm --outputs ...</code>{" "}
          登记 run。
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full min-w-[960px] text-left text-sm">
        <thead className="border-b border-border bg-muted/40 text-muted-foreground">
          <tr>
            <th className="px-4 py-3 font-medium">Name</th>
            <th className="px-4 py-3 font-medium">Kind</th>
            <th className="px-4 py-3 font-medium">Schedule</th>
            <th className="px-4 py-3 font-medium">Model</th>
            <th className="px-4 py-3 font-medium">Last run</th>
            <th className="px-4 py-3 font-medium">Policy</th>
            <th className="px-4 py-3 font-medium">Prompt</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.automationId} className="border-b border-border last:border-b-0">
              <td className="px-4 py-3 align-top">
                <div className="font-medium text-foreground">{row.name}</div>
                <div className="mt-1 text-xs text-muted-foreground">{row.automationId}</div>
              </td>
              <td className="px-4 py-3 align-top capitalize">{row.kind.replace(/_/g, " ")}</td>
              <td className="px-4 py-3 align-top font-mono text-xs">{formatSchedule(row.scheduleRrule)}</td>
              <td className="px-4 py-3 align-top">{row.model ?? "—"}</td>
              <td className="px-4 py-3 align-top">
                {row.lastRun ? (
                  <div>
                    <div>{formatDate(row.lastRun.createdAt)}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {row.lastRun.status} · {row.lastRun.trigger}
                    </div>
                    {row.lastRun.outputFiles.length > 0 && (
                      <ul className="mt-1 list-inside list-disc text-xs text-muted-foreground">
                        {row.lastRun.outputFiles.slice(0, 2).map((file) => (
                          <li key={file}>{file}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ) : (
                  <span className="text-muted-foreground">No runs yet</span>
                )}
              </td>
              <td className="px-4 py-3 align-top font-mono text-xs">
                {row.lastRun?.policySnapshotKey ? shortHash(row.lastRun.policySnapshotKey) : "—"}
              </td>
              <td className="px-4 py-3 align-top">
                <div className="font-mono text-xs">{shortHash(row.contentHash)}</div>
                <code className="mt-1 inline-block text-xs text-muted-foreground">{row.sourcePath}</code>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
