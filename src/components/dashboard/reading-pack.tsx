"use client";

import { useState, useTransition } from "react";
import type { SignalView } from "@/server/services/dailyView";
import { ContentTagChips } from "@/components/shared/content-tag-chips";
import { thumbsDownAction, thumbsUpAction } from "@/server/actions/behaviorActions";
import type { ThumbsDownReason } from "@/shared/preferenceLearning";

const DOWN_REASONS: { reason: ThumbsDownReason; label: string }[] = [
  { reason: "direction", label: "方向不对" },
  { reason: "shallow", label: "太浅" },
  { reason: "source_quality", label: "来源不行" }
];

export function ReadingPack({ items }: { items: SignalView[] }) {
  return (
    <ul className="flex flex-col gap-4">
      {items.map((item, i) => (
        <ReadingPackItem key={item.id ?? i} item={item} />
      ))}
    </ul>
  );
}

function ReadingPackItem({ item }: { item: SignalView }) {
  const [pending, startTransition] = useTransition();
  const [pickingReason, setPickingReason] = useState(false);

  return (
    <li className="rounded-md border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <span className="rounded bg-muted px-2 py-0.5 font-medium">{item.priority || "—"}</span>
        <span className="rounded bg-muted px-2 py-0.5">{item.pool || "—"}</span>
      </div>
      <a
        href={item.url}
        target="_blank"
        rel="noreferrer"
        className="mt-2 block text-base font-semibold text-foreground hover:underline"
      >
        {item.title}
      </a>
      {item.summary && <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.summary}</p>}
      <div className="mt-2">
        <ContentTagChips tags={item.contentTags} />
      </div>
      {item.isKnowledgeGap ? (
        <>
          {item.knownFacts && (
            <p className="mt-1 text-sm text-muted-foreground">文章可获得的事实：{item.knownFacts}</p>
          )}
          {item.openQuestions && (
            <p className="mt-1 text-sm text-muted-foreground">需要额外研究的问题：{item.openQuestions}</p>
          )}
        </>
      ) : (
        <>
          {item.readReason && (
            <p className="mt-1 text-sm text-muted-foreground">推荐阅读原因：{item.readReason}</p>
          )}
          {item.focusDirection && (
            <p className="mt-1 text-sm text-muted-foreground">关注方向：{item.focusDirection}</p>
          )}
        </>
      )}
      {item.id && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={pending}
            className="text-sm text-muted-foreground hover:text-foreground disabled:opacity-50"
            onClick={() => startTransition(() => thumbsUpAction(item.id!))}
          >
            赞
          </button>
          <button
            type="button"
            disabled={pending}
            className="text-sm text-muted-foreground hover:text-foreground disabled:opacity-50"
            onClick={() => setPickingReason((v) => !v)}
          >
            踩
          </button>
          {pickingReason &&
            DOWN_REASONS.map(({ reason, label }) => (
              <button
                key={reason}
                type="button"
                disabled={pending}
                className="text-sm underline text-muted-foreground hover:text-foreground disabled:opacity-50"
                onClick={() =>
                  startTransition(async () => {
                    await thumbsDownAction(item.id!, reason);
                    setPickingReason(false);
                  })
                }
              >
                {label}
              </button>
            ))}
        </div>
      )}
    </li>
  );
}
