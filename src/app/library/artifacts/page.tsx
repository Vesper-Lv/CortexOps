import { groupArtifactsForCoverage, listArtifacts, listArtifactsGrouped } from "@/server/services/artifacts";
import { ArtifactBoard } from "@/components/library/artifact-board";

export const dynamic = "force-dynamic";

export default async function ArtifactsPage() {
  const [grouped, all] = await Promise.all([listArtifactsGrouped(), listArtifacts()]);
  const { portfolioReady } = groupArtifactsForCoverage(all);

  return (
    <section className="mx-auto flex w-full max-w-[100rem] flex-col gap-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">Portfolio coverage map</p>
        <h2 className="mt-3 text-4xl font-semibold text-foreground">Artifacts</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          从 Signal/Candidate 转化的 artifact candidates。详细内容仍在 Obsidian；此处跟踪成熟度与 proof 字段。
        </p>
      </div>
      <ArtifactBoard grouped={grouped} portfolioReady={portfolioReady} />
    </section>
  );
}
