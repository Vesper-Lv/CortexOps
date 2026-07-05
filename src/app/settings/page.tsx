import { Bot, Settings2 } from "lucide-react";
import { WorkbenchPage } from "@/components/layout/workbench-page";
import { getAutomationSummaryMetrics } from "@/server/services/automationRuns";
import { computePolicySnapshot } from "@/server/services/policySnapshot";
import { shortHash } from "@/server/services/policySnapshotStore";
import { readFile } from "node:fs/promises";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [automationMetrics, policy] = await Promise.all([
    getAutomationSummaryMetrics(),
    computePolicySnapshot({ readFile: (p) => readFile(p, "utf8") })
  ]);

  const lastDailyLabel = automationMetrics.lastDailyRunAt
    ? automationMetrics.lastDailyRunAt.toLocaleDateString("zh-CN", { timeZone: "Asia/Shanghai" })
    : "—";

  return (
    <WorkbenchPage
      eyebrow="System configuration"
      title="Settings"
      description="Configure paths, policy references, import/export, and view the read-only automation runner status."
      metrics={[
        { label: "Runner", value: "Codex", detail: "External in MVP" },
        {
          label: "Automations",
          value: String(automationMetrics.templateCount || "—"),
          detail: "PromptTemplate registry"
        },
        {
          label: "Policies",
          value: shortHash(policy.snapshotKey),
          detail: "docs/*.md composite hash"
        }
      ]}
      emptyState={{
        icon: Bot,
        title: "Automations run in Codex (read-only here)",
        description: `Automation configs, schedules, and last-run status are shown in the Automations panel. Last daily run: ${lastDailyLabel}. The app does not call AI directly in Phase 7.`,
        actions: [
          {
            icon: Settings2,
            label: "View automations registry",
            tone: "primary",
            href: "/settings/automations"
          }
        ]
      }}
    />
  );
}
