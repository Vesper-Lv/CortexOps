"use client";

import { useTransition } from "react";
import {
  moveCandidatePool,
  updateCandidatePriorityAction,
  updateCandidateSuggestionAction,
  watchCandidateAction
} from "@/server/actions/candidateActions";
import { promoteCandidateToTaskAction } from "@/server/actions/taskActions";
import { IconButton } from "@/components/shared/icon-button";
import { SummaryTooltip } from "@/components/shared/summary-tooltip";
import {
  POOL_OPTIONS,
  poolOptionFromName,
  type PoolOption
} from "@/shared/poolOptions";
import { PRIORITY_OPTIONS } from "@/shared/priorityOptions";
import { canWatchCandidate } from "@/shared/signalStatus";
import type { PoolGroup } from "@/shared/inboxTypes";

type PoolListViewProps = {
  groups: PoolGroup[];
};

const MOVE_TARGETS = POOL_OPTIONS.filter((p) => p !== "drop");
const EDITABLE_POOLS = new Set<PoolOption>(["product", "engineering"]);

const POOL_TITLES: Record<string, string> = {
  product: "产品",
  paper: "论文",
  engineering: "工程",
  archive: "归档"
};

function PoolCard({
  item,
  poolName,
  pending,
  onMove,
  onPriority,
  onWatch,
  onTask,
  onDrop,
  onReason
}: {
  item: PoolGroup["items"][number];
  poolName: string;
  pending: boolean;
  onMove: (candidateId: string, toPool: string) => void;
  onPriority: (candidateId: string, priority: string) => void;
  onWatch: (candidateId: string) => void;
  onTask: (candidateId: string) => void;
  onDrop: (candidateId: string) => void;
  onReason: (candidateId: string, reason: string) => void;
}) {
  const showWatch = canWatchCandidate({
    humanStatus: item.humanStatus,
    status: item.status,
    finalPool: item.finalPool
  });
  const lifecycleStatus = item.status ?? "inbox";
  const poolOption = poolOptionFromName(poolName);
  const editable = poolOption !== null && EDITABLE_POOLS.has(poolOption);
  const showConvert = editable && !item.hasLinkedTask && item.finalPool !== "drop";
  const initialSuggestion = item.suggestion || item.summary || "";

  return (
    <article className="rounded-md border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <SummaryTooltip summary={item.summary}>
            <a
              href={item.url}
              target="_blank"
              rel="noreferrer"
              className="block font-semibold text-foreground hover:underline"
            >
              {item.title}
            </a>
          </SummaryTooltip>
          <div className="mt-2 flex flex-wrap gap-1 text-xs text-muted-foreground">
            <span className="rounded bg-muted px-2 py-0.5">{poolName}</span>
            <span className="rounded bg-muted px-2 py-0.5">{item.priority || "P?"}</span>
            <span className="rounded bg-muted px-2 py-0.5">{item.humanStatus}</span>
            {item.date && <span className="rounded bg-muted px-2 py-0.5">{item.date}</span>}
            {item.sourceName && (
              <span className="rounded bg-muted px-2 py-0.5">{item.sourceName}</span>
            )}
            {lifecycleStatus !== "inbox" && (
              <span className="rounded bg-primary/10 px-2 py-0.5 text-primary">{lifecycleStatus}</span>
            )}
          </div>
        </div>
        <IconButton kind="delete" label="移入丢弃（软删除）" disabled={pending} onClick={() => onDrop(item.id)} />
      </div>

      {item.summary ? (
        <p className="mt-3 text-sm leading-6 text-muted-foreground">{item.summary}</p>
      ) : null}

      {(item.priorityRationale || item.poolRationale || item.contentTags?.length) && (
        <div className="mt-3 flex flex-col gap-1 rounded-md border border-border bg-muted/20 px-3 py-2 text-xs leading-5 text-muted-foreground">
          {item.priorityRationale && <p>优先级建议：{item.priorityRationale}</p>}
          {item.poolRationale && <p>分池建议：{item.poolRationale}</p>}
          {item.contentTags?.length ? <p>标签：{item.contentTags.join(" · ")}</p> : null}
        </div>
      )}

      {editable ? (
        <label className="mt-3 block">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">建议</span>
          <textarea
            defaultValue={initialSuggestion}
            disabled={pending}
            onBlur={(e) => {
              const nextSuggestion = e.currentTarget.value;
              if (nextSuggestion.trim() !== initialSuggestion.trim()) {
                onReason(item.id, nextSuggestion);
              }
            }}
            className="min-h-24 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm leading-6 text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
            placeholder="编辑这条建议"
          />
        </label>
      ) : (
        <p className="mt-3 rounded-md border border-dashed border-border bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
          论文池保留阅读，不额外编辑建议。
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <select
          disabled={pending}
          value={item.priority || ""}
          onChange={(e) => {
            const priority = e.target.value;
            if (priority && priority !== item.priority) {
              onPriority(item.id, priority);
            }
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
            className="rounded border border-border bg-surface px-3 py-1 text-xs hover:bg-muted disabled:opacity-50"
          >
            关注
          </button>
        )}

        {editable && showConvert && (
          <button
            type="button"
            disabled={pending}
            onClick={() => onTask(item.id)}
            className="rounded border border-border bg-surface px-3 py-1 text-xs hover:bg-muted disabled:opacity-50"
          >
            添加为task
          </button>
        )}

        <select
          disabled={pending}
          value={item.finalPool || poolName}
          onChange={(e) => {
            const toPool = e.target.value;
            if (toPool && toPool !== item.finalPool) {
              onMove(item.id, toPool);
            }
          }}
          className="min-w-0 flex-1 rounded border border-border bg-surface px-2 py-1 text-xs"
          aria-label="Move to pool"
        >
          <option value="" disabled>
            Move to pool…
          </option>
          {MOVE_TARGETS.map((p) => (
            <option key={p} value={p}>
              {POOL_TITLES[p] ?? p}
            </option>
          ))}
        </select>
      </div>
    </article>
  );
}

function PoolSection({
  group,
  pending,
  onMove,
  onPriority,
  onWatch,
  onTask,
  onDrop,
  onReason
}: {
  group: PoolGroup;
  pending: boolean;
  onMove: (candidateId: string, toPool: string) => void;
  onPriority: (candidateId: string, priority: string) => void;
  onWatch: (candidateId: string) => void;
  onTask: (candidateId: string) => void;
  onDrop: (candidateId: string) => void;
  onReason: (candidateId: string, reason: string) => void;
}) {
  const displayName = POOL_TITLES[group.poolName] ?? group.poolName;

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-end justify-between gap-3">
        <h3 className="text-sm font-semibold text-foreground">
          {displayName}
          <span className="ml-2 font-normal text-muted-foreground">({group.items.length})</span>
        </h3>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        {group.items.map((item) => (
          <PoolCard
            key={item.id}
            item={item}
            poolName={group.poolName}
            pending={pending}
            onMove={onMove}
            onPriority={onPriority}
            onWatch={onWatch}
            onTask={onTask}
            onDrop={onDrop}
            onReason={onReason}
          />
        ))}
      </div>
    </section>
  );
}

export function PoolListView({ groups }: PoolListViewProps) {
  const [pending, startTransition] = useTransition();
  const visibleGroups = groups.filter((g) => g.items.length > 0);

  const runMove = (candidateId: string, toPool: string) => {
    startTransition(() => void moveCandidatePool(candidateId, toPool));
  };

  const runPriority = (candidateId: string, priority: string) => {
    startTransition(() => void updateCandidatePriorityAction(candidateId, priority));
  };

  const runReason = (candidateId: string, reason: string) => {
    startTransition(() => void updateCandidateSuggestionAction(candidateId, reason));
  };

  const runWatch = (candidateId: string) => {
    startTransition(() => void watchCandidateAction(candidateId));
  };

  const runTask = (candidateId: string) => {
    startTransition(() => void promoteCandidateToTaskAction(candidateId));
  };

  const runDrop = (candidateId: string) => {
    startTransition(() => void moveCandidatePool(candidateId, "drop"));
  };

  if (visibleGroups.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
        无匹配条目。
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {visibleGroups.map((group) => (
        <PoolSection
          key={group.poolName}
          group={group}
          pending={pending}
          onMove={runMove}
          onPriority={runPriority}
          onWatch={runWatch}
          onTask={runTask}
          onDrop={runDrop}
          onReason={runReason}
        />
      ))}
    </div>
  );
}
