import { FileText, RefreshCcw } from "lucide-react";
import { WorkbenchPage } from "@/components/layout/workbench-page";

export default function ReportsPage() {
  return (
    <WorkbenchPage
      eyebrow="Report library"
      title="Reports"
      description="Browse daily radar, weekly reviews, paper radar, demo recommendations, engineering learning, and monthly direction reviews."
      metrics={[
        { label: "Daily reports", value: "-", detail: "Awaiting report import" },
        { label: "Weekly reports", value: "-", detail: "Pending automation output" },
        { label: "Monthly reviews", value: "-", detail: "Pending automation output" }
      ]}
      emptyState={{
        icon: FileText,
        title: "Report reader shell is ready",
        description:
          "Phase 5 will connect markdown reports and structured JSONL state so each report becomes a navigable, actionable view.",
        actions: [{ icon: RefreshCcw, label: "Read-only reports first", tone: "primary" }]
      }}
    />
  );
}
