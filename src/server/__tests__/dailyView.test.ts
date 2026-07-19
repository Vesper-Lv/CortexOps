import { describe, expect, it } from "vitest";
import { buildReadingView, getRemainingLinks, type SignalLike } from "@/server/services/dailyView";

const s = (o: Partial<SignalLike>): SignalLike => ({
  title: "t",
  originalUrl: null,
  sourceUrl: "u",
  priority: "P1",
  suggestedPool: "engineering",
  finalPool: "engineering",
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

  it("passes raw rationales and content tags through to signal views", () => {
    const view = buildReadingView([
      s({
        readingPackStatus: "selected",
        rawJson: JSON.stringify({
          priority_rationale: "High urgency",
          pool_rationale: "Good demo candidate",
          content_tags: ["agent", "workflow"]
        })
      })
    ]);

    expect(view.readingPack[0]).toMatchObject({
      priorityRationale: "High urgency",
      poolRationale: "Good demo candidate",
      contentTags: ["agent", "workflow"]
    });
  });
});

describe("getRemainingLinks", () => {
  it("keeps only non-selected P0/P1 items for Dashboard supplement list", () => {
    const links = getRemainingLinks([
      s({ readingPackStatus: "selected", priority: "P0", title: "in-pack" }),
      s({ readingPackStatus: "not_selected", priority: "P0", title: "p0" }),
      s({ readingPackStatus: "candidate", priority: "P1", title: "p1" }),
      s({ readingPackStatus: "not_selected", priority: "P2", title: "p2" }),
      s({ readingPackStatus: "not_selected", priority: "archive", title: "arch" })
    ]);
    expect(links.map((x) => x.title)).toEqual(["p0", "p1"]);
  });
});
