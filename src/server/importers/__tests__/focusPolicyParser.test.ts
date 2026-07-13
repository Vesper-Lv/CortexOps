import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { extractFocusRulesFromMarkdown } from "@/server/importers/focusPolicyParser";

describe("focusPolicyParser real policy", () => {
  it("preserves multi-line descriptions from docs/focus-policy.md", () => {
    const markdown = readFileSync("docs/focus-policy.md", "utf8");
    const rules = extractFocusRulesFromMarkdown(markdown);
    const github = rules.find((r) => r.focus_id === "focus-github-practice-fit");
    expect(github).toBeDefined();
    expect(github!.description).toContain("lightly replicated");
    expect(github!.description).toContain("artifact");
    expect(github!.notes).toContain("trial path");
  });
});
