import type { SignalView } from "@/server/services/dailyView";
import { ContentTagChips } from "@/components/shared/content-tag-chips";

export function ReadingPack({ items }: { items: SignalView[] }) {
  return (
    <ul className="flex flex-col gap-4">
      {items.map((item, i) => (
        <li key={i} className="rounded-md border border-border bg-surface p-4">
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
          {item.priorityRationale && (
            <p className="mt-1 text-sm text-muted-foreground">优先级依据：{item.priorityRationale}</p>
          )}
          {item.poolRationale && (
            <p className="mt-1 text-sm text-muted-foreground">归池依据：{item.poolRationale}</p>
          )}
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
        </li>
      ))}
    </ul>
  );
}
