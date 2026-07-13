import { Bot, Settings2 } from "lucide-react";
import { WorkbenchPage } from "@/components/layout/workbench-page";

export default function SettingsPage() {
  return (
    <WorkbenchPage
      eyebrow="System configuration"
      title="Settings"
      description="Configure paths, policy references, import/export, and view the read-only automation runner status."
      metrics={[
        { label: "Runner", value: "Codex", detail: "External in MVP" },
        { label: "Automations", value: "-", detail: "Read-only TOML snapshots" },
        { label: "Policies", value: "-", detail: "docs/*.md references" }
      ]}
      emptyState={{
        icon: Bot,
        title: "Automations run in Codex (read-only here)",
        description:
          "Automation configs, schedules, and last-run status are shown here for reference only. Codex remains the runner; the app does not call AI directly in Phase 1.",
        actions: [{ icon: Settings2, label: "Runner status panel planned", tone: "primary" }]
      }}
    />
  );
}
