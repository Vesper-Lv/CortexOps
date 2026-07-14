"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { ContentTagChips } from "@/components/shared/content-tag-chips";
import type { ContentTagSearchResult } from "@/server/services/contentTags";

type Props = {
  vocabulary: string[];
  activeTag: string | null;
  searchResult: ContentTagSearchResult | null;
};

export function ReportTagSearch({ vocabulary, activeTag, searchResult }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState(activeTag ? `/${activeTag}` : "");
  const [open, setOpen] = useState(false);

  const suggestions = useMemo(() => {
    if (!query.startsWith("/")) return [];
    const fragment = query.slice(1).toLowerCase();
    return vocabulary.filter((t) => !fragment || t.toLowerCase().includes(fragment)).slice(0, 24);
  }, [query, vocabulary]);

  const applyTag = (tag: string) => {
    setQuery(`/${tag}`);
    setOpen(false);
    router.push(`/library/reports?tag=${encodeURIComponent(tag)}` as Route);
  };

  const clearTag = () => {
    setQuery("");
    setOpen(false);
    router.push("/library/reports" as Route);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="relative max-w-md">
        <label className="sr-only" htmlFor="report-tag-search">
          按 content_tags 搜索
        </label>
        <input
          ref={inputRef}
          id="report-tag-search"
          value={query}
          placeholder='输入 / 浏览标签，例如 /agent'
          onChange={(e) => {
            const v = e.target.value;
            setQuery(v);
            setOpen(v.startsWith("/"));
          }}
          onFocus={() => {
            if (query.startsWith("/")) setOpen(true);
          }}
          onBlur={() => {
            // Delay so suggestion click can fire.
            window.setTimeout(() => setOpen(false), 150);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setOpen(false);
              return;
            }
            if (e.key === "Enter" && query.startsWith("/") && suggestions[0]) {
              e.preventDefault();
              applyTag(suggestions[0]);
            }
            if (e.key === "Backspace" && query === "" && activeTag) {
              clearTag();
            }
          }}
          className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
        />
        {open && suggestions.length > 0 && (
          <ul className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-md border border-border bg-surface py-1 shadow-lg">
            {suggestions.map((tag) => (
              <li key={tag}>
                <button
                  type="button"
                  className="w-full px-3 py-1.5 text-left text-sm hover:bg-muted"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => applyTag(tag)}
                >
                  /{tag}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {activeTag && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground">筛选标签</span>
          <ContentTagChips tags={[activeTag]} />
          <button
            type="button"
            onClick={clearTag}
            className="text-xs text-primary hover:underline"
          >
            清除
          </button>
        </div>
      )}

      {searchResult && searchResult.items.length > 0 && (
        <div className="rounded-md border border-border bg-muted/20 px-3 py-2">
          <p className="text-xs text-muted-foreground">
            命中 {searchResult.items.length} 条信号 · {searchResult.dates.length} 个日报日期
          </p>
          <ul className="mt-2 flex flex-col gap-1">
            {searchResult.items.slice(0, 20).map((item) => (
              <li key={item.signalId} className="text-sm">
                <span className="text-muted-foreground">{item.date}</span>
                <span className="mx-2 text-muted-foreground">·</span>
                <span className="text-foreground">{item.title}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {activeTag && searchResult && searchResult.dates.length === 0 && (
        <p className="text-sm text-muted-foreground">没有带标签「{activeTag}」的日报信号。</p>
      )}
    </div>
  );
}
