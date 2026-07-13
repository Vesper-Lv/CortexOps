"use client";

import { useState, useTransition } from "react";
import { updateTaskAction, updateTaskStatusAction } from "@/server/actions/taskActions";
import { PRIORITY_OPTIONS } from "@/shared/priorityOptions";
import type { TaskItem } from "@/shared/tasks";
import { TASK_STATUSES } from "@/shared/tasks";

const QUICK_STATUS_OPTIONS = [
  { label: "Today", status: "today" },
  { label: "In progress", status: "in_progress" },
  { label: "Done", status: "done" }
] as const;

type TaskBoardProps = {
  grouped: Record<string, TaskItem[]>;
};

function TaskCard({
  task,
  pending,
  runStatus,
  runUpdate
}: {
  task: TaskItem;
  pending: boolean;
  runStatus: (taskId: string, status: string) => void;
  runUpdate: (
    taskId: string,
    input: { title: string; description: string | null; priority: string | null }
  ) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [priority, setPriority] = useState(task.priority ?? "");

  const startEdit = () => {
    setTitle(task.title);
    setDescription(task.description ?? "");
    setPriority(task.priority ?? "");
    setEditing(true);
  };

  const cancelEdit = () => {
    setTitle(task.title);
    setDescription(task.description ?? "");
    setPriority(task.priority ?? "");
    setEditing(false);
  };

  const saveEdit = () => {
    const nextTitle = title.trim();
    if (!nextTitle) return;
    runUpdate(task.id, {
      title: nextTitle,
      description: description.trim() || null,
      priority: priority || null
    });
    setEditing(false);
  };

  return (
    <li className="rounded-md border border-border bg-surface p-3 text-sm">
      {editing ? (
        <div className="flex flex-col gap-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={pending}
            className="w-full rounded border border-border bg-surface px-2 py-1 text-sm font-medium"
            aria-label="Task title"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={pending}
            rows={4}
            placeholder="详细描述：目标、步骤、验收标准…"
            className="w-full rounded border border-border bg-surface px-2 py-1.5 text-xs leading-5 text-foreground"
            aria-label="Task description"
          />
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            disabled={pending}
            className="rounded border border-border bg-surface px-2 py-1 text-xs"
            aria-label="Task priority"
          >
            <option value="">优先级（可选）</option>
            {PRIORITY_OPTIONS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={pending || !title.trim()}
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
          <div className="flex items-start justify-between gap-2">
            <p className="font-medium text-foreground">{task.title}</p>
            <button
              type="button"
              disabled={pending}
              onClick={startEdit}
              className="shrink-0 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
            >
              编辑
            </button>
          </div>
          {task.description ? (
            <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-muted-foreground">
              {task.description}
            </p>
          ) : (
            <p className="mt-2 text-xs italic text-muted-foreground">暂无详细描述</p>
          )}
          <div className="mt-2 flex flex-wrap gap-1 text-xs text-muted-foreground">
            <span className="rounded bg-muted px-2 py-0.5">{task.origin}</span>
            {task.priority ? (
              <span className="rounded bg-muted px-2 py-0.5">{task.priority}</span>
            ) : null}
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {QUICK_STATUS_OPTIONS.map(({ label, status }) => (
              <button
                key={status}
                type="button"
                disabled={pending || task.status === status}
                onClick={() => runStatus(task.id, status)}
                className="rounded border border-border bg-muted/40 px-2 py-0.5 text-xs text-foreground hover:bg-muted disabled:opacity-50"
              >
                {label}
              </button>
            ))}
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
        </>
      )}
    </li>
  );
}

export function TaskBoard({ grouped }: TaskBoardProps) {
  const [pending, startTransition] = useTransition();

  const runStatus = (taskId: string, status: string) => {
    startTransition(() => void updateTaskStatusAction(taskId, status));
  };

  const runUpdate = (
    taskId: string,
    input: { title: string; description: string | null; priority: string | null }
  ) => {
    startTransition(() => void updateTaskAction(taskId, input));
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
            className="flex w-72 shrink-0 flex-col rounded-lg border border-border bg-muted/20"
          >
            <div className="border-b border-border px-3 py-2">
              <h3 className="text-sm font-semibold capitalize text-foreground">
                {status.replace(/_/g, " ")}
                <span className="ml-2 font-normal text-muted-foreground">({items.length})</span>
              </h3>
            </div>
            <ul className="flex max-h-[70vh] flex-col gap-2 overflow-y-auto p-2">
              {items.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  pending={pending}
                  runStatus={runStatus}
                  runUpdate={runUpdate}
                />
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
