"use client";

import { useState, useTransition } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { updateTaskStatusAction } from "@/server/actions/taskActions";
import type { TaskItem } from "@/shared/tasks";
import { isValidTaskStatus, TASK_STATUSES } from "@/shared/tasks";

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
  onStatus
}: {
  task: TaskItem;
  pending: boolean;
  onStatus: (taskId: string, status: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id
  });
  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined;

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`rounded-md border border-border bg-surface p-3 text-sm ${
        isDragging ? "opacity-40" : ""
      }`}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          aria-label="Drag to another column"
          disabled={pending}
          {...listeners}
          {...attributes}
          className="hidden shrink-0 cursor-grab rounded border border-border px-1.5 py-0.5 text-xs text-muted-foreground hover:bg-muted active:cursor-grabbing md:inline-block"
        >
          ⋮⋮
        </button>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-foreground">{task.title}</p>
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
                onClick={() => onStatus(task.id, status)}
                className="rounded border border-border bg-muted/40 px-2 py-0.5 text-xs text-foreground hover:bg-muted disabled:opacity-50"
              >
                {label}
              </button>
            ))}
          </div>
          <select
            disabled={pending}
            value={task.status}
            onChange={(e) => onStatus(task.id, e.target.value)}
            className="mt-2 w-full rounded border border-border bg-surface px-2 py-1 text-xs"
            aria-label="Move task"
          >
            {TASK_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>
    </li>
  );
}

function TaskColumn({
  status,
  items,
  pending,
  onStatus
}: {
  status: string;
  items: TaskItem[];
  pending: boolean;
  onStatus: (taskId: string, status: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div
      ref={setNodeRef}
      className={`flex w-64 shrink-0 flex-col rounded-lg border border-border bg-muted/20 ${
        isOver ? "ring-2 ring-primary/40" : ""
      }`}
    >
      <div className="border-b border-border px-3 py-2">
        <h3 className="text-sm font-semibold capitalize text-foreground">
          {status.replace(/_/g, " ")}
          <span className="ml-2 font-normal text-muted-foreground">({items.length})</span>
        </h3>
      </div>
      <ul className="flex max-h-[70vh] flex-col gap-2 overflow-y-auto p-2">
        {items.map((task) => (
          <TaskCard key={task.id} task={task} pending={pending} onStatus={onStatus} />
        ))}
      </ul>
    </div>
  );
}

export function TaskBoard({ grouped }: TaskBoardProps) {
  const [pending, startTransition] = useTransition();
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const taskMap = new Map<string, TaskItem>();
  for (const status of TASK_STATUSES) {
    for (const task of grouped[status] ?? []) {
      taskMap.set(task.id, task);
    }
  }

  const activeTask = activeId ? taskMap.get(activeId) : undefined;

  const runStatus = (taskId: string, status: string) => {
    startTransition(() => void updateTaskStatusAction(taskId, status));
  };

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const task = taskMap.get(String(active.id));
    if (!task) return;

    const targetStatus = String(over.id);
    if (!isValidTaskStatus(targetStatus) || targetStatus === task.status) return;

    runStatus(task.id, targetStatus);
  }

  const total = TASK_STATUSES.reduce((n, s) => n + (grouped[s]?.length ?? 0), 0);
  if (total === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        暂无任务。在 Inbox/Memo 升级 memo，或在 Pools 中将已分拣条目转为 Task。
      </p>
    );
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-2">
        {TASK_STATUSES.map((status) => (
          <TaskColumn
            key={status}
            status={status}
            items={grouped[status] ?? []}
            pending={pending}
            onStatus={runStatus}
          />
        ))}
      </div>
      <DragOverlay>
        {activeTask ? (
          <div className="w-64 rounded-md border border-border bg-surface p-3 text-sm shadow-lg">
            <span className="font-medium">{activeTask.title}</span>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
