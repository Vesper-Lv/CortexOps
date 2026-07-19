"use server";

import { revalidatePath } from "next/cache";
import { recordBehaviorEvent } from "@/server/services/behaviorLearning";
import type { ThumbsDownReason } from "@/shared/preferenceLearning";

export async function thumbsUpAction(signalId: string) {
  await recordBehaviorEvent({ signalId, eventType: "thumbs_up", reason: null });
  revalidatePath("/dashboard/today");
}

export async function thumbsDownAction(signalId: string, reason: ThumbsDownReason) {
  await recordBehaviorEvent({ signalId, eventType: "thumbs_down", reason });
  revalidatePath("/dashboard/today");
  revalidatePath("/inbox/today");
}
