"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/server/db";
import { getDailyReport, upsertDailySession } from "@/server/services/dailyReport";
import { draftSignalEdit } from "@/server/services/review";
import { createPracticeTask } from "@/server/services/tasks";
import { assertValidPool } from "@/shared/poolOptions";

export async function confirmPractice(
  date: string,
  selectedIndex: number,
  dispositions: { index: number; disposition: string }[]
): Promise<{ practiceTaskId: string; practiceTaskCreated: boolean }> {
  if (selectedIndex < 0 || selectedIndex > 2) {
    throw new Error("selectedPracticeIndex must be 0, 1, or 2");
  }

  const altFields: Record<string, string | null> = {
    practiceAlt0Disposition: null,
    practiceAlt1Disposition: null,
    practiceAlt2Disposition: null
  };

  for (const { index, disposition } of dispositions) {
    if (index === selectedIndex) continue;
    if (disposition !== "drop") {
      assertValidPool(disposition);
    }
    altFields[`practiceAlt${index}Disposition`] = disposition;
  }

  await upsertDailySession(date, {
    selectedPracticeIndex: selectedIndex,
    ...altFields
  });

  const report = await getDailyReport(date);
  const practice = report?.practices.find((p) => p.index === selectedIndex) ?? report?.practices[selectedIndex];
  const title = practice?.title ?? `今日练习 #${selectedIndex + 1}`;
  const body = practice?.body ?? "";

  const { taskId, created } = await createPracticeTask({
    date,
    practiceIndex: selectedIndex,
    title,
    body
  });

  revalidatePath("/dashboard/today");
  revalidatePath("/dashboard/tasks");
  return { practiceTaskId: taskId, practiceTaskCreated: created };
}

export async function dismissCandidates(date: string) {
  await upsertDailySession(date, { candidatesDismissed: true });
  revalidatePath("/dashboard/today");
}

export async function batchAddToReadingPack(signalIds: string[]) {
  const signals = await prisma.signal.findMany({
    where: { id: { in: signalIds }, readingPackStatus: "candidate" }
  });

  for (const signal of signals) {
    if (signal.readingPackStatus !== "selected") {
      await draftSignalEdit(signal.id, { type: "toggle_reading_pack" });
    }
  }

  revalidatePath("/dashboard/today");
  revalidatePath("/inbox/today");
}
