import { describe, expect, it } from "vitest";
import { parseSignalRaw, pickSummary } from "@/server/signalRaw";

describe("parseSignalRaw", () => {
  it("parses known display fields from rawJson", () => {
    const raw = JSON.stringify({
      display_summary: "ds",
      read_reason: "rr",
      focus_direction: "fd",
      priority_rationale: "urgent",
      pool_rationale: "belongs in demo",
      content_tags: ["agent", "ops"]
    });
    const r = parseSignalRaw(raw);
    expect(r.displaySummary).toBe("ds");
    expect(r.readReason).toBe("rr");
    expect(r.focusDirection).toBe("fd");
    expect(r.priorityRationale).toBe("urgent");
    expect(r.poolRationale).toBe("belongs in demo");
    expect(r.contentTags).toEqual(["agent", "ops"]);
  });

  it("ignores non-string content tags", () => {
    const r = parseSignalRaw(JSON.stringify({ content_tags: ["agent", 1, null, "infra"] }));
    expect(r.contentTags).toEqual(["agent", "infra"]);
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
