import { describe, expect, it } from "vitest";
import { applyReviewAction, type ReviewState } from "@/server/services/review";

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
