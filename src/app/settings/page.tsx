import { Database, FolderCog } from "lucide-react";
import { WorkbenchPage } from "@/components/layout/workbench-page";

export default function SettingsPage() {
  return (
    <WorkbenchPage
      eyebrow="System configuration"
      title="Settings"
      description="Manage source paths, import/export behavior, policy files, prompt templates, and local database settings."
      metrics={[
        { label: "Data mode", value: "Local", detail: "Filesystem + SQLite" },
        { label: "Policy files", value: "-", detail: "Read-only first" },
        { label: "Prompts", value: "TOML", detail: "Migration later" }
      ]}
      emptyState={{
        icon: FolderCog,
        title: "Settings are intentionally light",
        description:
          "The first version keeps configuration explicit and local. Editing policies and prompts can come after read-only views are stable.",
        actions: [{ icon: Database, label: "SQLite planned", tone: "primary" }]
      }}
    />
  );
}
