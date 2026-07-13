import { beforeEach, describe, expect, it, vi } from "vitest";

const { candidateFindUnique, candidateUpdate, auditCreate, transaction, signalFindUnique, signalUpdate } =
  vi.hoisted(() => ({
    candidateFindUnique: vi.fn(),
    candidateUpdate: vi.fn(),
    auditCreate: vi.fn(),
    transaction: vi.fn(),
    signalFindUnique: vi.fn(),
    signalUpdate: vi.fn()
  }));

vi.mock("@/server/db", () => ({
  prisma: {
    candidate: {
      findUnique: candidateFindUnique,
      update: candidateUpdate,
      findMany: vi.fn()
    },
    signal: {
      findUnique: signalFindUnique,
      update: signalUpdate
    },
    task: { findMany: vi.fn() },
    artifact: { findMany: vi.fn() },
    auditLog: { create: auditCreate },
    $transaction: transaction
  }
}));

import { updateCandidatePriority } from "@/server/services/candidatePools";

describe("updateCandidatePriority", () => {
  beforeEach(() => {
    candidateFindUnique.mockReset();
    candidateUpdate.mockReset().mockResolvedValue({});
    auditCreate.mockReset().mockResolvedValue({});
    signalFindUnique.mockReset();
    signalUpdate.mockReset().mockResolvedValue({});
    transaction.mockReset().mockImplementation(async (ops: unknown[]) => ops);
  });

  it("updates candidate priority and syncs a linked signal", async () => {
    candidateFindUnique.mockResolvedValue({
      id: "candidate-1",
      recordKey: "signal-sync:daily:signal-1",
      priority: "P2"
    });
    signalFindUnique.mockResolvedValue({
      id: "signal-1"
    });

    await updateCandidatePriority("candidate-1", "P0");

    expect(candidateUpdate).toHaveBeenCalledWith({
      where: { id: "candidate-1" },
      data: { priority: "P0" }
    });
    expect(signalUpdate).toHaveBeenCalledWith({
      where: { id: "signal-1" },
      data: { priority: "P0" }
    });
  });
});
