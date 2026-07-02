import { Bot, CalendarClock } from "lucide-react";
import { WorkbenchPage } from "@/components/layout/workbench-page";

export default function AutomationsPage() {
  return (
    <WorkbenchPage
      eyebrow="Automation control room"
      title="Automations"
      description="Inspect active Codex automation snapshots, schedules, model settings, and policy-file references."
      metrics={[
        { label: "Snapshots", value: "-", detail: "Awaiting TOML scan" },
        { label: "Runner", value: "Codex", detail: "External in MVP" },
        { label: "AI calls", value: "-", detail: "Deferred in app" }
      ]}
      emptyState={{
        icon: Bot,
        title: "Codex remains the runner for now",
        description:
          "Phase 7 will add PromptTemplate, PolicySnapshot, AutomationRun, and Job records before any in-app AI runner replaces this flow.",
        actions: [{ icon: CalendarClock, label: "Run history planned", tone: "primary" }]
      }}
    />
  );
}
