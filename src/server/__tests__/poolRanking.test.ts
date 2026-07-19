import { beforeEach, describe, expect, it, vi } from "vitest";

const { candidateFindMany, signalFindMany } = vi.hoisted(() => ({
  candidateFindMany: vi.fn(),
  signalFindMany: vi.fn()
}));

vi.mock("@/server/db", () => ({
  prisma: {
    candidate: { findMany: candidateFindMany },
    signal: { findMany: signalFindMany }
  }
}));

import {
  isEngineeringPracticeCandidate,
  rankEngineeringPracticeItems,
  rankPoolItems,
  scoreEngineeringPracticeCandidate
} from "@/server/services/poolRanking";

describe("engineering practice ranking helpers", () => {
  it("excludes low-fit general knowledge items from Today practice recommendations", () => {
    expect(
      isEngineeringPracticeCandidate({
        contentType: "general",
        practiceFit: "low",
        sourceType: "news"
      })
    ).toBe(false);
  });

  it("accepts high-fit GitHub and tool candidates", () => {
    expect(
      isEngineeringPracticeCandidate({
        contentType: "github",
        practiceFit: "high",
        sourceType: "github_repo"
      })
    ).toBe(true);
    expect(
      isEngineeringPracticeCandidate({
        contentType: "general",
        practiceFit: "medium",
        sourceType: "tool"
      })
    ).toBe(true);
  });

  it("scores practice fit for all engineering candidate types", () => {
    const high = scoreEngineeringPracticeCandidate({
      contentType: "general",
      decisionConfidence: 0.5,
      practiceFit: "high",
      publishedAt: "2026-07-18T00:00:00Z",
      sourceType: "tool"
    });
    const low = scoreEngineeringPracticeCandidate({
      contentType: "general",
      decisionConfidence: 0.5,
      practiceFit: "low",
      publishedAt: "2026-07-18T00:00:00Z",
      sourceType: "tool"
    });
    expect(high).toBeGreaterThan(low);
  });
});

describe("rankPoolItems", () => {
  beforeEach(() => {
    candidateFindMany.mockReset();
    signalFindMany.mockReset();
    signalFindMany.mockResolvedValue([]);
  });

  it("prefers practice-fit engineering items over merely recent ones", async () => {
    candidateFindMany.mockResolvedValue([
      {
        id: "recent-low-fit",
        recordKey: "engineering:recent-low-fit",
        poolName: "engineering",
        finalPool: "engineering",
        title: "Recent but weak fit",
        originalUrl: "https://example.com/news",
        sourceUrl: null,
        priority: "P0",
        practiceFit: "low",
        publishedAt: "2026-07-18T00:00:00.000Z",
        date: "2026-07-18",
        aihotSummary: null,
        reason: null,
        rawJson: "{}"
      },
      {
        id: "older-high-fit",
        recordKey: "engineering:older-high-fit",
        poolName: "knowledge_gap",
        finalPool: "knowledge_gap",
        title: "Older but better fit",
        originalUrl: "https://github.com/example/repo",
        sourceUrl: null,
        priority: "P2",
        practiceFit: "high",
        publishedAt: "2026-06-01T00:00:00.000Z",
        date: "2026-06-01",
        aihotSummary: null,
        reason: null,
        rawJson: "{}"
      }
    ]);
    signalFindMany.mockResolvedValue([]);

    const items = await rankPoolItems("engineering", 2);

    expect(items.map((item) => item.id)).toEqual(["older-high-fit", "recent-low-fit"]);
    expect(candidateFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.any(Array)
        })
      })
    );
  });

  it("reads decisionConfidence from Signal via canonicalKey and ranks higher confidence first", async () => {
    candidateFindMany.mockResolvedValue([
      {
        id: "low-confidence",
        recordKey: "engineering:low-confidence",
        canonicalKey: "ck-low",
        poolName: "engineering",
        finalPool: "engineering",
        title: "Low confidence item",
        originalUrl: "https://github.com/example/low",
        sourceUrl: null,
        priority: "P1",
        practiceFit: "high",
        publishedAt: "2026-07-18T00:00:00.000Z",
        date: "2026-07-18",
        aihotSummary: null,
        reason: null,
        rawJson: "{}"
      },
      {
        id: "high-confidence",
        recordKey: "engineering:high-confidence",
        canonicalKey: "ck-high",
        poolName: "engineering",
        finalPool: "engineering",
        title: "High confidence item",
        originalUrl: "https://github.com/example/high",
        sourceUrl: null,
        priority: "P1",
        practiceFit: "high",
        publishedAt: "2026-07-18T00:00:00.000Z",
        date: "2026-07-18",
        aihotSummary: null,
        reason: null,
        rawJson: "{}"
      }
    ]);
    signalFindMany.mockResolvedValue([
      { canonicalKey: "ck-low", decisionConfidence: 0.3 },
      { canonicalKey: "ck-high", decisionConfidence: 0.9 }
    ]);

    const items = await rankPoolItems("engineering", 2);

    expect(items.map((item) => item.id)).toEqual(["high-confidence", "low-confidence"]);
    expect(items[0].decisionConfidence).toBe(0.9);
    expect(items[1].decisionConfidence).toBe(0.3);
    expect(signalFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { canonicalKey: { in: ["ck-low", "ck-high"] } }
      })
    );
  });
});

describe("rankEngineeringPracticeItems", () => {
  beforeEach(() => {
    candidateFindMany.mockReset();
    signalFindMany.mockReset();
    signalFindMany.mockResolvedValue([]);
  });

  it("filters Today practice recommendations to high or medium practice-fit items", async () => {
    candidateFindMany.mockResolvedValue([
      {
        id: "low-general",
        recordKey: "engineering:low-general",
        poolName: "engineering",
        finalPool: "engineering",
        title: "Low general news",
        originalUrl: "https://example.com/news",
        sourceUrl: null,
        priority: "P0",
        practiceFit: "low",
        publishedAt: "2026-07-18T00:00:00.000Z",
        date: "2026-07-18",
        aihotSummary: null,
        reason: null,
        rawJson: JSON.stringify({ source_type: "news" })
      },
      {
        id: "medium-tool",
        recordKey: "engineering:medium-tool",
        poolName: "engineering",
        finalPool: "engineering",
        title: "Medium tool",
        originalUrl: "https://example.com/tool",
        sourceUrl: null,
        priority: "P1",
        practiceFit: "medium",
        publishedAt: "2026-07-17T00:00:00.000Z",
        date: "2026-07-17",
        aihotSummary: null,
        reason: null,
        rawJson: JSON.stringify({ source_type: "tool" })
      },
      {
        id: "high-github",
        recordKey: "engineering:high-github",
        poolName: "engineering",
        finalPool: "engineering",
        title: "High GitHub",
        originalUrl: "https://github.com/example/repo",
        sourceUrl: null,
        priority: "P2",
        practiceFit: "high",
        publishedAt: "2026-07-16T00:00:00.000Z",
        date: "2026-07-16",
        aihotSummary: null,
        reason: null,
        rawJson: "{}"
      }
    ]);
    signalFindMany.mockResolvedValue([]);

    const items = await rankEngineeringPracticeItems(3);

    expect(items.map((item) => item.id)).toEqual(["high-github", "medium-tool"]);
  });
});
