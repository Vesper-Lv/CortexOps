import { describe, expect, it } from "vitest";
import { parseJsonlContent } from "@/server/importers/jsonlParser";

describe("parseJsonlContent", () => {
  it("returns nothing for empty content", () => {
    const r = parseJsonlContent("");
    expect(r.parsed).toHaveLength(0);
    expect(r.errors).toHaveLength(0);
  });

  it("parses normal lines and skips blank lines", () => {
    const content = '{"id":"a"}\n\n{"id":"b"}\n';
    const r = parseJsonlContent(content);
    expect(r.parsed.map((p) => p.value.id)).toEqual(["a", "b"]);
    expect(r.errors).toHaveLength(0);
  });

  it("collects a bad line as error without aborting others", () => {
    const content = '{"id":"a"}\n{bad json}\n{"id":"c"}\n';
    const r = parseJsonlContent(content);
    expect(r.parsed.map((p) => p.value.id)).toEqual(["a", "c"]);
    expect(r.errors).toHaveLength(1);
    expect(r.errors[0].line).toBe(2);
  });

  it("keeps the raw line text for each parsed record", () => {
    const r = parseJsonlContent('{"id":"a","title":"t"}\n');
    expect(r.parsed[0].raw).toBe('{"id":"a","title":"t"}');
  });

  it("keeps a valid object with a non-string field (recoverable via rawJson)", () => {
    const r = parseJsonlContent('{"id":"a","priority":3}\n');
    expect(r.errors).toHaveLength(0);
    expect(r.parsed).toHaveLength(1);
    expect(r.parsed[0].raw).toContain('"priority":3');
  });
});
