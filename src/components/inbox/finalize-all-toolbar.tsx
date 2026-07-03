"use client";

import { useTransition } from "react";
import { finalizeAllAction } from "@/server/actions/reviewActions";

export function FinalizeAllToolbar({ date }: { date: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => void finalizeAllAction(date))}
      className="rounded border border-border bg-surface px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
    >
      全部确定
    </button>
  );
}
