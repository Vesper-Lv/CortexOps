"use server";

import { revalidatePath } from "next/cache";
import { moveCandidatePool as moveCandidatePoolService } from "@/server/services/candidatePools";

export async function moveCandidatePool(candidateId: string, toPoolName: string): Promise<void> {
  await moveCandidatePoolService(candidateId, toPoolName);
  revalidatePath("/inbox/pools");
}
