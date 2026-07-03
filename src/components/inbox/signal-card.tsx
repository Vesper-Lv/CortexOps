"use client";

import { useTransition } from "react";
import {
  finalizeSignalAction,
  submitDraft
} from "@/server/actions/reviewActions";
import { POOL_OPTIONS } from "@/shared/poolOptions";
import { PRIORITY_OPTIONS } from "@/shared/priorityOptions";
import type { InboxSignal } from "@/shared/inboxTypes";

export function SignalCard({ signal }: { signal: InboxSignal }) {
  const [pending, startTransition] = useTransition();
  const inPack = signal.readingPackStatus === "selected";

  const run = (fn: () => Promise<void>) => startTransition(() => void fn());

  return (
    <li
      className={`relative rounded-md border border-border bg-surface p-4 ${
        inPack ? "ring-2 ring-primary/60 bg-primary/5" : ""
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <select
          disabled={pending}
          value={signal.priority || ""}
          onChange={(e) => {
            const priority = e.target.value;
            if (priority) run(() => submitDraft(signal.id, { type: "set_priority", priority }));
          }}
          className="rounded border border-border bg-surface px-2 py-1 text-xs"
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
        <select
          disabled={pending}
          value={signal.finalPool || ""}
          onChange={(e) => {
            const pool = e.target.value;
            if (pool) run(() => submitDraft(signal.id, { type: "set_pool", pool }));
          }}
          className="rounded border border-border bg-surface px-2 py-1 text-xs"
        >
          <option value="" disabled>
            池…
          </option>
          {POOL_OPTIONS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>

      <a
        href={signal.url}
        target="_blank"
        rel="noreferrer"
        className="mt-2 block font-semibold text-foreground hover:underline"
      >
        {signal.title}
      </a>
      {signal.summary && <p className="mt-1 text-sm text-muted-foreground">{signal.summary}</p>}

      <div className="mt-3 flex items-center justify-between gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => finalizeSignalAction(signal.id))}
          className="rounded bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          确定
        </button>
      </div>

      {!inPack && (
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => submitDraft(signal.id, { type: "toggle_reading_pack" }))}
          className="absolute bottom-3 right-3 rounded border border-border bg-surface px-2 py-1 text-xs hover:bg-muted disabled:opacity-50"
        >
          加入阅读包
        </button>
      )}
    </li>
  );
}
