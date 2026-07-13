export type MemoItem = { id: string; text: string; status: string };
export type MemoFilter = "all" | "open" | "done";

export function filterMemos(memos: MemoItem[], filter: MemoFilter): MemoItem[] {
  if (filter === "all") return memos;
  return memos.filter((m) => m.status === filter);
}

export function countMemos(memos: MemoItem[]): { open: number; done: number; total: number } {
  const open = memos.filter((m) => m.status === "open").length;
  const done = memos.filter((m) => m.status === "done").length;
  return { open, done, total: memos.length };
}
