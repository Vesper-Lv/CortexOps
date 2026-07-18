"use client";

import { useTransition } from "react";
import { promoteCandidateToTaskAction } from "@/server/actions/taskActions";
import type { RankedItem } from "@/server/services/poolRanking";

type Props = {
  items: RankedItem[];
};

export function PracticePicker({ items }: Props) {
  const [pending, startTransition] = useTransition();

  if (items.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
        工程池暂无可练习条目。导入数据后，系统会从 practice_fit 为 high/medium 的工程候选中推荐三项。
      </p>
    );
  }

  const top = items.slice(0, 3);

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted-foreground">
        以下来自工程池练习适配 Top 3，选定后自动创建 Task。
      </p>
      {top.map((item) => (
        <div key={item.id} className="rounded-md border border-border bg-surface p-4">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="rounded bg-muted px-2 py-0.5">{item.pool}</span>
            {item.priority && <span className="rounded bg-muted px-2 py-0.5">{item.priority}</span>}
            {item.practiceFit && <span>practice_fit: {item.practiceFit}</span>}
            <span>rank: {item.rankScore.toFixed(2)}</span>
          </div>
          <a
            href={item.url}
            target="_blank"
            rel="noreferrer"
            className="mt-2 block text-base font-semibold text-foreground hover:underline"
          >
            {item.title}
          </a>
          {item.summary && (
            <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.summary}</p>
          )}
          <button
            type="button"
            disabled={pending}
            onClick={() => startTransition(() => void promoteCandidateToTaskAction(item.id))}
            className="mt-3 rounded border border-border bg-surface px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-50"
          >
            添加为task
          </button>
        </div>
      ))}
    </div>
  );
}
