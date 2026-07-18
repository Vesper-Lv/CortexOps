"use server";

import { revalidatePath } from "next/cache";
import {
  moveCandidatePool as moveCandidatePoolService,
  updateCandidateSuggestion as updateCandidateSuggestionService,
  updateCandidatePriority as updateCandidatePriorityService,
  watchCandidate as watchCandidateService
} from "@/server/services/candidatePools";

export async function moveCandidatePool(candidateId: string, toPoolName: string): Promise<void> {
  await moveCandidatePoolService(candidateId, toPoolName);
  revalidatePath("/inbox/pools");
  revalidatePath("/dashboard/today");
}

export async function watchCandidateAction(candidateId: string): Promise<void> {
  await watchCandidateService(candidateId);
  revalidatePath("/inbox/pools");
  revalidatePath("/dashboard/today");
}

export async function updateCandidatePriorityAction(candidateId: string, priority: string): Promise<void> {
  await updateCandidatePriorityService(candidateId, priority);
  revalidatePath("/inbox/pools");
  revalidatePath("/dashboard/today");
}

export async function updateCandidateSuggestionAction(candidateId: string, suggestion: string): Promise<void> {
  await updateCandidateSuggestionService(candidateId, suggestion);
  revalidatePath("/inbox/pools");
  revalidatePath("/dashboard/today");
}
