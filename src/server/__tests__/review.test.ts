import { describe, expect, it } from "vitest";
import { applyReviewAction, type ReviewState } from "@/server/services/review";
import { assertValidPool, isValidPool } from "@/shared/poolOptions";

const base: ReviewState = { humanStatus: "pending", finalPool: "knowledge_gap", readingPackStatus: "candidate" };

describe("applyReviewAction", () => {
  it("confirm keeps final pool and marks confirmed", () => {
    expect(applyReviewAction(base, { type: "confirm" })).toMatchObject({
      humanStatus: "confirmed",
      finalPool: "knowledge_gap"
    });
  });

  it("change_pool sets final pool and marks changed", () => {
    expect(applyReviewAction(base, { type: "change_pool", pool: "demo_replication" })).toMatchObject({
      humanStatus: "changed",
      finalPool: "demo_replication"
    });
  });

  it("reject marks rejected", () => {
    expect(applyReviewAction(base, { type: "reject" }).humanStatus).toBe("rejected");
  });

  it("toggle_reading_pack flips selected/not_selected", () => {
    expect(
      applyReviewAction({ ...base, readingPackStatus: "candidate" }, { type: "toggle_reading_pack" })
        .readingPackStatus
    ).toBe("selected");
    expect(
      applyReviewAction({ ...base, readingPackStatus: "selected" }, { type: "toggle_reading_pack" })
        .readingPackStatus
    ).toBe("not_selected");
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
