import { describe, expect, it } from "vitest";
import {
  canPromoteItem,
  canWatchCandidate,
  isDownstreamEligible,
  isDroppedItem
} from "@/shared/signalStatus";

describe("isDroppedItem", () => {
  it("detects drop pool and dropped status", () => {
    expect(isDroppedItem({ finalPool: "drop", status: "confirmed" })).toBe(true);
    expect(isDroppedItem({ finalPool: "archive", status: "dropped" })).toBe(true);
    expect(isDroppedItem({ finalPool: "archive", status: "confirmed" })).toBe(false);
  });
});

describe("canWatchCandidate", () => {
  it("blocks pending and dropped", () => {
    expect(
      canWatchCandidate({ humanStatus: "pending", status: "inbox", finalPool: "knowledge_gap" })
    ).toBe(false);
    expect(
      canWatchCandidate({ humanStatus: "confirmed", status: "dropped", finalPool: "drop" })
    ).toBe(false);
    expect(
      canWatchCandidate({ humanStatus: "confirmed", status: "confirmed", finalPool: "drop" })
    ).toBe(false);
  });

  it("allows confirmed non-dropped", () => {
    expect(
      canWatchCandidate({ humanStatus: "confirmed", status: "confirmed", finalPool: "knowledge_gap" })
    ).toBe(true);
  });
});

describe("canPromoteItem", () => {
  it("blocks pending and dropped", () => {
    expect(
      canPromoteItem({ humanStatus: "pending", status: "inbox", finalPool: "knowledge_gap" })
    ).toBe(false);
    expect(
      canPromoteItem({ humanStatus: "confirmed", status: "dropped", finalPool: "archive" })
    ).toBe(false);
  });

  it("allows triaged non-dropped", () => {
    expect(
      canPromoteItem({ humanStatus: "changed", status: "confirmed", finalPool: "demo_replication" })
    ).toBe(true);
  });
});

describe("isDownstreamEligible", () => {
  it("requires triaged non-drop lifecycle", () => {
    expect(
      isDownstreamEligible({ humanStatus: "confirmed", status: "confirmed", finalPool: "knowledge_gap" })
    ).toBe(true);
    expect(
      isDownstreamEligible({ humanStatus: "pending", status: "inbox", finalPool: "knowledge_gap" })
    ).toBe(false);
  });
});
