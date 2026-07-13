import { describe, expect, it } from "vitest";
import { parseSignalRaw, pickSummary } from "@/server/signalRaw";

describe("parseSignalRaw", () => {
  it("parses known display fields from rawJson", () => {
    const raw = JSON.stringify({ display_summary: "ds", read_reason: "rr", focus_direction: "fd" });
    const r = parseSignalRaw(raw);
    expect(r.displaySummary).toBe("ds");
    expect(r.readReason).toBe("rr");
    expect(r.focusDirection).toBe("fd");
  });

  it("returns empty object for invalid json", () => {
    expect(parseSignalRaw("{bad}")).toEqual({});
  });
});

describe("pickSummary", () => {
  it("prefers display_summary, then aihot_summary, then reason", () => {
    expect(pickSummary({ displaySummary: "d" }, "a", "r")).toBe("d");
    expect(pickSummary({}, "a", "r")).toBe("a");
    expect(pickSummary({}, null, "r")).toBe("r");
    expect(pickSummary({}, null, null)).toBe("");
  });
});
