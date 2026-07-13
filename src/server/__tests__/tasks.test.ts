import { afterEach, describe, expect, it } from "vitest";
import { prisma } from "@/server/db";
import { listTasks, promoteMemoToTask } from "@/server/services/tasks";

describe("promoteMemoToTask", () => {
  const createdMemoIds: string[] = [];
  const createdTaskIds: string[] = [];

  afterEach(async () => {
    for (const taskId of createdTaskIds.splice(0)) {
      await prisma.task.deleteMany({ where: { id: taskId } });
    }
    for (const memoId of createdMemoIds.splice(0)) {
      await prisma.memo.deleteMany({ where: { id: memoId } });
    }
    await prisma.auditLog.deleteMany({ where: { action: "promote_to_task" } });
  });

  it("creates a task, deletes the memo, and writes an audit log", async () => {
    const memo = await prisma.memo.create({
      data: { text: "Follow up on reading pack", sourceContext: "manual", linkedSignalId: "sig-1" }
    });
    createdMemoIds.push(memo.id);

    const taskId = await promoteMemoToTask(memo.id);
    createdTaskIds.push(taskId);

    const deletedMemo = await prisma.memo.findUnique({ where: { id: memo.id } });
    const task = await prisma.task.findUnique({ where: { id: taskId } });
    const audit = await prisma.auditLog.findFirst({
      where: { entityType: "memo", entityId: memo.id, action: "promote_to_task" }
    });

    expect(deletedMemo).toBeNull();
    expect(task).toMatchObject({
      title: "Follow up on reading pack",
      origin: "memo",
      status: "inbox",
      linkedSignalId: "sig-1",
      description: "from: manual"
    });
    expect(audit?.toValue).toBe(taskId);
  });

  it("throws when memo is missing", async () => {
    await expect(promoteMemoToTask("missing-memo-id")).rejects.toThrow("memo not found");
  });
});

describe("listTasks", () => {
  const createdTaskIds: string[] = [];

  afterEach(async () => {
    for (const taskId of createdTaskIds.splice(0)) {
      await prisma.task.deleteMany({ where: { id: taskId } });
    }
  });

  it("returns tasks ordered by newest first", async () => {
    const older = await prisma.task.create({
      data: { title: "Older task", origin: "manual", status: "inbox", createdAt: new Date("2026-01-01") }
    });
    const newer = await prisma.task.create({
      data: { title: "Newer task", origin: "memo", status: "inbox", createdAt: new Date("2026-06-01") }
    });
    createdTaskIds.push(older.id, newer.id);

    const tasks = await listTasks();

    expect(tasks.map((t) => t.title)).toEqual(["Newer task", "Older task"]);
  });
});
