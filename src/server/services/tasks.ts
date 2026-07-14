import { prisma } from "@/server/db";
import { getLatestDailyDate } from "@/server/services/dailyView";
import type { TaskItem } from "@/shared/tasks";
import { ACTIVE_TASK_STATUSES, assertValidTaskStatus } from "@/shared/tasks";
import { canPromoteItem } from "@/shared/signalStatus";

export type { TaskItem } from "@/shared/tasks";

function mapTask(t: {
  id: string;
  title: string;
  description: string | null;
  origin: string;
  linkedSignalId: string | null;
  linkedCandidateId: string | null;
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
    linkedCandidateId: t.linkedCandidateId,
    linkedReportId: t.linkedReportId,
    status: t.status,
    priority: t.priority,
    createdAt: t.createdAt
  };
}

function assertPromotable(input: {
  humanStatus: string | null;
  status: string | null;
  finalPool: string | null;
}): void {
  const humanStatus = input.humanStatus ?? "pending";
  if (!canPromoteItem({ humanStatus, status: input.status, finalPool: input.finalPool })) {
    if (humanStatus === "pending") {
      throw new Error("item must be triaged before converting to task");
    }
    throw new Error("cannot convert dropped item to task");
  }
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

export type UpdateTaskInput = {
  title?: string;
  description?: string | null;
  priority?: string | null;
};

export async function updateTask(taskId: string, input: UpdateTaskInput): Promise<void> {
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) throw new Error("task not found");

  const data: {
    title?: string;
    description?: string | null;
    priority?: string | null;
  } = {};

  if (input.title !== undefined) {
    const title = input.title.trim();
    if (!title) throw new Error("task title cannot be empty");
    if (title !== task.title) data.title = title;
  }
  if (input.description !== undefined) {
    const description =
      input.description === null ? null : input.description.trim() || null;
    if (description !== task.description) data.description = description;
  }
  if (input.priority !== undefined) {
    const priority =
      input.priority === null || input.priority === "" ? null : input.priority;
    if (priority !== task.priority) data.priority = priority;
  }

  if (Object.keys(data).length === 0) return;

  const fromValue = JSON.stringify({
    title: task.title,
    description: task.description,
    priority: task.priority
  });
  const toValue = JSON.stringify({
    title: data.title ?? task.title,
    description: data.description !== undefined ? data.description : task.description,
    priority: data.priority !== undefined ? data.priority : task.priority
  });

  await prisma.$transaction([
    prisma.task.update({ where: { id: taskId }, data }),
    prisma.auditLog.create({
      data: {
        entityType: "task",
        entityId: taskId,
        action: "update_fields",
        fromValue,
        toValue
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
  assertPromotable({
    humanStatus: signal.humanStatus,
    status: signal.status,
    finalPool: signal.finalPool
  });

  const existing = await prisma.task.findFirst({ where: { linkedSignalId: signal.id } });
  if (existing) return existing.id;

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
  assertPromotable({
    humanStatus: candidate.humanStatus,
    status: candidate.status,
    finalPool: candidate.finalPool
  });

  const existingByCandidate = await prisma.task.findFirst({
    where: { linkedCandidateId: candidate.id }
  });
  if (existingByCandidate) return existingByCandidate.id;

  let linkedSignalId: string | null = null;
  if (candidate.recordKey.startsWith("signal-sync:")) {
    const signalKey = candidate.recordKey.slice("signal-sync:".length);
    const signal = await prisma.signal.findUnique({ where: { recordKey: signalKey } });
    linkedSignalId = signal?.id ?? null;
    if (linkedSignalId) {
      const existingBySignal = await prisma.task.findFirst({ where: { linkedSignalId } });
      if (existingBySignal) return existingBySignal.id;
    }
  }

  const linkedReportId = await resolveLinkedReportId(candidate.date);

  const task = await prisma.$transaction(async (tx) => {
    const created = await tx.task.create({
      data: {
        title: candidate.title ?? "(untitled)",
        description: candidate.reason,
        origin: "signal",
        linkedSignalId,
        linkedCandidateId: candidate.id,
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

export async function createManualTask(input: {
  title: string;
  description?: string | null;
  priority?: string | null;
  status?: string;
}): Promise<string> {
  const title = input.title.trim();
  if (!title) throw new Error("task title cannot be empty");
  const status = input.status ?? "inbox";
  assertValidTaskStatus(status);
  const description =
    input.description === undefined || input.description === null
      ? null
      : input.description.trim() || null;
  const priority =
    input.priority === undefined || input.priority === null || input.priority === ""
      ? null
      : input.priority;

  const task = await prisma.$transaction(async (tx) => {
    const created = await tx.task.create({
      data: {
        title,
        description,
        priority,
        origin: "manual",
        status
      }
    });
    await tx.auditLog.create({
      data: {
        entityType: "task",
        entityId: created.id,
        action: "create_manual",
        toValue: title
      }
    });
    return created;
  });
  return task.id;
}

/** Idempotent practice → today Task. Marker: `[practice:YYYY-MM-DD:index]` in description. */
export function practiceTaskMarker(date: string, practiceIndex: number): string {
  return `[practice:${date}:${practiceIndex}]`;
}

export async function createPracticeTask(input: {
  date: string;
  practiceIndex: number;
  title: string;
  body: string;
}): Promise<{ taskId: string; created: boolean }> {
  const marker = practiceTaskMarker(input.date, input.practiceIndex);
  const existing = await prisma.task.findFirst({
    where: {
      origin: "practice",
      description: { contains: marker }
    },
    select: { id: true }
  });
  if (existing) return { taskId: existing.id, created: false };

  const title = input.title.trim() || "今日练习";
  const body = input.body.trim();
  const description = body ? `${marker}\n${body}` : marker;

  const task = await prisma.$transaction(async (tx) => {
    const created = await tx.task.create({
      data: {
        title,
        description,
        origin: "practice",
        status: "today"
      }
    });
    await tx.auditLog.create({
      data: {
        entityType: "task",
        entityId: created.id,
        action: "create_practice",
        toValue: JSON.stringify({ date: input.date, index: input.practiceIndex, title })
      }
    });
    return created;
  });

  return { taskId: task.id, created: true };
}

export async function findPracticeTaskId(
  date: string,
  practiceIndex: number
): Promise<string | null> {
  const marker = practiceTaskMarker(date, practiceIndex);
  const row = await prisma.task.findFirst({
    where: { origin: "practice", description: { contains: marker } },
    select: { id: true }
  });
  return row?.id ?? null;
}

export async function getLatestDailyDateForTasks(): Promise<string | null> {
  return getLatestDailyDate();
}
