import { SlidersHorizontal, TimerReset } from "lucide-react";
import { WorkbenchPage } from "@/components/layout/workbench-page";

export default function FocusRulesPage() {
  return (
    <WorkbenchPage
      eyebrow="Attention layer"
      title="Focus Rules"
      description="View and later edit source boosts, tags, pool boosts, affected automations, and active windows."
      metrics={[
        { label: "Active", value: "-", detail: "Awaiting focus-policy import" },
        { label: "Paused", value: "-", detail: "No paused rules imported" },
        { label: "Expired", value: "-", detail: "No imported history" }
      ]}
      emptyState={{
        icon: SlidersHorizontal,
        title: "Focus rules start as read-only",
        description:
          "Phase 6 will import GitHub Practice Fit and Job Interview Proof, then add pause, extend, archive, and export flows.",
        actions: [{ icon: TimerReset, label: "Expiration handling planned", tone: "primary" }]
      }}
    />
  );
}
