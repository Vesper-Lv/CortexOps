import { describe, expect, it } from "vitest";
import { signalObjectSchema } from "@/shared/schemas/signal";
import { mapToSignal, mapToCandidate, computeRecordKey } from "@/server/importers/recordMapper";
import type { ParsedLine } from "@/server/importers/jsonlParser";

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

const line = (value: Record<string, unknown>, raw?: string): ParsedLine => ({
  line: 1,
  raw: raw ?? JSON.stringify(value),
  value
});

describe("mapToSignal", () => {
  it("maps snake_case fields, sets stream, preserves rawJson", () => {
    const rec = mapToSignal(line({ id: "2026-07-02-01", final_pool: "knowledge_gap", title: "t" }), {
      stream: "daily",
      sourceFile: "state/daily/2026-07-02-links.jsonl"
    });
    expect(rec.externalId).toBe("2026-07-02-01");
    expect(rec.finalPool).toBe("knowledge_gap");
    expect(rec.stream).toBe("daily");
    expect(rec.recordKey).toBe("daily:2026-07-02-01");
    expect(rec.rawJson).toContain('"title":"t"');
  });

  it("uses canonical_key when id is absent (memory stream)", () => {
    const rec = mapToSignal(line({ canonical_key: "enterprise_ai_cost_control" }), {
      stream: "memory",
      sourceFile: "state/memory/ai-pm-7d.jsonl"
    });
    expect(rec.externalId).toBeNull();
    expect(rec.recordKey).toBe("memory:enterprise_ai_cost_control");
  });
});

describe("mapToCandidate", () => {
  it("sets poolName and pool-scoped recordKey", () => {
    const rec = mapToCandidate(line({ id: "2026-07-02-11", final_pool: "product_inspiration" }), {
      poolName: "product-inspiration",
      sourceFile: "pools/product-inspiration.jsonl"
    });
    expect(rec.poolName).toBe("product-inspiration");
    expect(rec.finalPool).toBe("product_inspiration");
    expect(rec.recordKey).toBe("product-inspiration:2026-07-02-11");
  });
});

describe("computeRecordKey", () => {
  it("falls back to sourceFile#line when no id or canonical_key", () => {
    expect(
      computeRecordKey({ scope: "daily", externalId: null, canonicalKey: null, sourceFile: "f", sourceLine: 3 })
    ).toBe("daily:f#3");
  });
});
