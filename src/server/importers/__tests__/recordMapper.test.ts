import { describe, expect, it } from "vitest";
import { signalObjectSchema } from "@/shared/schemas/signal";

describe("signalObjectSchema", () => {
  it("accepts a full daily record", () => {
    const r = signalObjectSchema.safeParse({ id: "2026-07-02-01", title: "x", priority: "P0" });
    expect(r.success).toBe(true);
  });

  it("accepts a memory record without id", () => {
    const r = signalObjectSchema.safeParse({ canonical_key: "k", title: "y" });
    expect(r.success).toBe(true);
  });

  it("rejects a non-object", () => {
    expect(signalObjectSchema.safeParse(42).success).toBe(false);
  });
});
