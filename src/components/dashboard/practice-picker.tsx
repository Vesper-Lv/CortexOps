"use client";

import { useState, useTransition } from "react";
import { promoteCandidateToTaskAction } from "@/server/actions/taskActions";
import type { RankedItem } from "@/server/services/poolRanking";

type Props = {
  items: RankedItem[];
};

export function PracticePicker({ items }: Props) {
  const [pending, startTransition] = useTransition();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirmedId, setConfirmedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (items.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
        工程池暂无可练习条目。导入数据后，系统会从 practice_fit 为 high/medium 的工程候选中推荐三项。
      </p>
    );
  }

  const top = items.slice(0, 3);

  const handleConfirm = () => {
    if (selectedId == null) {
      setError("请先选择一条练习");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await promoteCandidateToTaskAction(selectedId);
        setConfirmedId(selectedId);
      } catch (e) {
        setError(e instanceof Error ? e.message : "确认失败");
      }
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted-foreground">
        以下来自工程池练习适配 Top 3，单选一条并确认后自动创建 Task；也可对任意条目手动添加为 Task。
      </p>
      {top.map((item) => {
        const isSelected = selectedId === item.id;
        const isConfirmed = confirmedId === item.id;
        return (
          <label
            key={item.id}
            className={`flex cursor-pointer flex-col gap-2 rounded-md border p-4 transition-colors ${
              isSelected ? "border-primary bg-primary/5" : "border-border bg-surface"
            }`}
          >
            <div className="flex items-start gap-3">
              <input
                type="radio"
                name="practice"
                checked={isSelected}
                onChange={() => setSelectedId(item.id)}
                className="mt-1"
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="rounded bg-muted px-2 py-0.5">{item.pool}</span>
                  {item.priority && (
                    <span className="rounded bg-muted px-2 py-0.5">{item.priority}</span>
                  )}
                  {item.practiceFit && <span>practice_fit: {item.practiceFit}</span>}
                  <span>rank: {item.rankScore.toFixed(2)}</span>
                  {isConfirmed && (
                    <span className="rounded bg-primary/10 px-2 py-0.5 text-primary">已创建 Task</span>
                  )}
                </div>
                <a
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 block text-base font-semibold text-foreground hover:underline"
                >
                  {item.title}
                </a>
                {item.summary && (
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.summary}</p>
                )}
              </div>
            </div>
            <div className="ml-7">
              <button
                type="button"
                disabled={pending}
                onClick={(e) => {
                  e.preventDefault();
                  startTransition(async () => {
                    try {
                      await promoteCandidateToTaskAction(item.id);
                      setConfirmedId(item.id);
                    } catch (err) {
                      setError(err instanceof Error ? err.message : "添加失败");
                    }
                  });
                }}
                className="rounded border border-border bg-surface px-3 py-1 text-xs font-medium hover:bg-muted disabled:opacity-50"
              >
                手动添加为task
              </button>
            </div>
          </label>
        );
      })}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <button
        type="button"
        disabled={pending || selectedId == null}
        onClick={handleConfirm}
        className="self-start rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        确认今日练习
      </button>
    </div>
  );
}
