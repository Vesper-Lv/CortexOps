"use server";

import { revalidatePath } from "next/cache";
import {
  moveCandidatePool as moveCandidatePoolService,
  updateCandidatePriority as updateCandidatePriorityService,
  watchCandidate as watchCandidateService
} from "@/server/services/candidatePools";

export async function moveCandidatePool(candidateId: string, toPoolName: string): Promise<void> {
  await moveCandidatePoolService(candidateId, toPoolName);
  revalidatePath("/inbox/pools");
}

export async function watchCandidateAction(candidateId: string): Promise<void> {
  await watchCandidateService(candidateId);
  revalidatePath("/inbox/pools");
}

export async function updateCandidatePriorityAction(candidateId: string, priority: string): Promise<void> {
  await updateCandidatePriorityService(candidateId, priority);
  revalidatePath("/inbox/pools");
}
