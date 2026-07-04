import Link from "next/link";
import { Bot } from "lucide-react";
import { AutomationRegistry } from "@/components/settings/automation-registry";
import { listAutomationRegistry } from "@/server/services/automationRuns";

export const dynamic = "force-dynamic";

export default async function AutomationsSettingsPage() {
  const rows = await listAutomationRegistry();
  const withRuns = rows.filter((row) => row.lastRun !== null).length;

  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">Automation registry</p>
        <h2 className="mt-3 text-4xl font-semibold text-foreground">Automations</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          只读查看 Prompt 模板、调度元数据与最近 run 状态。Codex 仍是外部 runner；本页不提供 Run / Edit 操作。
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          Templates {rows.length} · Runs recorded {withRuns}
        </p>
      </div>

      <AutomationRegistry rows={rows} />

      <p className="text-xs text-muted-foreground">
        登记新 run：{" "}
        <code className="text-xs">npm run automation:register -- --id ai-pm --outputs state/daily/2026-07-02-links.jsonl</code>
        {" · "}
        <Link href="/settings" className="text-primary hover:underline">
          Back to Settings
        </Link>
      </p>
    </section>
  );
}
