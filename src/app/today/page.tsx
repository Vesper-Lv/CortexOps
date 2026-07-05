import { BookOpen, CheckCircle2, ListChecks } from "lucide-react";
import { WorkbenchPage } from "@/components/layout/workbench-page";

export default function TodayPage() {
  return (
    <WorkbenchPage
      eyebrow="Daily command center"
      title="Today"
      description="Read the latest radar, review the 30-minute pack, choose one practice, and confirm routing suggestions."
      metrics={[
        { label: "Reading pack", value: "-", detail: "Waiting for JSONL import" },
        { label: "Remaining links", value: "-", detail: "No active daily state" },
        { label: "Practice choice", value: "-", detail: "Not selected" }
      ]}
      emptyState={{
        icon: BookOpen,
        title: "No imported daily report yet",
        description:
          "Phase 2 will import state/daily/YYYY-MM-DD-links.jsonl and render the reading pack, remaining links, and practice options here.",
        actions: [
          { icon: ListChecks, label: "Import pipeline planned", tone: "primary" },
          { icon: CheckCircle2, label: "Codex automation remains source" }
        ]
      }}
    />
  );
}
