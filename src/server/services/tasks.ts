import { prisma } from "@/server/db";
import type { TaskItem } from "@/shared/tasks";

export type { TaskItem } from "@/shared/tasks";

export async function listTasks(): Promise<TaskItem[]> {
  const rows = await prisma.task.findMany({ orderBy: { createdAt: "desc" } });
  return rows.map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    origin: t.origin,
    linkedSignalId: t.linkedSignalId,
    status: t.status,
    priority: t.priority,
    createdAt: t.createdAt
  }));
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
