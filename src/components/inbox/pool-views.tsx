"use client";

import { useState } from "react";
import { PoolBoard } from "@/components/inbox/pool-board";
import { PoolListView } from "@/components/inbox/pool-list-view";
import type { PoolGroup } from "@/shared/inboxTypes";

export function PoolViews({ groups }: { groups: PoolGroup[] }) {
  const [mode, setMode] = useState<"board" | "list">("board");

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setMode("board")}
          className={`rounded px-3 py-1 text-xs font-medium ${
            mode === "board"
              ? "bg-primary text-primary-foreground"
              : "border border-border bg-surface text-muted-foreground hover:bg-muted"
          }`}
        >
          Board
        </button>
        <button
          type="button"
          onClick={() => setMode("list")}
          className={`rounded px-3 py-1 text-xs font-medium ${
            mode === "list"
              ? "bg-primary text-primary-foreground"
              : "border border-border bg-surface text-muted-foreground hover:bg-muted"
          }`}
        >
          List
        </button>
      </div>
      {mode === "board" ? <PoolBoard groups={groups} /> : <PoolListView groups={groups} />}
    </div>
  );
}
