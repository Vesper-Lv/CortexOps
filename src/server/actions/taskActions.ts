"use server";

import { revalidatePath } from "next/cache";
import { promoteMemoToTask } from "@/server/services/tasks";

export async function promoteMemoAction(memoId: string) {
  await promoteMemoToTask(memoId);
  revalidatePath("/inbox/memo");
  revalidatePath("/dashboard/tasks");
}
