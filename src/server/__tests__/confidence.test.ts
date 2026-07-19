import { beforeEach, describe, expect, it, vi } from "vitest";

const preferenceWeightFindUnique = vi.hoisted(() => vi.fn());
const consolidatePreferenceWeights = vi.hoisted(() =>
  vi.fn(async () => ({ reinforced: 0, decayed: 0, pruned: 0 }))
);

vi.mock("@/server/db", () => ({
  prisma: {
    preferenceWeight: { findUnique: preferenceWeightFindUnique },
    signal: { findMany: vi.fn(), update: vi.fn() },
    auditLog: { create: vi.fn() },
    $transaction: vi.fn(async (ops: unknown) => ops)
  }
}));

vi.mock("@/server/services/focusRules", () => ({
  listEffectiveFocusRules: vi.fn(async () => [])
}));

vi.mock("@/server/services/candidateSync", () => ({
  syncSignalToCandidate: vi.fn()
}));

vi.mock("@/server/services/behaviorLearning", () => ({
  consolidatePreferenceWeights
}));

import { computeDecisionConfidence } from "@/server/services/confidence";
import type { FocusRuleItem } from "@/shared/focusRules";

const focusRule: FocusRuleItem = {
  id: "f1",
  focusId: "focus-1",
  name: "t",
  description: "",
  status: "active",
  priorityBoost: "medium",
  sourceTypes: ["github"],
  contentTags: ["agents"],
  candidatePoolBoost: [],
  appliesTo: [],
  startDate: "2026-01-01",
  endDate: null,
  reviewCadence: null,
  notes: null,
  isEffective: true
};

describe("computeDecisionConfidence history", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("keeps two-factor scoring when eventCount < 5", async () => {
    preferenceWeightFindUnique.mockResolvedValue({
      weight: 0.9,
      eventCount: 4
    });
    const result = await computeDecisionConfidence({
      confidence: "high",
      sourceTier: "Tier 1",
      contentTags: ["agents"],
      sourceType: "github",
      focusRules: []
    });
    expect(result.factors.history).toBeNull();
    expect(result.score).toBeCloseTo(0.5 * result.factors.source + 0.5 * result.factors.focus);
  });

  it("uses three-factor scoring when eventCount >= 5", async () => {
    preferenceWeightFindUnique.mockResolvedValue({
      weight: 0.8,
      eventCount: 5
    });
    const result = await computeDecisionConfidence({
      confidence: "high",
      sourceTier: "Tier 1",
      contentTags: ["agents"],
      sourceType: "github",
      focusRules: [focusRule]
    });
    expect(result.factors.history).toBe(0.8);
    expect(result.score).toBeCloseTo(
      0.35 * result.factors.source + 0.3 * result.factors.focus + 0.35 * 0.8
    );
  });
});
