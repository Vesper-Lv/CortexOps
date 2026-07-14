import { prisma } from "@/server/db";
import { parseSignalRaw } from "@/server/signalRaw";

export type ContentTagMatchItem = {
  date: string;
  title: string;
  signalId: string;
  contentTags: string[];
};

export type ContentTagSearchResult = {
  tag: string;
  dates: string[];
  items: ContentTagMatchItem[];
};

function tagsFromRawJson(rawJson: string): string[] {
  return parseSignalRaw(rawJson).contentTags ?? [];
}

/** Deduped content_tags from Signal + Candidate rawJson, sorted. */
export async function listContentTagVocabulary(): Promise<string[]> {
  const [signals, candidates] = await Promise.all([
    prisma.signal.findMany({ select: { rawJson: true } }),
    prisma.candidate.findMany({ select: { rawJson: true } })
  ]);

  const tags = new Set<string>();
  for (const row of [...signals, ...candidates]) {
    for (const tag of tagsFromRawJson(row.rawJson)) {
      const trimmed = tag.trim();
      if (trimmed) tags.add(trimmed);
    }
  }
  return [...tags].sort((a, b) => a.localeCompare(b));
}

/** Daily signals carrying `tag`; dates intersect imported DailyReport when present. */
export async function searchByContentTag(tag: string): Promise<ContentTagSearchResult> {
  const needle = tag.trim();
  if (!needle) return { tag: "", dates: [], items: [] };

  const signals = await prisma.signal.findMany({
    where: { stream: "daily" },
    select: { id: true, date: true, title: true, rawJson: true },
    orderBy: [{ date: "desc" }, { sourceLine: "asc" }]
  });

  const items: ContentTagMatchItem[] = [];
  const dateSet = new Set<string>();

  for (const s of signals) {
    const contentTags = tagsFromRawJson(s.rawJson);
    if (!contentTags.some((t) => t === needle)) continue;
    const date = s.date ?? "";
    if (!date) continue;
    dateSet.add(date);
    items.push({
      date,
      title: s.title ?? "(untitled)",
      signalId: s.id,
      contentTags
    });
  }

  const reportDates = await prisma.dailyReport.findMany({
    where: { date: { in: [...dateSet] } },
    select: { date: true }
  });
  const reportSet = new Set(reportDates.map((r) => r.date));
  // Prefer dates with imported reports; keep signal-only dates if no reports yet.
  const dates =
    reportSet.size > 0
      ? [...dateSet].filter((d) => reportSet.has(d)).sort((a, b) => b.localeCompare(a))
      : [...dateSet].sort((a, b) => b.localeCompare(a));

  return {
    tag: needle,
    dates,
    items: items.filter((i) => dates.includes(i.date))
  };
}
