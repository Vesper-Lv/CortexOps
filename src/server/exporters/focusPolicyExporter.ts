import {
  parseFocusRuleYaml,
  serializeFocusRuleToYaml,
  type ParsedFocusRule
} from "@/server/importers/focusPolicyParser";
import { prisma } from "@/server/db";
import { parseJsonArray } from "@/shared/focusRules";

export type FocusPolicyPatchResult = {
  markdown: string;
  updated: number;
  appended: number;
  unchanged: number;
};

function dbRowToParsed(row: {
  focusId: string;
  name: string;
  description: string;
  status: string;
  priorityBoost: string;
  sourceTypesJson: string;
  contentTagsJson: string;
  candidatePoolBoostJson: string;
  appliesToJson: string;
  startDate: string;
  endDate: string | null;
  reviewCadence: string | null;
  notes: string | null;
}): ParsedFocusRule {
  return {
    focus_id: row.focusId,
    name: row.name,
    description: row.description,
    status: row.status,
    priority_boost: row.priorityBoost,
    source_types: parseJsonArray(row.sourceTypesJson),
    content_tags: parseJsonArray(row.contentTagsJson),
    candidate_pool_boost: parseJsonArray(row.candidatePoolBoostJson),
    applies_to: parseJsonArray(row.appliesToJson),
    start_date: row.startDate,
    end_date: row.endDate ?? undefined,
    review_cadence: row.reviewCadence ?? undefined,
    notes: row.notes ?? undefined
  };
}

function renderRuleBlock(rule: ParsedFocusRule): string {
  return `### ${rule.name}\n\n\`\`\`yaml\n${serializeFocusRuleToYaml(rule)}\n\`\`\``;
}

const YAML_BLOCK_RE = /```yaml\n([\s\S]*?)```/g;

export function patchFocusPolicyMarkdown(
  markdown: string,
  rulesById: Map<string, ParsedFocusRule>
): FocusPolicyPatchResult {
  const seen = new Set<string>();
  let updated = 0;
  let unchanged = 0;

  const patched = markdown.replace(YAML_BLOCK_RE, (full, inner: string) => {
    if (!inner.includes("focus_id:")) return full;
    const parsed = parseFocusRuleYaml(inner);
    if (!parsed) return full;

    const dbRule = rulesById.get(parsed.focus_id);
    if (!dbRule) {
      unchanged += 1;
      return full;
    }

    seen.add(parsed.focus_id);
    const nextRule: ParsedFocusRule = {
      ...dbRule,
      ...(parsed.created_at ? { created_at: parsed.created_at } : {}),
      ...(parsed.updated_at ? { updated_at: parsed.updated_at } : {})
    };
    const nextYaml = serializeFocusRuleToYaml(nextRule);
    if (nextYaml.trim() === inner.trim()) {
      unchanged += 1;
      return full;
    }

    updated += 1;
    return `\`\`\`yaml\n${nextYaml}\n\`\`\``;
  });

  const missing = [...rulesById.values()].filter((r) => !seen.has(r.focus_id));
  if (missing.length === 0) {
    return { markdown: patched, updated, appended: 0, unchanged };
  }

  const sectionEnd = patched.indexOf("\n## 4.1 ");
  const insertAt = sectionEnd >= 0 ? sectionEnd : patched.length;
  const appendedBlocks = missing.map((r) => `\n${renderRuleBlock(r)}`).join("\n");
  const markdownWithAppend =
    patched.slice(0, insertAt) + appendedBlocks + patched.slice(insertAt);

  return {
    markdown: markdownWithAppend,
    updated,
    appended: missing.length,
    unchanged
  };
}

export async function exportFocusPolicyToMarkdown(
  existingMarkdown: string,
  options: { dryRun: boolean; writeFile?: (content: string) => Promise<void> }
): Promise<FocusPolicyPatchResult & { dryRun: boolean }> {
  const rows = await prisma.focusRule.findMany({ orderBy: { focusId: "asc" } });
  const rulesById = new Map(rows.map((r) => [r.focusId, dbRowToParsed(r)]));
  const result = patchFocusPolicyMarkdown(existingMarkdown, rulesById);

  if (!options.dryRun && options.writeFile && (result.updated > 0 || result.appended > 0)) {
    await options.writeFile(result.markdown);
  }

  return { ...result, dryRun: options.dryRun };
}

export function formatFocusPolicyPatchResult(
  result: FocusPolicyPatchResult & { dryRun: boolean }
): string {
  const lines = [
    result.dryRun ? "focus-policy export (dry-run)" : "focus-policy export (write)",
    `blocks updated: ${result.updated}`,
    `blocks appended: ${result.appended}`,
    `blocks unchanged: ${result.unchanged}`
  ];
  if (result.dryRun && (result.updated > 0 || result.appended > 0)) {
    lines.push("\nRe-run with --write to apply changes to docs/focus-policy.md.");
  }
  return lines.join("\n");
}
