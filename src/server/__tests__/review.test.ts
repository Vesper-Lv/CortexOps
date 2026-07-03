import { describe, expect, it } from "vitest";
import {
  applyDraftAction,
  computeHumanStatusOnFinalize,
  extractInitialFromRaw
} from "@/server/services/review";
import { assertValidPool, isValidPool } from "@/shared/poolOptions";

describe("applyDraftAction", () => {
  it("set_pool updates finalPool without implying finalize", () => {
    const next = applyDraftAction(
      { finalPool: "knowledge_gap", priority: "P1", readingPackStatus: "candidate" },
      { type: "set_pool", pool: "demo_replication" }
    );
    expect(next.finalPool).toBe("demo_replication");
    expect(next.priority).toBe("P1");
  });

  it("set_priority updates priority", () => {
    const next = applyDraftAction(
      { finalPool: "knowledge_gap", priority: "P1", readingPackStatus: "candidate" },
      { type: "set_priority", priority: "P0" }
    );
    expect(next.priority).toBe("P0");
  });

  it("toggle_reading_pack flips selected/not_selected", () => {
    expect(
      applyDraftAction(
        { finalPool: "knowledge_gap", priority: "P1", readingPackStatus: "candidate" },
        { type: "toggle_reading_pack" }
      ).readingPackStatus
    ).toBe("selected");
    expect(
      applyDraftAction(
        { finalPool: "knowledge_gap", priority: "P1", readingPackStatus: "selected" },
        { type: "toggle_reading_pack" }
      ).readingPackStatus
    ).toBe("not_selected");
  });
});

describe("computeHumanStatusOnFinalize", () => {
  it("marks changed when pool differs from suggested", () => {
    expect(
      computeHumanStatusOnFinalize({
        suggestedPool: "knowledge_gap",
        finalPool: "demo_replication",
        priority: "P1",
        initialPriority: "P1",
        readingPackStatus: "selected",
        initialReadingPackStatus: "selected"
      })
    ).toBe("changed");
  });

  it("marks confirmed when nothing changed from AI values", () => {
    expect(
      computeHumanStatusOnFinalize({
        suggestedPool: "knowledge_gap",
        finalPool: "knowledge_gap",
        priority: "P1",
        initialPriority: "P1",
        readingPackStatus: "selected",
        initialReadingPackStatus: "selected"
      })
    ).toBe("confirmed");
  });

  it("marks changed when priority differs from initial", () => {
    expect(
      computeHumanStatusOnFinalize({
        suggestedPool: "knowledge_gap",
        finalPool: "knowledge_gap",
        priority: "P0",
        initialPriority: "P1",
        readingPackStatus: "candidate",
        initialReadingPackStatus: "candidate"
      })
    ).toBe("changed");
  });
});

describe("extractInitialFromRaw", () => {
  it("reads priority and reading_pack_status from raw JSON", () => {
    const raw = JSON.stringify({ priority: "P1", reading_pack_status: "candidate" });
    expect(extractInitialFromRaw(raw)).toEqual({
      priority: "P1",
      readingPackStatus: "candidate"
    });
  });
});

describe("pool validation", () => {
  it("accepts known pool names", () => {
    expect(isValidPool("knowledge_gap")).toBe(true);
    expect(() => assertValidPool("demo_replication")).not.toThrow();
  });

  it("rejects unknown pool names", () => {
    expect(isValidPool("not_a_pool")).toBe(false);
    expect(() => assertValidPool("not_a_pool")).toThrow(/invalid pool/);
  });
});
