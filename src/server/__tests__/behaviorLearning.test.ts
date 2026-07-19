import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  signalFindUnique,
  signalUpdate,
  behaviorEventCreate,
  behaviorEventFindMany,
  preferenceWeightFindUnique,
  preferenceWeightCreate,
  preferenceWeightUpdate,
  preferenceWeightFindMany,
  preferenceWeightDelete,
  auditLogCreate,
  transaction
} = vi.hoisted(() => ({
  signalFindUnique: vi.fn(),
  signalUpdate: vi.fn(),
  behaviorEventCreate: vi.fn(),
  behaviorEventFindMany: vi.fn(),
  preferenceWeightFindUnique: vi.fn(),
  preferenceWeightCreate: vi.fn(),
  preferenceWeightUpdate: vi.fn(),
  preferenceWeightFindMany: vi.fn(),
  preferenceWeightDelete: vi.fn(),
  auditLogCreate: vi.fn(),
  transaction: vi.fn(async (ops: unknown) => ops)
}));

vi.mock("@/server/db", () => ({
  prisma: {
    signal: { findUnique: signalFindUnique, update: signalUpdate },
    behaviorEvent: { create: behaviorEventCreate, findMany: behaviorEventFindMany },
    preferenceWeight: {
      findUnique: preferenceWeightFindUnique,
      create: preferenceWeightCreate,
      update: preferenceWeightUpdate,
      findMany: preferenceWeightFindMany,
      delete: preferenceWeightDelete
    },
    auditLog: { create: auditLogCreate },
    $transaction: transaction
  }
}));

import {
  consolidatePreferenceWeights,
  recordBehaviorEvent
} from "@/server/services/behaviorLearning";
import { DEFAULT_WEIGHT } from "@/shared/preferenceLearning";

describe("recordBehaviorEvent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    behaviorEventCreate.mockResolvedValue({ id: "evt-1" });
    preferenceWeightCreate.mockResolvedValue({ id: "pw-1" });
    preferenceWeightUpdate.mockResolvedValue({ id: "pw-1" });
    signalUpdate.mockResolvedValue({});
    auditLogCreate.mockResolvedValue({});
  });

  it("thumbs_up creates event and bumps weight", async () => {
    signalFindUnique.mockResolvedValue({
      id: "sig-1",
      decisionConfidence: 0.2,
      readingPackStatus: "selected",
      rawJson: JSON.stringify({ content_tags: ["Agents"], source_type: "GitHub" })
    });
    preferenceWeightFindUnique.mockResolvedValue(null);

    const result = await recordBehaviorEvent({
      signalId: "sig-1",
      eventType: "thumbs_up",
      reason: null
    });

    expect(result.weightUpdated).toBe(true);
    expect(behaviorEventCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          signalId: "sig-1",
          eventType: "thumbs_up",
          reason: null,
          predictedConfidence: 0.2,
          sourceType: "GitHub"
        })
      })
    );
    expect(preferenceWeightCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          contentTags: "agents",
          sourceType: "github",
          eventCount: 1
        })
      })
    );
    const createdWeight = preferenceWeightCreate.mock.calls[0][0].data.weight;
    expect(createdWeight).toBeCloseTo(DEFAULT_WEIGHT + 0.2 * 1 * (1 - 0.2), 5);
    expect(signalUpdate).not.toHaveBeenCalled();
  });

  it("thumbs_down + source_quality creates event but does not change weight", async () => {
    signalFindUnique.mockResolvedValue({
      id: "sig-2",
      decisionConfidence: 0.9,
      readingPackStatus: "selected",
      rawJson: JSON.stringify({ content_tags: ["agents"], source_type: "github" })
    });

    const result = await recordBehaviorEvent({
      signalId: "sig-2",
      eventType: "thumbs_down",
      reason: "source_quality"
    });

    expect(result.weightUpdated).toBe(false);
    expect(behaviorEventCreate).toHaveBeenCalled();
    expect(preferenceWeightCreate).not.toHaveBeenCalled();
    expect(preferenceWeightUpdate).not.toHaveBeenCalled();
    expect(signalUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "sig-2" },
        data: { readingPackStatus: "not_selected" }
      })
    );
  });

  it("thumbs_down sets readingPackStatus to not_selected", async () => {
    signalFindUnique.mockResolvedValue({
      id: "sig-3",
      decisionConfidence: 0.7,
      readingPackStatus: "selected",
      rawJson: JSON.stringify({ content_tags: ["rag"], source_type: "paper" })
    });
    preferenceWeightFindUnique.mockResolvedValue({
      id: "pw-existing",
      weight: 0.5,
      eventCount: 2
    });

    await recordBehaviorEvent({
      signalId: "sig-3",
      eventType: "thumbs_down",
      reason: "direction"
    });

    expect(signalUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { readingPackStatus: "not_selected" }
      })
    );
    expect(preferenceWeightUpdate).toHaveBeenCalled();
  });
});

describe("consolidatePreferenceWeights", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    preferenceWeightUpdate.mockResolvedValue({});
    preferenceWeightDelete.mockResolvedValue({});
  });

  it("reinforces weights with enough recent events", async () => {
    const now = new Date();
    preferenceWeightFindMany.mockResolvedValue([
      {
        id: "pw-active",
        contentTags: "agents",
        sourceType: "github",
        weight: 0.5,
        eventCount: 3,
        lastUpdated: now,
        _count: undefined
      }
    ]);

    behaviorEventFindMany.mockResolvedValue([
      {
        contentTags: JSON.stringify(["agents"]),
        sourceType: "github",
        createdAt: now
      },
      {
        contentTags: JSON.stringify(["agents"]),
        sourceType: "github",
        createdAt: now
      }
    ]);

    const result = await consolidatePreferenceWeights();
    expect(result.reinforced).toBe(1);
    expect(preferenceWeightUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "pw-active" },
        data: expect.objectContaining({
          weight: expect.any(Number)
        })
      })
    );
  });

  it("decays idle weights older than consolidation window", async () => {
    const old = new Date();
    old.setDate(old.getDate() - 20);
    preferenceWeightFindMany.mockResolvedValue([
      {
        id: "pw-idle",
        contentTags: "old",
        sourceType: "news",
        weight: 0.5,
        eventCount: 6,
        lastUpdated: old
      }
    ]);
    behaviorEventFindMany.mockResolvedValue([]);

    const result = await consolidatePreferenceWeights();
    expect(result.decayed).toBe(1);
    expect(preferenceWeightUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "pw-idle" },
        data: expect.objectContaining({
          weight: expect.closeTo(0.5 * 0.97, 5)
        })
      })
    );
  });

  it("prunes low-weight idle rows below history threshold", async () => {
    const old = new Date();
    old.setDate(old.getDate() - 40);
    preferenceWeightFindMany.mockResolvedValue([
      {
        id: "pw-prune",
        contentTags: "noise",
        sourceType: "",
        weight: 0.02,
        eventCount: 2,
        lastUpdated: old
      }
    ]);
    behaviorEventFindMany.mockResolvedValue([]);

    const result = await consolidatePreferenceWeights();
    expect(result.pruned).toBe(1);
    expect(preferenceWeightDelete).toHaveBeenCalledWith({ where: { id: "pw-prune" } });
  });
});
