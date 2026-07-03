import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CandidateInput, SignalInput } from "@/server/importers/recordMapper";

const { signalUpsert, candidateUpsert, importRunCreate, importRunUpdate } = vi.hoisted(() => ({
  signalUpsert: vi.fn(),
  candidateUpsert: vi.fn(),
  importRunCreate: vi.fn(),
  importRunUpdate: vi.fn()
}));

vi.mock("@/server/db", () => ({
  prisma: {
    importRun: {
      create: importRunCreate,
      update: importRunUpdate
    },
    signal: { upsert: signalUpsert },
    candidate: { upsert: candidateUpsert }
  }
}));

import { prismaSignalRepository } from "@/server/importers/prismaSignalRepository";

function baseSignal(overrides: Partial<SignalInput & { importRunId: string }> = {}): SignalInput & {
  importRunId: string;
} {
  return {
    recordKey: "daily:test-1",
    stream: "daily",
    externalId: "test-1",
    canonicalKey: null,
    date: "2026-07-02",
    title: "Original title",
    sourceName: null,
    sourceUrl: "https://example.com",
    originalUrl: null,
    priority: "P1",
    suggestedPool: "knowledge_gap",
    finalPool: "knowledge_gap",
    humanStatus: "pending",
    status: null,
    readingPackStatus: "candidate",
    duplicateStatus: null,
    practiceFit: null,
    category: null,
    publishedAt: null,
    reason: null,
    aihotSummary: null,
    codexSummary: null,
    rawJson: "{}",
    sourceFile: "state/daily/2026-07-02-links.jsonl",
    sourceLine: 1,
    importRunId: "run1",
    ...overrides
  };
}

function baseCandidate(overrides: Partial<CandidateInput & { importRunId: string }> = {}): CandidateInput & {
  importRunId: string;
} {
  return {
    recordKey: "product-inspiration:test-1",
    poolName: "product-inspiration",
    externalId: "test-1",
    canonicalKey: null,
    date: null,
    title: "Pool item",
    sourceName: null,
    sourceUrl: "https://example.com",
    originalUrl: null,
    priority: "P2",
    suggestedPool: "product_inspiration",
    finalPool: "product_inspiration",
    humanStatus: "pending",
    status: null,
    readingPackStatus: null,
    duplicateStatus: null,
    practiceFit: null,
    category: null,
    publishedAt: null,
    reason: null,
    aihotSummary: null,
    codexSummary: null,
    rawJson: "{}",
    sourceFile: "pools/product-inspiration.jsonl",
    sourceLine: 1,
    importRunId: "run1",
    ...overrides
  };
}

describe("prismaSignalRepository", () => {
  beforeEach(() => {
    signalUpsert.mockReset().mockResolvedValue({});
    candidateUpsert.mockReset().mockResolvedValue({});
    importRunCreate.mockReset().mockResolvedValue({ id: "run1" });
    importRunUpdate.mockReset().mockResolvedValue({});
  });

  it("seeds human-owned fields on signal create", async () => {
    await prismaSignalRepository.upsertSignal(
      baseSignal({
        humanStatus: "confirmed",
        finalPool: "demo_replication",
        readingPackStatus: "selected",
        status: "watching"
      })
    );

    const call = signalUpsert.mock.calls[0][0];
    expect(call.create.humanStatus).toBe("confirmed");
    expect(call.create.finalPool).toBe("demo_replication");
    expect(call.create.readingPackStatus).toBe("selected");
    expect(call.create.status).toBe("watching");
  });

  it("omits human-owned fields from signal update while refreshing content", async () => {
    await prismaSignalRepository.upsertSignal(
      baseSignal({
        title: "Updated title",
        humanStatus: "confirmed",
        finalPool: "demo_replication",
        readingPackStatus: "selected",
        status: "watching"
      })
    );

    const call = signalUpsert.mock.calls[0][0];
    expect(call.update).toEqual(
      expect.not.objectContaining({
        humanStatus: expect.anything(),
        finalPool: expect.anything(),
        readingPackStatus: expect.anything(),
        status: expect.anything()
      })
    );
    expect(call.update.title).toBe("Updated title");
  });

  it("seeds human-owned fields on candidate create", async () => {
    await prismaSignalRepository.upsertCandidate(
      baseCandidate({
        humanStatus: "changed",
        finalPool: "archive",
        readingPackStatus: "not_selected",
        status: "confirmed"
      })
    );

    const call = candidateUpsert.mock.calls[0][0];
    expect(call.create.humanStatus).toBe("changed");
    expect(call.create.finalPool).toBe("archive");
    expect(call.create.readingPackStatus).toBe("not_selected");
    expect(call.create.status).toBe("confirmed");
  });

  it("omits human-owned fields from candidate update while refreshing content", async () => {
    await prismaSignalRepository.upsertCandidate(
      baseCandidate({
        title: "Updated pool title",
        humanStatus: "changed",
        finalPool: "archive",
        readingPackStatus: "not_selected",
        status: "confirmed"
      })
    );

    const call = candidateUpsert.mock.calls[0][0];
    expect(call.update).toEqual(
      expect.not.objectContaining({
        humanStatus: expect.anything(),
        finalPool: expect.anything(),
        readingPackStatus: expect.anything(),
        status: expect.anything()
      })
    );
    expect(call.update.title).toBe("Updated pool title");
  });
});
