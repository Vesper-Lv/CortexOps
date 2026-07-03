import { CalendarClock, FileText } from "lucide-react";
import { WorkbenchPage } from "@/components/layout/workbench-page";

export default function MonthlyPage() {
  return (
    <WorkbenchPage
      eyebrow="Monthly review"
      title="Monthly"
      description="Read the monthly direction review and see how priorities should shift next month."
      metrics={[
        { label: "Monthly reports", value: "-", detail: "Waiting for JSONL import" },
        { label: "Direction shifts", value: "-", detail: "No active month" },
        { label: "Focus updates", value: "-", detail: "Not reviewed" }
      ]}
      emptyState={{
        icon: CalendarClock,
        title: "No monthly report yet",
        description:
          "Phase B will import the monthly direction review and render it here.",
        actions: [{ icon: FileText, label: "Monthly reader planned", tone: "primary" }]
      }}
    />
  );
}
