import { describe, expect, it } from "vitest";
import { countMemos, filterMemos, type MemoItem } from "@/shared/memos";

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
