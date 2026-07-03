"use client";

import { useState, useTransition } from "react";
import {
  batchAddToReadingPack,
  dismissCandidates
} from "@/server/actions/dailySessionActions";
import type { SignalView } from "@/server/services/dailyView";

type CandidateItem = SignalView & { id: string };

export function CandidateSupplementPanel({
  date,
  candidates
}: {
  date: string;
  candidates: CandidateItem[];
}) {
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  if (candidates.length === 0) return null;

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDismiss = () => {
    startTransition(() => void dismissCandidates(date));
  };

  const handleConfirm = () => {
    const ids = [...selected];
    if (ids.length === 0) return;
    startTransition(async () => {
      await batchAddToReadingPack(ids);
      setSelected(new Set());
    });
  };

  return (
    <div className="rounded-md border border-dashed border-border bg-surface p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-xl font-semibold text-foreground">
          快速补充（候选 {candidates.length} 条）
        </h3>
        <button
          type="button"
          disabled={pending}
          onClick={handleDismiss}
          className="text-sm text-muted-foreground hover:text-foreground disabled:opacity-50"
        >
          忽略
        </button>
      </div>

      <ul className="flex flex-col gap-2">
        {candidates.map((item) => (
          <li key={item.id} className="flex items-start gap-3 rounded-md border border-border px-3 py-2">
            <input
              type="checkbox"
              checked={selected.has(item.id)}
              onChange={() => toggle(item.id)}
              className="mt-1"
            />
            <div className="min-w-0 flex-1">
              <a
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-foreground hover:underline"
              >
                {item.title}
              </a>
              <span className="ml-2 text-sm text-muted-foreground">{item.pool}</span>
            </div>
          </li>
        ))}
      </ul>

      <button
        type="button"
        disabled={pending || selected.size === 0}
        onClick={handleConfirm}
        className="mt-3 rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
      >
        确认加入阅读包
      </button>
    </div>
  );
}
