"use client";

import { useTransition } from "react";
import { submitReview } from "@/server/actions/reviewActions";
import { POOL_OPTIONS } from "@/shared/poolOptions";
import type { InboxSignal } from "@/shared/inboxTypes";

export function SignalRow({ signal }: { signal: InboxSignal }) {
  const [pending, startTransition] = useTransition();

  const run = (fn: () => Promise<void>) => startTransition(() => void fn());

  return (
    <li className="rounded-md border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span className="rounded bg-muted px-2 py-0.5 font-medium">{signal.priority || "—"}</span>
        <span className="rounded bg-muted px-2 py-0.5">pool: {signal.finalPool}</span>
        <span className="rounded bg-muted px-2 py-0.5">status: {signal.humanStatus}</span>
        <span className="rounded bg-muted px-2 py-0.5">pack: {signal.readingPackStatus}</span>
      </div>
      <a
        href={signal.url}
        target="_blank"
        rel="noreferrer"
        className="mt-2 block font-semibold text-foreground hover:underline"
      >
        {signal.title}
      </a>
      {signal.summary && <p className="mt-1 text-sm text-muted-foreground">摘要：{signal.summary}</p>}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => submitReview(signal.id, { type: "confirm" }))}
          className="rounded border border-border px-2 py-1 text-sm hover:bg-muted disabled:opacity-50"
        >
          确认
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => submitReview(signal.id, { type: "reject" }))}
          className="rounded border border-border px-2 py-1 text-sm hover:bg-muted disabled:opacity-50"
        >
          拒绝
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => submitReview(signal.id, { type: "toggle_reading_pack" }))}
          className="rounded border border-border px-2 py-1 text-sm hover:bg-muted disabled:opacity-50"
        >
          {signal.readingPackStatus === "selected" ? "移出阅读包" : "加入阅读包"}
        </button>
        <select
          disabled={pending}
          defaultValue=""
          onChange={(e) => {
            const pool = e.target.value;
            if (pool) run(() => submitReview(signal.id, { type: "change_pool", pool }));
          }}
          className="rounded border border-border bg-surface px-2 py-1 text-sm"
        >
          <option value="" disabled>
            改池…
          </option>
          {POOL_OPTIONS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>
    </li>
  );
}
