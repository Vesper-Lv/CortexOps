import { prisma } from "@/server/db";
import { getLatestDailyDate } from "@/server/services/dailyView";
import type { TaskItem } from "@/shared/tasks";
import { ACTIVE_TASK_STATUSES, assertValidTaskStatus } from "@/shared/tasks";

export type { TaskItem } from "@/shared/tasks";

function mapTask(t: {
  id: string;
  title: string;
  description: string | null;
  origin: string;
  linkedSignalId: string | null;
  linkedReportId: string | null;
  status: string;
  priority: string | null;
  createdAt: Date;
}): TaskItem {
  return {
    id: t.id,
    title: t.title,
    description: t.description,
    origin: t.origin,
    linkedSignalId: t.linkedSignalId,
    linkedReportId: t.linkedReportId,
    status: t.status,
    priority: t.priority,
    createdAt: t.createdAt
  };
}

export async function listTasks(): Promise<TaskItem[]> {
  const rows = await prisma.task.findMany({ orderBy: { createdAt: "desc" } });
  return rows.map(mapTask);
}

export async function listActiveTasks(): Promise<TaskItem[]> {
  const rows = await prisma.task.findMany({
    where: { status: { in: [...ACTIVE_TASK_STATUSES] } },
    orderBy: { updatedAt: "desc" },
    take: 8
  });
  return rows.map(mapTask);
}

export async function listTasksGrouped(): Promise<Record<string, TaskItem[]>> {
  const rows = await prisma.task.findMany({ orderBy: { updatedAt: "desc" } });
  const grouped: Record<string, TaskItem[]> = {};
  for (const row of rows) {
    const item = mapTask(row);
    if (!grouped[item.status]) grouped[item.status] = [];
    grouped[item.status]!.push(item);
  }
  return grouped;
}

export async function updateTaskStatus(taskId: string, status: string): Promise<void> {
  assertValidTaskStatus(status);
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) throw new Error("task not found");

  await prisma.$transaction([
    prisma.task.update({ where: { id: taskId }, data: { status } }),
    prisma.auditLog.create({
      data: {
        entityType: "task",
        entityId: taskId,
        action: "update_status",
        fromValue: task.status,
        toValue: status
      }
    })
  ]);
}

async function resolveLinkedReportId(signalDate: string | null): Promise<string | null> {
  if (!signalDate) return null;
  const report = await prisma.dailyReport.findUnique({ where: { date: signalDate } });
  return report?.date ?? null;
}

export async function promoteSignalToTask(signalId: string): Promise<string> {
  const signal = await prisma.signal.findUnique({ where: { id: signalId } });
  if (!signal) throw new Error("signal not found");
  if ((signal.humanStatus ?? "pending") === "pending") {
    throw new Error("finalize signal before converting to task");
  }

  const linkedReportId = await resolveLinkedReportId(signal.date);

  const task = await prisma.$transaction(async (tx) => {
    const created = await tx.task.create({
      data: {
        title: signal.title ?? "(untitled)",
        description: signal.reason,
        origin: "signal",
        linkedSignalId: signal.id,
        linkedReportId,
        status: "inbox",
        priority: signal.priority
      }
    });
    await tx.auditLog.create({
      data: {
        entityType: "signal",
        entityId: signalId,
        action: "promote_to_task",
        toValue: created.id
      }
    });
    return created;
  });

  return task.id;
}

export async function promoteCandidateToTask(candidateId: string): Promise<string> {
  const candidate = await prisma.candidate.findUnique({ where: { id: candidateId } });
  if (!candidate) throw new Error("candidate not found");
  if ((candidate.humanStatus ?? "pending") === "pending") {
    throw new Error("candidate must be triaged before converting to task");
  }

  let linkedSignalId: string | null = null;
  if (candidate.recordKey.startsWith("signal-sync:")) {
    const signalKey = candidate.recordKey.slice("signal-sync:".length);
    const signal = await prisma.signal.findUnique({ where: { recordKey: signalKey } });
    linkedSignalId = signal?.id ?? null;
  }

  const linkedReportId = await resolveLinkedReportId(candidate.date);

  const task = await prisma.$transaction(async (tx) => {
    const created = await tx.task.create({
      data: {
        title: candidate.title ?? "(untitled)",
        description: candidate.reason,
        origin: "signal",
        linkedSignalId,
        linkedReportId,
        status: "inbox",
        priority: candidate.priority
      }
    });
    await tx.auditLog.create({
      data: {
        entityType: "candidate",
        entityId: candidateId,
        action: "promote_to_task",
        toValue: created.id
      }
    });
    return created;
  });

  return task.id;
}

export async function promoteMemoToTask(memoId: string): Promise<string> {
  const memo = await prisma.memo.findUnique({ where: { id: memoId } });
  if (!memo) throw new Error("memo not found");

  const task = await prisma.$transaction(async (tx) => {
    const created = await tx.task.create({
      data: {
        title: memo.text,
        origin: "memo",
        status: "inbox",
        linkedSignalId: memo.linkedSignalId,
        description: memo.sourceContext ? `from: ${memo.sourceContext}` : null
      }
    });
    await tx.memo.delete({ where: { id: memoId } });
    await tx.auditLog.create({
      data: {
        entityType: "memo",
        entityId: memoId,
        action: "promote_to_task",
        toValue: created.id
      }
    });
    return created;
  });

  return task.id;
}

export async function getLatestDailyDateForTasks(): Promise<string | null> {
  return getLatestDailyDate();
}
