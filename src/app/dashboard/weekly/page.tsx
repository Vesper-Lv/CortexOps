import { CalendarRange, FileText } from "lucide-react";
import { WorkbenchPage } from "@/components/layout/workbench-page";

export default function WeeklyPage() {
  return (
    <WorkbenchPage
      eyebrow="Weekly digest"
      title="Weekly"
      description="Read this week's execution review, paper radar, demo recommendation, and engineering-learning report."
      metrics={[
        { label: "Weekly reports", value: "-", detail: "Waiting for JSONL import" },
        { label: "Scheduled items", value: "-", detail: "No active week" },
        { label: "Practice picks", value: "-", detail: "Not selected" }
      ]}
      emptyState={{
        icon: CalendarRange,
        title: "No weekly report yet",
        description:
          "Phase B will import weekly automation outputs and render the weekly reading view here.",
        actions: [{ icon: FileText, label: "Weekly reader planned", tone: "primary" }]
      }}
    />
  );
}
