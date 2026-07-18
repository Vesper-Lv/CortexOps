"use client";

import { useTransition } from "react";
import {
  moveCandidatePool,
  updateCandidatePriorityAction,
  watchCandidateAction
} from "@/server/actions/candidateActions";
import { IconButton } from "@/components/shared/icon-button";
import { SummaryTooltip } from "@/components/shared/summary-tooltip";
import { poolOptionFromName } from "@/shared/poolOptions";
import { PRIORITY_OPTIONS } from "@/shared/priorityOptions";
import { canWatchCandidate } from "@/shared/signalStatus";
import type { PoolGroup } from "@/shared/inboxTypes";

const POOL_DISPLAY_NAMES: Record<string, string> = {
  product: "产品",
  paper: "论文",
  engineering: "工程",
  archive: "归档"
};

type PoolBoardProps = {
  groups: PoolGroup[];
};

function PoolCard({
  item,
  poolOption,
  pending,
  onMove,
  onPriority,
  onWatch,
  onDrop
}: {
  item: PoolGroup["items"][number];
  poolOption: string | null;
  pending: boolean;
  onMove: (candidateId: string, toPool: string) => void;
  onPriority: (candidateId: string, priority: string) => void;
  onWatch: (candidateId: string) => void;
  onDrop: (candidateId: string) => void;
}) {
  const showWatch = canWatchCandidate({
    humanStatus: item.humanStatus,
    status: item.status,
    finalPool: item.finalPool
  });
  const lifecycleStatus = item.status ?? "inbox";

  return (
    <li className="rounded-md border border-border bg-surface p-3 text-sm">
      <div className="flex flex-col gap-2">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <SummaryTooltip summary={item.summary}>
              <a
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-foreground hover:underline"
              >
                {item.title}
              </a>
            </SummaryTooltip>
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
          <IconButton
            kind="delete"
            label="移入丢弃（软删除）"
            disabled={pending}
            onClick={() => onDrop(item.id)}
          />
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
          <select
            disabled={pending}
            value={poolOption ?? ""}
            onChange={(e) => {
              const toPool = e.target.value;
              if (toPool && toPool !== poolOption) onMove(item.id, toPool);
            }}
            className="min-w-0 flex-1 rounded border border-border bg-surface px-2 py-1 text-xs"
            aria-label="Move to pool"
          >
            <option value="" disabled>
              Move to pool…
            </option>
            {["product", "paper", "engineering", "archive"].map((p) => (
              <option key={p} value={p}>
                {POOL_DISPLAY_NAMES[p] ?? p}
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
  onDrop
}: {
  group: PoolGroup;
  pending: boolean;
  onMove: (candidateId: string, toPool: string) => void;
  onPriority: (candidateId: string, priority: string) => void;
  onWatch: (candidateId: string) => void;
  onDrop: (candidateId: string) => void;
}) {
  const displayName = POOL_DISPLAY_NAMES[group.poolName] ?? group.poolName;

  return (
    <div className="flex w-72 shrink-0 flex-col rounded-lg border border-border bg-muted/20">
      <div className="border-b border-border px-3 py-2">
        <h3 className="text-sm font-semibold text-foreground">
          {displayName}
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
            onDrop={onDrop}
          />
        ))}
      </ul>
    </div>
  );
}

export function PoolBoard({ groups }: PoolBoardProps) {
  const [pending, startTransition] = useTransition();

  const runMove = (candidateId: string, toPool: string) => {
    startTransition(() => void moveCandidatePool(candidateId, toPool));
  };

  const runPriority = (candidateId: string, priority: string) => {
    startTransition(() => void updateCandidatePriorityAction(candidateId, priority));
  };

  const runWatch = (candidateId: string) => {
    startTransition(() => void watchCandidateAction(candidateId));
  };

  const runDrop = (candidateId: string) => {
    startTransition(() => void moveCandidatePool(candidateId, "drop"));
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      {groups.map((group) => (
        <PoolColumn
          key={group.poolName}
          group={group}
          pending={pending}
          onMove={runMove}
          onPriority={runPriority}
          onWatch={runWatch}
          onDrop={runDrop}
        />
      ))}
    </div>
  );
}
