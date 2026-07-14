import { describe, expect, it } from "vitest";
import { monthWindowContaining, weekWindowEnding } from "@/server/services/periodTracking";
import { practiceTaskMarker } from "@/server/services/tasks";

describe("periodTracking windows", () => {
  it("weekWindowEnding covers 7 days inclusive", () => {
    expect(weekWindowEnding("2026-07-12")).toEqual({
      start: "2026-07-06",
      end: "2026-07-12"
    });
  });

  it("monthWindowContaining covers calendar month", () => {
    expect(monthWindowContaining("2026-07-14")).toEqual({
      start: "2026-07-01",
      end: "2026-07-31"
    });
  });
});

describe("practiceTaskMarker", () => {
  it("embeds date and index", () => {
    expect(practiceTaskMarker("2026-07-14", 1)).toBe("[practice:2026-07-14:1]");
  });
});
