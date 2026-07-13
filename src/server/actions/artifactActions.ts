"use server";

import { revalidatePath } from "next/cache";
import {
  promoteCandidateToArtifact,
  promoteSignalToArtifact,
  promoteTaskToArtifact,
  updateArtifactStatus
} from "@/server/services/artifacts";

export async function promoteCandidateToArtifactAction(candidateId: string) {
  await promoteCandidateToArtifact(candidateId);
  revalidatePath("/library/artifacts");
  revalidatePath("/inbox/pools");
}

export async function promoteSignalToArtifactAction(signalId: string) {
  await promoteSignalToArtifact(signalId);
  revalidatePath("/library/artifacts");
}

export async function promoteTaskToArtifactAction(taskId: string) {
  await promoteTaskToArtifact(taskId);
  revalidatePath("/library/artifacts");
  revalidatePath("/dashboard/tasks");
  revalidatePath("/dashboard/today");
}

export async function updateArtifactStatusAction(artifactId: string, status: string) {
  await updateArtifactStatus(artifactId, status);
  revalidatePath("/library/artifacts");
}
