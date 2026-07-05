import { BadgeCheck, Layers3 } from "lucide-react";
import { WorkbenchPage } from "@/components/layout/workbench-page";

export default function ArtifactsPage() {
  return (
    <WorkbenchPage
      eyebrow="Portfolio pipeline"
      title="Artifacts"
      description="Track demos, memos, README files, architecture diagrams, recordings, and portfolio-ready proof."
      metrics={[
        { label: "Draft", value: "-", detail: "No artifacts imported" },
        { label: "Polishing", value: "-", detail: "No active polish" },
        { label: "Ready", value: "-", detail: "No portfolio items" }
      ]}
      emptyState={{
        icon: Layers3,
        title: "Artifact tracking will follow tasks",
        description:
          "Phase 4 will let high-value signals become artifact candidates with proof_artifact and interview_story_angle fields.",
        actions: [{ icon: BadgeCheck, label: "Portfolio-ready status planned", tone: "primary" }]
      }}
    />
  );
}
