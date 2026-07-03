"use server";

import { revalidatePath } from "next/cache";
import {
  draftSignalEdit,
  finalizeAllPending,
  finalizeSignal,
  type DraftAction
} from "@/server/services/review";

function revalidateInboxPaths() {
  revalidatePath("/inbox/today");
  revalidatePath("/dashboard/today");
  revalidatePath("/inbox/pools");
}

export async function submitDraft(signalId: string, action: DraftAction) {
  await draftSignalEdit(signalId, action);
  revalidatePath("/inbox/today");
  revalidatePath("/dashboard/today");
}

export async function finalizeSignalAction(signalId: string) {
  await finalizeSignal(signalId);
  revalidateInboxPaths();
}

export async function finalizeAllAction(date: string) {
  await finalizeAllPending(date);
  revalidateInboxPaths();
}
