import { Inbox, Route, ShieldCheck } from "lucide-react";
import { WorkbenchPage } from "@/components/layout/workbench-page";

export default function ReviewPage() {
  return (
    <WorkbenchPage
      eyebrow="Human control loop"
      title="Review Inbox"
      description="Confirm AI suggestions, change candidate pools, reject weak signals, watch uncertain items, or convert signals into tasks."
      metrics={[
        { label: "Pending", value: "-", detail: "After import" },
        { label: "Confirmed", value: "-", detail: "Human-owned" },
        { label: "Rejected", value: "-", detail: "Excluded downstream" }
      ]}
      emptyState={{
        icon: Inbox,
        title: "No signals waiting for review",
        description:
          "Phase 3 will add confirm, change pool, reject, and watch actions. Every action will write an AuditLog entry.",
        actions: [
          { icon: ShieldCheck, label: "AuditLog required", tone: "primary" },
          { icon: Route, label: "final_pool overrides suggestions" }
        ]
      }}
    />
  );
}
