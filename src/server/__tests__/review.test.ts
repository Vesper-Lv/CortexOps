import { describe, expect, it } from "vitest";
import {
  applyDraftAction,
  computeHumanStatusOnFinalize,
  extractInitialFromRaw
} from "@/server/services/review";
import { computeStatusOnFinalize } from "@/shared/signalStatus";
import { assertValidPool, isValidPool } from "@/shared/poolOptions";

describe("applyDraftAction", () => {
  it("set_pool updates finalPool without implying finalize", () => {
    const next = applyDraftAction(
      { finalPool: "engineering", priority: "P1", readingPackStatus: "candidate" },
      { type: "set_pool", pool: "personal_work" }
    );
    expect(next.finalPool).toBe("engineering");
    expect(next.priority).toBe("P1");
  });

  it("set_priority updates priority", () => {
    const next = applyDraftAction(
      { finalPool: "engineering", priority: "P1", readingPackStatus: "candidate" },
      { type: "set_priority", priority: "P0" }
    );
    expect(next.priority).toBe("P0");
  });

  it("toggle_reading_pack flips selected/not_selected", () => {
    expect(
      applyDraftAction(
        { finalPool: "engineering", priority: "P1", readingPackStatus: "candidate" },
        { type: "toggle_reading_pack" }
      ).readingPackStatus
    ).toBe("selected");
    expect(
      applyDraftAction(
        { finalPool: "engineering", priority: "P1", readingPackStatus: "selected" },
        { type: "toggle_reading_pack" }
      ).readingPackStatus
    ).toBe("not_selected");
  });
});

describe("computeHumanStatusOnFinalize", () => {
  it("marks changed when pool differs from suggested", () => {
    expect(
      computeHumanStatusOnFinalize({
        suggestedPool: "engineering",
        finalPool: "product",
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
        suggestedPool: "engineering",
        finalPool: "engineering",
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
        suggestedPool: "engineering",
        finalPool: "engineering",
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

describe("computeStatusOnFinalize", () => {
  it("maps drop pool to dropped lifecycle status", () => {
    expect(computeStatusOnFinalize("drop")).toBe("dropped");
  });

  it("maps normal pools to confirmed lifecycle status", () => {
    expect(computeStatusOnFinalize("engineering")).toBe("confirmed");
  });
});

describe("pool validation", () => {
  it("accepts known pool names", () => {
    expect(isValidPool("product")).toBe(true);
    expect(() => assertValidPool("paper")).not.toThrow();
  });

  it("rejects unknown pool names", () => {
    expect(isValidPool("not_a_pool")).toBe(false);
    expect(() => assertValidPool("not_a_pool")).toThrow(/invalid pool/);
  });
});
