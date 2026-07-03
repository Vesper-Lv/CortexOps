"use client";

import { useMemo, useState, useTransition } from "react";
import { addMemoAction, deleteMemoAction, toggleMemoAction } from "@/server/actions/memoActions";
import { promoteMemoAction } from "@/server/actions/taskActions";
import { countMemos, filterMemos, type MemoFilter, type MemoItem } from "@/shared/memos";

type MemoListProps = {
  memos: MemoItem[];
};

export function MemoList({ memos }: MemoListProps) {
  const [filter, setFilter] = useState<MemoFilter>("all");
  const [pending, startTransition] = useTransition();

  const counts = useMemo(() => countMemos(memos), [memos]);
  const visible = useMemo(() => filterMemos(memos, filter), [memos, filter]);

  const run = (fn: () => Promise<void>) => startTransition(() => void fn());

  return (
    <div className="flex flex-col gap-6">
      <form action={addMemoAction} className="flex gap-2">
        <input
          name="text"
          type="text"
          placeholder="快速记录一个问题或待办…"
          disabled={pending}
          className="flex-1 rounded-md border border-border bg-surface px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          添加
        </button>
      </form>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted-foreground">
          Open {counts.open} · Done {counts.done} · Total {counts.total}
        </span>
        {(["all", "open", "done"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded px-2 py-1 capitalize ${
              filter === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="text-sm text-muted-foreground">暂无 memo，在上方输入框快速添加。</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {visible.map((memo) => (
            <li
              key={memo.id}
              className="flex items-start gap-3 rounded-md border border-border bg-surface px-3 py-2"
            >
              <input
                type="checkbox"
                checked={memo.status === "done"}
                disabled={pending}
                onChange={() => run(() => toggleMemoAction(memo.id))}
                className="mt-1"
              />
              <span
                className={`flex-1 text-sm ${memo.status === "done" ? "text-muted-foreground line-through" : "text-foreground"}`}
              >
                {memo.text}
              </span>
              <button
                type="button"
                disabled={pending}
                onClick={() => run(() => promoteMemoAction(memo.id))}
                className="text-xs text-primary hover:opacity-80 disabled:opacity-50"
              >
                升级为 Task
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => run(() => deleteMemoAction(memo.id))}
                className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
              >
                删除
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
