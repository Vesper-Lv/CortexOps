import { BadgeCheck, Layers3 } from "lucide-react";
import { WorkbenchPage } from "@/components/layout/workbench-page";

export default function ArtifactsPage() {
  return (
    <WorkbenchPage
      eyebrow="Portfolio coverage map"
      title="Artifacts"
      description="A high-level coverage map of your portfolio by topic and maturity. Detailed content stays in Obsidian; here you plan where to invest next."
      metrics={[
        { label: "Draft", value: "-", detail: "No artifacts imported" },
        { label: "Polishing", value: "-", detail: "No active polish" },
        { label: "Ready", value: "-", detail: "No portfolio items" }
      ]}
      emptyState={{
        icon: Layers3,
        title: "Coverage map will follow tasks",
        description:
          "Phase D will render a topic × maturity coverage matrix plus a portfolio-ready list with external links (Obsidian/GitHub). Details stay in Obsidian.",
        actions: [{ icon: BadgeCheck, label: "Coverage matrix planned", tone: "primary" }]
      }}
    />
  );
}
