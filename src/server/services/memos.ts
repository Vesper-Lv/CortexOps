import { prisma } from "@/server/db";
import type { MemoItem } from "@/shared/memos";

export type { MemoFilter, MemoItem } from "@/shared/memos";
export { countMemos, filterMemos } from "@/shared/memos";

export async function listMemos(): Promise<MemoItem[]> {
  const rows = await prisma.memo.findMany({ orderBy: { createdAt: "desc" } });
  return rows.map((m) => ({ id: m.id, text: m.text, status: m.status }));
}

export async function createMemo(text: string): Promise<void> {
  const trimmed = text.trim();
  if (!trimmed) return;
  await prisma.memo.create({ data: { text: trimmed, sourceContext: "manual" } });
}

export async function toggleMemo(id: string): Promise<void> {
  const memo = await prisma.memo.findUnique({ where: { id } });
  if (!memo) return;
  await prisma.memo.update({ where: { id }, data: { status: memo.status === "open" ? "done" : "open" } });
}

export async function deleteMemo(id: string): Promise<void> {
  await prisma.memo.delete({ where: { id } });
}
