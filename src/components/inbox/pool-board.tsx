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
import {
  moveCandidatePool,
  updateCandidatePriorityAction,
  watchCandidateAction
} from "@/server/actions/candidateActions";
import { promoteCandidateToTaskAction } from "@/server/actions/taskActions";
import { SummaryTooltip } from "@/components/shared/summary-tooltip";
import {
  POOL_OPTIONS,
  poolOptionFromName,
  type PoolOption
} from "@/shared/poolOptions";
import { PRIORITY_OPTIONS } from "@/shared/priorityOptions";
import { canPromoteItem, canWatchCandidate } from "@/shared/signalStatus";
import type { PoolGroup } from "@/shared/inboxTypes";

type PoolBoardProps = {
  groups: PoolGroup[];
};

function poolColumnId(poolName: string): string {
  return poolOptionFromName(poolName) ?? poolName;
}

function PoolCard({
  item,
  poolOption,
  pending,
  onMove,
  onPriority,
  onWatch,
  onTask
}: {
  item: PoolGroup["items"][number];
  poolOption: PoolOption | null;
  pending: boolean;
  onMove: (candidateId: string, toPool: string) => void;
  onPriority: (candidateId: string, priority: string) => void;
  onWatch: (candidateId: string) => void;
  onTask: (candidateId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: item.id,
    data: { poolOption }
  });

  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined;
  const showWatch = canWatchCandidate({
    humanStatus: item.humanStatus,
    status: item.status,
    finalPool: item.finalPool
  });
  const showConvert =
    canPromoteItem({
      humanStatus: item.humanStatus,
      status: item.status,
      finalPool: item.finalPool
    }) && !item.hasLinkedTask;
  const lifecycleStatus = item.status ?? "inbox";

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`rounded-md border border-border bg-surface p-3 text-sm ${
        isDragging ? "opacity-40" : ""
      }`}
    >
      <div className="flex flex-col gap-2">
        <div className="flex items-start gap-2">
          <button
            type="button"
            aria-label="Drag to another pool"
            disabled={pending}
            {...listeners}
            {...attributes}
            className="hidden shrink-0 cursor-grab rounded border border-border px-1.5 py-0.5 text-xs text-muted-foreground hover:bg-muted active:cursor-grabbing md:inline-block"
          >
            ⋮⋮
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex items-start gap-2">
              <a
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-foreground hover:underline"
              >
                {item.title}
              </a>
              <SummaryTooltip summary={item.summary} />
            </div>
            <div className="mt-1 flex flex-wrap gap-1">
              <span className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {item.humanStatus}
              </span>
              {lifecycleStatus !== "inbox" && (
                <span className="rounded bg-primary/10 px-2 py-0.5 text-xs text-primary">
                  {lifecycleStatus}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            disabled={pending}
            value={item.priority || ""}
            onChange={(e) => {
              const priority = e.target.value;
              if (priority && priority !== item.priority) onPriority(item.id, priority);
            }}
            className="rounded border border-border bg-surface px-2 py-1 text-xs"
            aria-label="Candidate priority"
          >
            <option value="" disabled>
              优先级…
            </option>
            {PRIORITY_OPTIONS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          {showWatch && lifecycleStatus !== "watching" && (
            <button
              type="button"
              disabled={pending}
              onClick={() => onWatch(item.id)}
              className="rounded border border-border bg-surface px-2 py-1 text-xs hover:bg-muted disabled:opacity-50"
            >
              关注
            </button>
          )}
          {showConvert && (
            <button
              type="button"
              disabled={pending}
              onClick={() => onTask(item.id)}
              className="rounded border border-border bg-surface px-2 py-1 text-xs hover:bg-muted disabled:opacity-50"
            >
              → Task
            </button>
          )}
          <select
            disabled={pending}
            value={poolOption ?? ""}
            onChange={(e) => {
              const toPool = e.target.value;
              if (toPool && toPool !== poolOption) onMove(item.id, toPool);
            }}
            className="min-w-0 flex-1 rounded border border-border bg-surface px-2 py-1 text-xs md:hidden"
            aria-label="Move to pool"
          >
            <option value="" disabled>
              Move to pool…
            </option>
            {POOL_OPTIONS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
      </div>
    </li>
  );
}

function PoolColumn({
  group,
  pending,
  onMove,
  onPriority,
  onWatch,
  onTask
}: {
  group: PoolGroup;
  pending: boolean;
  onMove: (candidateId: string, toPool: string) => void;
  onPriority: (candidateId: string, priority: string) => void;
  onWatch: (candidateId: string) => void;
  onTask: (candidateId: string) => void;
}) {
  const columnId = poolColumnId(group.poolName);
  const { setNodeRef, isOver } = useDroppable({ id: columnId });

  return (
    <div
      ref={setNodeRef}
      className={`flex w-72 shrink-0 flex-col rounded-lg border border-border bg-muted/20 ${
        isOver ? "ring-2 ring-primary/50" : ""
      }`}
    >
      <div className="border-b border-border px-3 py-2">
        <h3 className="text-sm font-semibold text-foreground">
          {group.poolName}
          <span className="ml-2 font-normal text-muted-foreground">({group.items.length})</span>
        </h3>
      </div>
      <ul className="flex max-h-[70vh] flex-col gap-2 overflow-y-auto p-2">
        {group.items.map((item) => (
          <PoolCard
            key={item.id}
            item={item}
            poolOption={poolOptionFromName(group.poolName)}
            pending={pending}
            onMove={onMove}
            onPriority={onPriority}
            onWatch={onWatch}
            onTask={onTask}
          />
        ))}
      </ul>
    </div>
  );
}

export function PoolBoard({ groups }: PoolBoardProps) {
  const [pending, startTransition] = useTransition();
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const itemMap = new Map<string, { item: PoolGroup["items"][number]; poolOption: PoolOption | null }>();
  for (const group of groups) {
    const poolOption = poolOptionFromName(group.poolName);
    for (const item of group.items) {
      itemMap.set(item.id, { item, poolOption });
    }
  }

  const activeEntry = activeId ? itemMap.get(activeId) : undefined;

  const runMove = (candidateId: string, toPool: string) => {
    startTransition(() => {
      void moveCandidatePool(candidateId, toPool);
    });
  };

  const runPriority = (candidateId: string, priority: string) => {
    startTransition(() => {
      void updateCandidatePriorityAction(candidateId, priority);
    });
  };

  const runWatch = (candidateId: string) => {
    startTransition(() => {
      void watchCandidateAction(candidateId);
    });
  };

  const runTask = (candidateId: string) => {
    startTransition(() => {
      void promoteCandidateToTaskAction(candidateId);
    });
  };

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const entry = itemMap.get(String(active.id));
    if (!entry?.poolOption) return;

    const targetPool = String(over.id) as PoolOption;
    if (targetPool === entry.poolOption) return;

    runMove(entry.item.id, targetPool);
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-2">
        {groups.map((group) => (
          <PoolColumn
            key={group.poolName}
            group={group}
            pending={pending}
            onMove={runMove}
            onPriority={runPriority}
            onWatch={runWatch}
            onTask={runTask}
          />
        ))}
      </div>
      <DragOverlay>
        {activeEntry ? (
          <div className="w-72 rounded-md border border-border bg-surface p-3 text-sm shadow-lg">
            <span className="font-medium">{activeEntry.item.title}</span>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
