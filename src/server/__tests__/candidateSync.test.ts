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
      finalPool: "knowledge_gap",
      suggestedPool: "knowledge_gap"
    });

    await syncSignalToCandidate("s1");
    expect(candidateUpsert).not.toHaveBeenCalled();
  });

  it("upserts candidate with pool name dashes on finalize", async () => {
    signalFindUnique.mockResolvedValue({
      id: "s1",
      humanStatus: "confirmed",
      recordKey: "daily:test-1",
      externalId: "test-1",
      title: "Test",
      sourceUrl: "https://example.com",
      originalUrl: null,
      priority: "P1",
      suggestedPool: "knowledge_gap",
      finalPool: "demo_replication",
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
          poolName: "demo-replication",
          humanStatus: "confirmed",
          status: "confirmed",
          readingPackStatus: "selected"
        }),
        update: expect.objectContaining({
          poolName: "demo-replication",
          humanStatus: "confirmed",
          status: "confirmed",
          readingPackStatus: "selected"
        })
      })
    );
  });
});
