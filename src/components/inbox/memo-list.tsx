"use client";

import { useMemo, useState, useTransition } from "react";
import {
  addMemoAction,
  deleteMemoAction,
  toggleMemoAction,
  updateMemoAction
} from "@/server/actions/memoActions";
import { promoteMemoAction } from "@/server/actions/taskActions";
import { IconButton } from "@/components/shared/icon-button";
import { countMemos, filterMemos, type MemoFilter, type MemoItem } from "@/shared/memos";

type MemoListProps = {
  memos: MemoItem[];
};

function MemoRow({
  memo,
  pending,
  run
}: {
  memo: MemoItem;
  pending: boolean;
  run: (fn: () => Promise<void>) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(memo.text);

  const startEdit = () => {
    setDraft(memo.text);
    setEditing(true);
  };

  const cancelEdit = () => {
    setDraft(memo.text);
    setEditing(false);
  };

  const saveEdit = () => {
    const trimmed = draft.trim();
    if (!trimmed || trimmed === memo.text) {
      cancelEdit();
      return;
    }
    run(async () => {
      await updateMemoAction(memo.id, trimmed);
      setEditing(false);
    });
  };

  return (
    <li className="flex items-start gap-3 rounded-md border border-border bg-surface px-3 py-2">
      <input
        type="checkbox"
        checked={memo.status === "done"}
        disabled={pending || editing}
        onChange={() => run(() => toggleMemoAction(memo.id))}
        className="mt-1"
      />
      {editing ? (
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            disabled={pending}
            rows={3}
            className="w-full rounded-md border border-border bg-surface px-2 py-1.5 text-sm"
            aria-label="Edit memo text"
          />
          <div className="flex gap-2">
            <button
              type="button"
              disabled={pending || !draft.trim()}
              onClick={saveEdit}
              className="rounded bg-primary px-2 py-1 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              保存
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={cancelEdit}
              className="rounded border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-muted disabled:opacity-50"
            >
              取消
            </button>
          </div>
        </div>
      ) : (
        <>
          <span
            className={`flex-1 text-sm ${memo.status === "done" ? "text-muted-foreground line-through" : "text-foreground"}`}
          >
            {memo.text}
          </span>
          <div className="flex shrink-0 gap-1">
            <IconButton kind="edit" label="编辑" disabled={pending} onClick={startEdit} />
            <IconButton
              kind="promote"
              label="升级为 Task"
              disabled={pending}
              onClick={() => run(() => promoteMemoAction(memo.id))}
            />
            <IconButton
              kind="delete"
              label="删除"
              disabled={pending}
              onClick={() => run(() => deleteMemoAction(memo.id))}
            />
          </div>
        </>
      )}
    </li>
  );
}

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
            <MemoRow key={memo.id} memo={memo} pending={pending} run={run} />
          ))}
        </ul>
      )}
    </div>
  );
}
