import { describe, expect, it } from "vitest";
import { parseSignalRaw } from "@/server/signalRaw";

describe("content tag extraction for library search", () => {
  it("reads content_tags from signal rawJson", () => {
    const raw = parseSignalRaw(
      JSON.stringify({ content_tags: ["agent", "workflow", "agent"] })
    );
    expect(raw.contentTags).toEqual(["agent", "workflow", "agent"]);
  });

  it("dedupes vocabulary style", () => {
    const rows = [
      JSON.stringify({ content_tags: ["agent", "infra"] }),
      JSON.stringify({ content_tags: ["agent", "demo"] }),
      JSON.stringify({ content_tags: [] }),
      "not-json"
    ];
    const tags = new Set<string>();
    for (const rawJson of rows) {
      for (const t of parseSignalRaw(rawJson).contentTags ?? []) {
        if (t.trim()) tags.add(t.trim());
      }
    }
    expect([...tags].sort()).toEqual(["agent", "demo", "infra"]);
  });
});
