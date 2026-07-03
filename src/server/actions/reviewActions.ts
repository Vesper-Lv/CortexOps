"use server";

import { revalidatePath } from "next/cache";
import { reviewSignal, type ReviewAction } from "@/server/services/review";

export async function submitReview(signalId: string, action: ReviewAction, rationale?: string) {
  await reviewSignal(signalId, action, rationale);
  revalidatePath("/inbox/today");
  revalidatePath("/dashboard/today");
}
