import { ListTodo, Plus } from "lucide-react";
import { WorkbenchPage } from "@/components/layout/workbench-page";

export default function MemoPage() {
  return (
    <WorkbenchPage
      eyebrow="Quick capture"
      title="Memo"
      description="Jot down questions to confirm later while reading reports or building demos. Lightweight to-do list; convert to a task or knowledge-gap pool item when ready."
      metrics={[
        { label: "Open", value: "-", detail: "No memos yet" },
        { label: "Done", value: "-", detail: "Nothing completed" },
        { label: "Linked", value: "-", detail: "No source links" }
      ]}
      emptyState={{
        icon: ListTodo,
        title: "No memos yet",
        description:
          "Phase C will add a quick-add input, check-off, filter (All/Open/Done), and optional convert-to-task / knowledge-gap. Memo is decoupled from signal import and can ship early.",
        actions: [{ icon: Plus, label: "Quick-add to-do planned", tone: "primary" }]
      }}
    />
  );
}
