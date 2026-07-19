import { describe, expect, it } from "vitest";
import {
  preferenceKey,
  nextWeight,
  historyFromWeight,
  reasonScale,
  DEFAULT_WEIGHT,
  HISTORY_MIN_EVENTS
} from "@/shared/preferenceLearning";

describe("preferenceKey", () => {
  it("sorts and lowercases tags", () => {
    expect(preferenceKey(["B", "a"], "GitHub")).toEqual({
      contentTags: "a|b",
      sourceType: "github"
    });
  });
});

describe("reasonScale", () => {
  it("skips source_quality", () => {
    expect(reasonScale("source_quality")).toBe(0);
  });
  it("reduces shallow", () => {
    expect(reasonScale("shallow")).toBe(0.4);
  });
});

describe("nextWeight", () => {
  it("raises weight on thumbs_up when prediction was low", () => {
    const w = nextWeight({
      currentWeight: DEFAULT_WEIGHT,
      predictedConfidence: 0.2,
      eventType: "thumbs_up",
      reason: null
    });
    expect(w).toBeCloseTo(0.5 + 0.2 * 1 * (1 - 0.2), 5);
  });

  it("returns null for source_quality", () => {
    expect(
      nextWeight({
        currentWeight: 0.5,
        predictedConfidence: 0.9,
        eventType: "thumbs_down",
        reason: "source_quality"
      })
    ).toBeNull();
  });
});

describe("historyFromWeight", () => {
  it("returns null below min events", () => {
    expect(historyFromWeight(0.8, HISTORY_MIN_EVENTS - 1)).toBeNull();
  });
  it("returns weight at threshold", () => {
    expect(historyFromWeight(0.8, HISTORY_MIN_EVENTS)).toBe(0.8);
  });
});
