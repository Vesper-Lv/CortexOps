import { describe, expect, it } from "vitest";
import {
  extractFocusRulesFromMarkdown,
  parseFocusRuleYaml
} from "@/server/importers/focusPolicyParser";

const GITHUB_RULE = `\`\`\`yaml
focus_id: focus-github-practice-fit
name: GitHub Practice Fit
description: Prefer GitHub repositories
status: active
priority_boost: high
source_types:
  - github_repo
content_tags:
  - agent
candidate_pool_boost:
  - demo_replication
applies_to:
  - daily_radar
start_date: 2026-07-01
end_date: 2026-07-14
\`\`\``;

describe("focusPolicyParser", () => {
  it("parses a focus rule yaml block", () => {
    const rule = parseFocusRuleYaml(GITHUB_RULE.replace(/```yaml\n?|\`\`\`/g, ""));
    expect(rule?.focus_id).toBe("focus-github-practice-fit");
    expect(rule?.source_types).toContain("github_repo");
    expect(rule?.status).toBe("active");
  });

  it("extracts rules from markdown", () => {
    const md = `# Policy\n\n### Rule\n\n${GITHUB_RULE}`;
    const rules = extractFocusRulesFromMarkdown(md);
    expect(rules).toHaveLength(1);
    expect(rules[0]?.name).toBe("GitHub Practice Fit");
  });
});
