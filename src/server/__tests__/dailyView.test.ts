import { describe, expect, it } from "vitest";
import { buildReadingView, type SignalLike } from "@/server/services/dailyView";

const s = (o: Partial<SignalLike>): SignalLike => ({
  title: "t",
  originalUrl: null,
  sourceUrl: "u",
  priority: "P1",
  suggestedPool: "knowledge_gap",
  finalPool: "knowledge_gap",
  readingPackStatus: "candidate",
  aihotSummary: "a",
  reason: "r",
  rawJson: "{}",
  ...o
});

describe("buildReadingView", () => {
  it("splits selected pack, candidates, and remaining with counts", () => {
    const view = buildReadingView([
      s({ readingPackStatus: "selected", title: "P" }),
      s({ readingPackStatus: "candidate", title: "C" }),
      s({ readingPackStatus: "not_selected", title: "N" })
    ]);
    expect(view.readingPack.map((x) => x.title)).toEqual(["P"]);
    expect(view.candidates.map((x) => x.title)).toEqual(["C"]);
    expect(view.selectedCount).toBe(1);
    expect(view.candidateCount).toBe(1);
    expect(view.remainingCount).toBe(2);
  });

  it("resolves summary and link from raw/fallbacks", () => {
    const view = buildReadingView([
      s({
        readingPackStatus: "selected",
        originalUrl: "orig",
        rawJson: JSON.stringify({ display_summary: "ds" })
      })
    ]);
    expect(view.readingPack[0].summary).toBe("ds");
    expect(view.readingPack[0].url).toBe("orig");
  });
});
