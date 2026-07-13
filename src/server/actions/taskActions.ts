"use server";

import { revalidatePath } from "next/cache";
import {
  promoteCandidateToTask,
  promoteMemoToTask,
  promoteSignalToTask,
  updateTask,
  updateTaskStatus,
  type UpdateTaskInput
} from "@/server/services/tasks";

export async function promoteMemoAction(memoId: string) {
  await promoteMemoToTask(memoId);
  revalidatePath("/inbox/memo");
  revalidatePath("/dashboard/tasks");
  revalidatePath("/dashboard/today");
}

export async function promoteSignalToTaskAction(signalId: string) {
  await promoteSignalToTask(signalId);
  revalidatePath("/dashboard/tasks");
  revalidatePath("/inbox/pools");
}

export async function promoteCandidateToTaskAction(candidateId: string) {
  await promoteCandidateToTask(candidateId);
  revalidatePath("/dashboard/tasks");
  revalidatePath("/inbox/pools");
}

export async function updateTaskStatusAction(taskId: string, status: string) {
  await updateTaskStatus(taskId, status);
  revalidatePath("/dashboard/tasks");
  revalidatePath("/dashboard/today");
}

export async function updateTaskAction(taskId: string, input: UpdateTaskInput) {
  await updateTask(taskId, input);
  revalidatePath("/dashboard/tasks");
  revalidatePath("/dashboard/today");
}
