"use server";

import { revalidatePath } from "next/cache";
import { createMemo, deleteMemo, toggleMemo, updateMemo } from "@/server/services/memos";

export async function addMemoAction(formData: FormData) {
  await createMemo(String(formData.get("text") ?? ""));
  revalidatePath("/inbox/memo");
}

export async function updateMemoAction(id: string, text: string) {
  await updateMemo(id, text);
  revalidatePath("/inbox/memo");
}

export async function toggleMemoAction(id: string) {
  await toggleMemo(id);
  revalidatePath("/inbox/memo");
}

export async function deleteMemoAction(id: string) {
  await deleteMemo(id);
  revalidatePath("/inbox/memo");
}
