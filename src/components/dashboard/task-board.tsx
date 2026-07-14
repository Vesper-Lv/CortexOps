"use client";

import { useState, useTransition } from "react";
import { promoteTaskToArtifactAction } from "@/server/actions/artifactActions";
import {
  createManualTaskAction,
  updateTaskAction,
  updateTaskStatusAction
} from "@/server/actions/taskActions";
import { IconButton } from "@/components/shared/icon-button";
import { PRIORITY_OPTIONS } from "@/shared/priorityOptions";
import type { TaskItem } from "@/shared/tasks";
import { TASK_STATUSES } from "@/shared/tasks";

type TaskBoardProps = {
  grouped: Record<string, TaskItem[]>;
};

function isNoisyDescription(description: string | null, origin: string): boolean {
  if (!description) return true;
  const trimmed = description.trim();
  if (!trimmed) return true;
  if (origin === "manual" || origin === "memo") {
    return /^from:\s*manual$/i.test(trimmed);
  }
  if (origin === "practice") {
    const withoutMarker = trimmed.replace(/^\[practice:[^\]]+\]\s*/i, "").trim();
    return withoutMarker.length === 0;
  }
  return false;
}

function displayDescription(description: string | null, origin: string): string {
  if (!description) return "";
  if (origin === "practice") {
    return description.replace(/^\[practice:[^\]]+\]\s*/i, "").trim();
  }
  return description.trim();
}

function TaskCard({
  task,
  pending,
  runStatus,
  runUpdate,
  runArtifact
}: {
  task: TaskItem;
  pending: boolean;
  runStatus: (taskId: string, status: string) => void;
  runUpdate: (
    taskId: string,
    input: { title: string; description: string | null; priority: string | null }
  ) => void;
  runArtifact: (taskId: string) => void;
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

  const showDescription = !isNoisyDescription(task.description, task.origin);
  const showOrigin = task.origin !== "manual";

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
            <IconButton kind="edit" label="编辑任务" disabled={pending} onClick={startEdit} />
          </div>
          {showDescription ? (
            <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-muted-foreground">
              {displayDescription(task.description, task.origin)}
            </p>
          ) : null}
          {(showOrigin || task.priority) && (
            <div className="mt-2 flex flex-wrap gap-1 text-xs text-muted-foreground">
              {showOrigin ? <span className="rounded bg-muted px-2 py-0.5">{task.origin}</span> : null}
              {task.priority ? (
                <span className="rounded bg-muted px-2 py-0.5">{task.priority}</span>
              ) : null}
            </div>
          )}
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
          {task.status === "done" && (
            <button
              type="button"
              disabled={pending}
              onClick={() => runArtifact(task.id)}
              className="mt-2 w-full rounded border border-border bg-surface px-2 py-1 text-xs hover:bg-muted disabled:opacity-50"
            >
              沉淀为 Artifact
            </button>
          )}
        </>
      )}
    </li>
  );
}

export function TaskBoard({ grouped }: TaskBoardProps) {
  const [pending, startTransition] = useTransition();
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");

  const runStatus = (taskId: string, status: string) => {
    startTransition(() => void updateTaskStatusAction(taskId, status));
  };

  const runUpdate = (
    taskId: string,
    input: { title: string; description: string | null; priority: string | null }
  ) => {
    startTransition(() => void updateTaskAction(taskId, input));
  };

  const runArtifact = (taskId: string) => {
    startTransition(() => void promoteTaskToArtifactAction(taskId));
  };

  const submitCreate = () => {
    const title = newTitle.trim();
    if (!title) return;
    startTransition(async () => {
      await createManualTaskAction({
        title,
        description: newDescription.trim() || null
      });
      setNewTitle("");
      setNewDescription("");
      setCreating(false);
    });
  };

  const total = TASK_STATUSES.reduce((n, s) => n + (grouped[s]?.length ?? 0), 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <IconButton
          kind="add"
          label="新建任务"
          disabled={pending}
          onClick={() => setCreating((v) => !v)}
        />
        <span className="text-xs text-muted-foreground">新建任务</span>
      </div>

      {creating && (
        <div className="max-w-xl rounded-md border border-border bg-surface p-3">
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                submitCreate();
              }
            }}
            disabled={pending}
            placeholder="任务标题"
            className="w-full rounded border border-border bg-surface px-2 py-1.5 text-sm"
            aria-label="New task title"
          />
          <textarea
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            disabled={pending}
            rows={3}
            placeholder="可选：步骤与验收标准"
            className="mt-2 w-full rounded border border-border bg-surface px-2 py-1.5 text-xs"
            aria-label="New task description"
          />
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              disabled={pending || !newTitle.trim()}
              onClick={submitCreate}
              className="rounded bg-primary px-3 py-1 text-xs font-medium text-primary-foreground disabled:opacity-50"
            >
              创建
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                setCreating(false);
                setNewTitle("");
                setNewDescription("");
              }}
              className="rounded border border-border px-3 py-1 text-xs text-muted-foreground hover:bg-muted"
            >
              取消
            </button>
          </div>
        </div>
      )}

      {total === 0 ? (
        <p className="text-sm text-muted-foreground">
          暂无任务。点击上方 + 直接创建，或从 Memo / Pools 升级。
        </p>
      ) : (
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
                      runArtifact={runArtifact}
                    />
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
