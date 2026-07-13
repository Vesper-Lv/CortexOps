import { beforeEach, describe, expect, it, vi } from "vitest";

const { taskFindUnique, artifactFindFirst, artifactCreate, auditCreate, transaction } = vi.hoisted(() => ({
  taskFindUnique: vi.fn(),
  artifactFindFirst: vi.fn(),
  artifactCreate: vi.fn(),
  auditCreate: vi.fn(),
  transaction: vi.fn()
}));

vi.mock("@/server/db", () => ({
  prisma: {
    task: { findUnique: taskFindUnique },
    artifact: { findFirst: artifactFindFirst, create: artifactCreate },
    auditLog: { create: auditCreate },
    $transaction: transaction
  }
}));

import { promoteTaskToArtifact } from "@/server/services/artifacts";

describe("promoteTaskToArtifact", () => {
  beforeEach(() => {
    taskFindUnique.mockReset();
    artifactFindFirst.mockReset();
    artifactCreate.mockReset().mockResolvedValue({ id: "artifact-1" });
    auditCreate.mockReset().mockResolvedValue({});
    transaction.mockReset().mockImplementation(async (fn) =>
      fn({
        artifact: { create: artifactCreate },
        auditLog: { create: auditCreate }
      })
    );
  });

  it("creates an artifact from a done task", async () => {
    taskFindUnique.mockResolvedValue({
      id: "task-1",
      title: "Ship demo",
      description: "Acceptance notes",
      status: "done",
      linkedSignalId: "signal-1",
      linkedCandidateId: "candidate-1",
      linkedReportId: "2026-07-02"
    });
    artifactFindFirst.mockResolvedValue(null);

    await expect(promoteTaskToArtifact("task-1")).resolves.toBe("artifact-1");
    expect(artifactCreate).toHaveBeenCalledWith({
      data: {
        title: "Ship demo",
        description: "Acceptance notes",
        origin: "task",
        linkedSignalId: "signal-1",
        linkedCandidateId: "candidate-1",
        linkedReportId: "2026-07-02",
        status: "draft"
      }
    });
  });

  it("rejects tasks that are not done", async () => {
    taskFindUnique.mockResolvedValue({
      id: "task-1",
      status: "in_progress"
    });

    await expect(promoteTaskToArtifact("task-1")).rejects.toThrow("task must be done");
  });
});
