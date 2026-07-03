import { describe, expect, it } from "vitest";
import {
  canWatchCandidate,
  computeStatusOnFinalize,
  isDownstreamEligible,
  isValidSignalStatus
} from "@/shared/signalStatus";

describe("computeStatusOnFinalize", () => {
  it("returns dropped when final pool is drop", () => {
    expect(computeStatusOnFinalize("drop")).toBe("dropped");
  });

  it("returns confirmed for other pools", () => {
    expect(computeStatusOnFinalize("knowledge_gap")).toBe("confirmed");
    expect(computeStatusOnFinalize(null)).toBe("confirmed");
  });
});

describe("isDownstreamEligible", () => {
  it("allows confirmed with watching status", () => {
    expect(
      isDownstreamEligible({ humanStatus: "confirmed", status: "watching", finalPool: "knowledge_gap" })
    ).toBe(true);
  });

  it("blocks pending", () => {
    expect(
      isDownstreamEligible({ humanStatus: "pending", status: "inbox", finalPool: "knowledge_gap" })
    ).toBe(false);
  });

  it("blocks drop pool", () => {
    expect(
      isDownstreamEligible({ humanStatus: "changed", status: "confirmed", finalPool: "drop" })
    ).toBe(false);
  });

  it("blocks dropped status", () => {
    expect(
      isDownstreamEligible({ humanStatus: "confirmed", status: "dropped", finalPool: "archive" })
    ).toBe(false);
  });

  it("blocks import-only rejected human status", () => {
    expect(
      isDownstreamEligible({ humanStatus: "rejected", status: "inbox", finalPool: "archive" })
    ).toBe(false);
  });
});

describe("canWatchCandidate", () => {
  it("allows confirmed non-dropped items", () => {
    expect(canWatchCandidate({ humanStatus: "confirmed", status: "confirmed" })).toBe(true);
  });

  it("blocks pending and dropped", () => {
    expect(canWatchCandidate({ humanStatus: "pending", status: "inbox" })).toBe(false);
    expect(canWatchCandidate({ humanStatus: "confirmed", status: "dropped" })).toBe(false);
  });
});

describe("isValidSignalStatus", () => {
  it("accepts known lifecycle values", () => {
    expect(isValidSignalStatus("watching")).toBe(true);
    expect(isValidSignalStatus("not_a_status")).toBe(false);
  });
});
