import { Boxes, Filter, MoveRight } from "lucide-react";
import { WorkbenchPage } from "@/components/layout/workbench-page";

export default function PoolsPage() {
  return (
    <WorkbenchPage
      eyebrow="Option management"
      title="Candidate Pools"
      description="Organize product inspiration, paper candidates, demo replication, knowledge gaps, personal work, archive, and dropped items."
      metrics={[
        { label: "Confirmed", value: "-", detail: "Preferred downstream" },
        { label: "Changed", value: "-", detail: "Uses final_pool" },
        { label: "Pending", value: "-", detail: "AI suggested" }
      ]}
      emptyState={{
        icon: Boxes,
        title: "Candidate pool shell is ready",
        description:
          "Phase 4 will add pool, priority, and human status filters, then allow selected signals to become tasks or artifact candidates.",
        actions: [
          { icon: Filter, label: "Pool filters planned", tone: "primary" },
          { icon: MoveRight, label: "Signal to task" }
        ]
      }}
    />
  );
}
