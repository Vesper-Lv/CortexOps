import { prisma } from "@/server/db";
import type { ArtifactItem } from "@/shared/artifacts";
import { assertValidArtifactStatus, isValidArtifactStatus } from "@/shared/artifacts";

export type { ArtifactItem } from "@/shared/artifacts";

function mapArtifact(a: {
  id: string;
  title: string;
  description: string | null;
  status: string;
  origin: string;
  linkedSignalId: string | null;
  linkedCandidateId: string | null;
  proofArtifact: string | null;
  interviewStoryAngle: string | null;
  portfolioPotential: string | null;
  createdAt: Date;
}): ArtifactItem {
  return {
    id: a.id,
    title: a.title,
    description: a.description,
    status: a.status,
    origin: a.origin,
    linkedSignalId: a.linkedSignalId,
    linkedCandidateId: a.linkedCandidateId,
    proofArtifact: a.proofArtifact,
    interviewStoryAngle: a.interviewStoryAngle,
    portfolioPotential: a.portfolioPotential,
    createdAt: a.createdAt
  };
}

export async function listArtifacts(): Promise<ArtifactItem[]> {
  const rows = await prisma.artifact.findMany({ orderBy: { updatedAt: "desc" } });
  return rows.map(mapArtifact);
}

export async function listArtifactsGrouped(): Promise<Record<string, ArtifactItem[]>> {
  const rows = await prisma.artifact.findMany({ orderBy: { updatedAt: "desc" } });
  const grouped: Record<string, ArtifactItem[]> = {};
  for (const row of rows) {
    const item = mapArtifact(row);
    if (!grouped[item.status]) grouped[item.status] = [];
    grouped[item.status]!.push(item);
  }
  return grouped;
}

export async function updateArtifactStatus(artifactId: string, status: string): Promise<void> {
  assertValidArtifactStatus(status);
  const artifact = await prisma.artifact.findUnique({ where: { id: artifactId } });
  if (!artifact) throw new Error("artifact not found");

  await prisma.$transaction([
    prisma.artifact.update({ where: { id: artifactId }, data: { status } }),
    prisma.auditLog.create({
      data: {
        entityType: "artifact",
        entityId: artifactId,
        action: "update_status",
        fromValue: artifact.status,
        toValue: status
      }
    })
  ]);
}

function extractPortfolioFields(rawJson: string): {
  proofArtifact: string | null;
  interviewStoryAngle: string | null;
  portfolioPotential: string | null;
} {
  try {
    const obj = JSON.parse(rawJson) as Record<string, unknown>;
    return {
      proofArtifact: typeof obj.proof_artifact === "string" ? obj.proof_artifact : null,
      interviewStoryAngle:
        typeof obj.interview_story_angle === "string" ? obj.interview_story_angle : null,
      portfolioPotential:
        typeof obj.portfolio_potential === "string" ? obj.portfolio_potential : null
    };
  } catch {
    return { proofArtifact: null, interviewStoryAngle: null, portfolioPotential: null };
  }
}

export async function promoteSignalToArtifact(signalId: string): Promise<string> {
  const signal = await prisma.signal.findUnique({ where: { id: signalId } });
  if (!signal) throw new Error("signal not found");
  if ((signal.humanStatus ?? "pending") === "pending") {
    throw new Error("finalize signal before converting to artifact");
  }

  const fields = extractPortfolioFields(signal.rawJson);
  const linkedReportId = signal.date
    ? ((await prisma.dailyReport.findUnique({ where: { date: signal.date } }))?.date ?? null)
    : null;

  const artifact = await prisma.$transaction(async (tx) => {
    const created = await tx.artifact.create({
      data: {
        title: signal.title ?? "(untitled)",
        description: signal.reason,
        origin: "signal",
        linkedSignalId: signal.id,
        linkedReportId,
        status: "draft",
        ...fields
      }
    });
    await tx.auditLog.create({
      data: {
        entityType: "signal",
        entityId: signalId,
        action: "promote_to_artifact",
        toValue: created.id
      }
    });
    return created;
  });

  return artifact.id;
}

export async function promoteCandidateToArtifact(candidateId: string): Promise<string> {
  const candidate = await prisma.candidate.findUnique({ where: { id: candidateId } });
  if (!candidate) throw new Error("candidate not found");
  if ((candidate.humanStatus ?? "pending") === "pending") {
    throw new Error("candidate must be triaged before converting to artifact");
  }

  let linkedSignalId: string | null = null;
  if (candidate.recordKey.startsWith("signal-sync:")) {
    const signalKey = candidate.recordKey.slice("signal-sync:".length);
    const signal = await prisma.signal.findUnique({ where: { recordKey: signalKey } });
    linkedSignalId = signal?.id ?? null;
  }

  const fields = extractPortfolioFields(candidate.rawJson);
  const linkedReportId = candidate.date
    ? ((await prisma.dailyReport.findUnique({ where: { date: candidate.date } }))?.date ?? null)
    : null;

  const artifact = await prisma.$transaction(async (tx) => {
    const created = await tx.artifact.create({
      data: {
        title: candidate.title ?? "(untitled)",
        description: candidate.reason,
        origin: "signal",
        linkedSignalId,
        linkedCandidateId: candidate.id,
        linkedReportId,
        status: "draft",
        ...fields
      }
    });
    await tx.auditLog.create({
      data: {
        entityType: "candidate",
        entityId: candidateId,
        action: "promote_to_artifact",
        toValue: created.id
      }
    });
    return created;
  });

  return artifact.id;
}

export function groupArtifactsForCoverage(artifacts: ArtifactItem[]): {
  byStatus: Record<string, number>;
  portfolioReady: ArtifactItem[];
} {
  const byStatus: Record<string, number> = {};
  for (const a of artifacts) {
    byStatus[a.status] = (byStatus[a.status] ?? 0) + 1;
  }
  const portfolioReady = artifacts.filter((a) =>
    isValidArtifactStatus(a.status) && (a.status === "portfolio_ready" || a.status === "published")
  );
  return { byStatus, portfolioReady };
}
