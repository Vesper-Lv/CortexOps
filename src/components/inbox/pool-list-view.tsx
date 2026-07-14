"use client";

import { useState, useTransition } from "react";
import {
  moveCandidatePool,
  updateCandidatePriorityAction,
  watchCandidateAction
} from "@/server/actions/candidateActions";
import { promoteCandidateToTaskAction } from "@/server/actions/taskActions";
import {
  POOL_OPTIONS,
  poolOptionFromName,
  type PoolOption
} from "@/shared/poolOptions";
import { PRIORITY_OPTIONS } from "@/shared/priorityOptions";
import { canPromoteItem, canWatchCandidate } from "@/shared/signalStatus";
import type { PoolGroup } from "@/shared/inboxTypes";

type PoolListViewProps = {
  groups: PoolGroup[];
};

export function PoolListView({ groups }: PoolListViewProps) {
  const [pending, startTransition] = useTransition();
  const rows = groups.flatMap((g) =>
    g.items.map((item) => ({
      ...item,
      poolName: g.poolName,
      poolOption: poolOptionFromName(g.poolName)
    }))
  );

  if (rows.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
        无匹配条目。
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full min-w-[48rem] border-collapse text-left text-sm">
        <thead className="bg-muted/40 text-xs text-muted-foreground">
          <tr>
            <th className="border-b border-border px-3 py-2 font-medium">Priority</th>
            <th className="border-b border-border px-3 py-2 font-medium">Pool</th>
            <th className="border-b border-border px-3 py-2 font-medium">Title</th>
            <th className="border-b border-border px-3 py-2 font-medium">Status</th>
            <th className="border-b border-border px-3 py-2 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((item) => {
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
            return (
              <tr key={item.id} className="align-top hover:bg-muted/20">
                <td className="border-b border-border px-3 py-2">
                  <select
                    disabled={pending}
                    value={item.priority || ""}
                    onChange={(e) => {
                      const priority = e.target.value;
                      if (priority && priority !== item.priority) {
                        startTransition(() => void updateCandidatePriorityAction(item.id, priority));
                      }
                    }}
                    className="rounded border border-border bg-surface px-2 py-1 text-xs"
                    aria-label="Candidate priority"
                  >
                    <option value="" disabled>
                      …
                    </option>
                    {PRIORITY_OPTIONS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="border-b border-border px-3 py-2">
                  <select
                    disabled={pending}
                    value={item.poolOption ?? ""}
                    onChange={(e) => {
                      const toPool = e.target.value as PoolOption;
                      if (toPool && toPool !== item.poolOption) {
                        startTransition(() => void moveCandidatePool(item.id, toPool));
                      }
                    }}
                    className="rounded border border-border bg-surface px-2 py-1 text-xs"
                    aria-label="Move to pool"
                  >
                    <option value="" disabled>
                      …
                    </option>
                    {POOL_OPTIONS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="border-b border-border px-3 py-2">
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-foreground hover:underline"
                  >
                    {item.title}
                  </a>
                  {item.summary ? (
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{item.summary}</p>
                  ) : null}
                </td>
                <td className="border-b border-border px-3 py-2 text-xs text-muted-foreground">
                  <div>{item.humanStatus}</div>
                  {item.status && item.status !== "inbox" ? <div>{item.status}</div> : null}
                </td>
                <td className="border-b border-border px-3 py-2">
                  <div className="flex flex-wrap gap-1">
                    {showWatch && item.status !== "watching" && (
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => startTransition(() => void watchCandidateAction(item.id))}
                        className="rounded border border-border px-2 py-0.5 text-xs hover:bg-muted disabled:opacity-50"
                      >
                        关注
                      </button>
                    )}
                    {showConvert && (
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() =>
                          startTransition(() => void promoteCandidateToTaskAction(item.id))
                        }
                        className="rounded border border-border px-2 py-0.5 text-xs hover:bg-muted disabled:opacity-50"
                      >
                        → Task
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
