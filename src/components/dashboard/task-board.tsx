"use client";

import { useTransition } from "react";
import { updateTaskStatusAction } from "@/server/actions/taskActions";
import type { TaskItem } from "@/shared/tasks";
import { TASK_STATUSES } from "@/shared/tasks";

type TaskBoardProps = {
  grouped: Record<string, TaskItem[]>;
};

export function TaskBoard({ grouped }: TaskBoardProps) {
  const [pending, startTransition] = useTransition();

  const runStatus = (taskId: string, status: string) => {
    startTransition(() => void updateTaskStatusAction(taskId, status));
  };

  const total = TASK_STATUSES.reduce((n, s) => n + (grouped[s]?.length ?? 0), 0);
  if (total === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        暂无任务。在 Inbox/Memo 升级 memo，或在 Pools 中将已分拣条目转为 Task。
      </p>
    );
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      {TASK_STATUSES.map((status) => {
        const items = grouped[status] ?? [];
        return (
          <div
            key={status}
            className="flex w-64 shrink-0 flex-col rounded-lg border border-border bg-muted/20"
          >
            <div className="border-b border-border px-3 py-2">
              <h3 className="text-sm font-semibold capitalize text-foreground">
                {status.replace(/_/g, " ")}
                <span className="ml-2 font-normal text-muted-foreground">({items.length})</span>
              </h3>
            </div>
            <ul className="flex max-h-[70vh] flex-col gap-2 overflow-y-auto p-2">
              {items.map((task) => (
                <li key={task.id} className="rounded-md border border-border bg-surface p-3 text-sm">
                  <p className="font-medium text-foreground">{task.title}</p>
                  <div className="mt-2 flex flex-wrap gap-1 text-xs text-muted-foreground">
                    <span className="rounded bg-muted px-2 py-0.5">{task.origin}</span>
                    {task.priority ? (
                      <span className="rounded bg-muted px-2 py-0.5">{task.priority}</span>
                    ) : null}
                  </div>
                  <select
                    disabled={pending}
                    value={task.status}
                    onChange={(e) => runStatus(task.id, e.target.value)}
                    className="mt-2 w-full rounded border border-border bg-surface px-2 py-1 text-xs"
                    aria-label="Move task"
                  >
                    {TASK_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
