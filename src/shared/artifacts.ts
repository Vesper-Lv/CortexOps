export const ARTIFACT_STATUSES = [
  "draft",
  "polishing",
  "portfolio_ready",
  "published",
  "archived"
] as const;

export type ArtifactStatus = (typeof ARTIFACT_STATUSES)[number];

export function isValidArtifactStatus(value: string): value is ArtifactStatus {
  return (ARTIFACT_STATUSES as readonly string[]).includes(value);
}

export function assertValidArtifactStatus(value: string): asserts value is ArtifactStatus {
  if (!isValidArtifactStatus(value)) {
    throw new Error(`invalid artifact status: ${value}`);
  }
}

export type ArtifactItem = {
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
};

export const PORTFOLIO_READY_STATUSES = ["portfolio_ready", "published"] as const;
