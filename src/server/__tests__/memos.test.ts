import { afterEach, describe, expect, it } from "vitest";
import { prisma } from "@/server/db";
import { countMemos, filterMemos, type MemoItem } from "@/shared/memos";
import { updateMemo } from "@/server/services/memos";

const memos: MemoItem[] = [
  { id: "1", text: "a", status: "open" },
  { id: "2", text: "b", status: "done" },
  { id: "3", text: "c", status: "open" }
];

describe("memos pure helpers", () => {
  it("filters by status", () => {
    expect(filterMemos(memos, "open").map((m) => m.id)).toEqual(["1", "3"]);
    expect(filterMemos(memos, "done").map((m) => m.id)).toEqual(["2"]);
    expect(filterMemos(memos, "all")).toHaveLength(3);
  });

  it("counts open/done", () => {
    expect(countMemos(memos)).toEqual({ open: 2, done: 1, total: 3 });
  });
});

describe("updateMemo", () => {
  const createdMemoIds: string[] = [];

  afterEach(async () => {
    for (const memoId of createdMemoIds.splice(0)) {
      await prisma.memo.deleteMany({ where: { id: memoId } });
    }
    await prisma.auditLog.deleteMany({ where: { action: "update_text" } });
  });

  it("updates memo text and writes audit log", async () => {
    const memo = await prisma.memo.create({
      data: { text: "original note", sourceContext: "manual" }
    });
    createdMemoIds.push(memo.id);

    await updateMemo(memo.id, "  revised note  ");

    const updated = await prisma.memo.findUnique({ where: { id: memo.id } });
    expect(updated?.text).toBe("revised note");

    const audit = await prisma.auditLog.findFirst({
      where: { entityType: "memo", entityId: memo.id, action: "update_text" }
    });
    expect(audit).toMatchObject({ fromValue: "original note", toValue: "revised note" });
  });

  it("rejects empty text", async () => {
    const memo = await prisma.memo.create({
      data: { text: "keep", sourceContext: "manual" }
    });
    createdMemoIds.push(memo.id);

    await expect(updateMemo(memo.id, "   ")).rejects.toThrow("memo text cannot be empty");
  });
});
