import { KanbanSquare, PlusCircle } from "lucide-react";
import { WorkbenchPage } from "@/components/layout/workbench-page";

export default function TasksPage() {
  return (
    <WorkbenchPage
      eyebrow="Execution board"
      title="Tasks"
      description="Merge CortexOps-generated tasks with personal work and track them from inbox to done."
      metrics={[
        { label: "Inbox", value: "-", detail: "No tasks imported" },
        { label: "This week", value: "-", detail: "No scheduled work" },
        { label: "In progress", value: "-", detail: "Clear slate" }
      ]}
      emptyState={{
        icon: KanbanSquare,
        title: "Task board shell is ready",
        description:
          "Phase 4 will support signal-to-task conversion while preserving linked_signal_id and linked_report_id.",
        actions: [{ icon: PlusCircle, label: "Manual task entry later", tone: "primary" }]
      }}
    />
  );
}
