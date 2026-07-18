import { beforeEach, describe, expect, it, vi } from "vitest";

const { signalFindUnique, candidateUpsert } = vi.hoisted(() => ({
  signalFindUnique: vi.fn(),
  candidateUpsert: vi.fn()
}));

vi.mock("@/server/db", () => ({
  prisma: {
    signal: { findUnique: signalFindUnique },
    candidate: { upsert: candidateUpsert }
  }
}));

import { syncSignalToCandidate } from "@/server/services/candidateSync";

describe("syncSignalToCandidate", () => {
  beforeEach(() => {
    signalFindUnique.mockReset();
    candidateUpsert.mockReset().mockResolvedValue({});
  });

  it("skips pending signals", async () => {
    signalFindUnique.mockResolvedValue({
      id: "s1",
      humanStatus: "pending",
      recordKey: "daily:test-1",
      finalPool: "engineering",
      suggestedPool: "engineering"
    });

    await syncSignalToCandidate("s1");
    expect(candidateUpsert).not.toHaveBeenCalled();
  });

  it("upserts candidate with canonical pool name on finalize", async () => {
    signalFindUnique.mockResolvedValue({
      id: "s1",
      humanStatus: "confirmed",
      recordKey: "daily:test-1",
      externalId: "test-1",
      title: "Test",
      sourceUrl: "https://example.com",
      originalUrl: null,
      priority: "P1",
      suggestedPool: "engineering",
      finalPool: "personal_work",
      status: "confirmed",
      readingPackStatus: "selected",
      rawJson: "{}",
      sourceFile: "state/daily/links.jsonl",
      sourceLine: 1,
      importRunId: "run1"
    });

    await syncSignalToCandidate("s1");

    expect(candidateUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { recordKey: "signal-sync:daily:test-1" },
        create: expect.objectContaining({
          poolName: "engineering",
          humanStatus: "confirmed",
          status: "confirmed",
          readingPackStatus: "selected"
        }),
        update: expect.objectContaining({
          poolName: "engineering",
          suggestedPool: "engineering",
          humanStatus: "confirmed",
          status: "confirmed",
          readingPackStatus: "selected"
        })
      })
    );
  });

  it("archives unknown finalized pools during sync", async () => {
    signalFindUnique.mockResolvedValue({
      id: "s2",
      humanStatus: "confirmed",
      recordKey: "daily:test-2",
      externalId: "test-2",
      title: "Unknown pool",
      sourceUrl: "https://example.com/unknown",
      originalUrl: null,
      priority: "P2",
      suggestedPool: "custom_pool",
      finalPool: "another_pool",
      status: null,
      readingPackStatus: "candidate",
      rawJson: "{}",
      sourceFile: "state/daily/links.jsonl",
      sourceLine: 2,
      importRunId: "run1"
    });

    await syncSignalToCandidate("s2");

    expect(candidateUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          poolName: "archive",
          suggestedPool: null,
          finalPool: null,
          status: "confirmed"
        }),
        update: expect.objectContaining({
          poolName: "archive",
          suggestedPool: null,
          finalPool: null,
          status: "confirmed"
        })
      })
    );
  });
});
