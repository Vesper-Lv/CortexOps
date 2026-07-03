import { prisma } from "@/server/db";
import {
  extractFocusRulesFromMarkdown,
  serializeFocusRuleToYaml,
  type ParsedFocusRule
} from "@/server/importers/focusPolicyParser";
import type { FocusRuleItem } from "@/shared/focusRules";
import {
  buildImpactPreview,
  isFocusRuleEffective,
  parseJsonArray
} from "@/shared/focusRules";

function mapRule(row: {
  id: string;
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
}): FocusRuleItem {
  const sourceTypes = parseJsonArray(row.sourceTypesJson);
  const contentTags = parseJsonArray(row.contentTagsJson);
  const candidatePoolBoost = parseJsonArray(row.candidatePoolBoostJson);
  const appliesTo = parseJsonArray(row.appliesToJson);

  return {
    id: row.id,
    focusId: row.focusId,
    name: row.name,
    description: row.description,
    status: row.status,
    priorityBoost: row.priorityBoost,
    sourceTypes,
    contentTags,
    candidatePoolBoost,
    appliesTo,
    startDate: row.startDate,
    endDate: row.endDate,
    reviewCadence: row.reviewCadence,
    notes: row.notes,
    isEffective: isFocusRuleEffective(row)
  };
}

function toDbInput(rule: ParsedFocusRule) {
  return {
    focusId: rule.focus_id,
    name: rule.name,
    description: rule.description,
    status: rule.status,
    priorityBoost: rule.priority_boost,
    sourceTypesJson: JSON.stringify(rule.source_types),
    contentTagsJson: JSON.stringify(rule.content_tags),
    candidatePoolBoostJson: JSON.stringify(rule.candidate_pool_boost),
    appliesToJson: JSON.stringify(rule.applies_to),
    startDate: rule.start_date,
    endDate: rule.end_date ?? null,
    reviewCadence: rule.review_cadence ?? null,
    notes: rule.notes ?? null
  };
}

export async function importFocusPolicyFromMarkdown(
  markdown: string,
  options?: { preserveUserEdits?: boolean }
): Promise<{ imported: number; skipped: number }> {
  const parsed = extractFocusRulesFromMarkdown(markdown);
  let imported = 0;
  let skipped = 0;

  for (const rule of parsed) {
    const existing = await prisma.focusRule.findUnique({ where: { focusId: rule.focus_id } });
    if (existing && options?.preserveUserEdits) {
      skipped += 1;
      continue;
    }

    await prisma.focusRule.upsert({
      where: { focusId: rule.focus_id },
      create: toDbInput(rule),
      update: toDbInput(rule)
    });
    imported += 1;
  }

  return { imported, skipped };
}

export async function listFocusRules(status?: string): Promise<FocusRuleItem[]> {
  const rows = await prisma.focusRule.findMany({
    where: status ? { status } : undefined,
    orderBy: [{ status: "asc" }, { startDate: "desc" }]
  });
  return rows.map(mapRule);
}

export async function getFocusRuleImpactPreview(focusId: string): Promise<string[]> {
  const row = await prisma.focusRule.findUnique({ where: { focusId } });
  if (!row) return [];
  return buildImpactPreview({
    name: row.name,
    sourceTypes: parseJsonArray(row.sourceTypesJson),
    candidatePoolBoost: parseJsonArray(row.candidatePoolBoostJson),
    appliesTo: parseJsonArray(row.appliesToJson),
    priorityBoost: row.priorityBoost
  });
}

export async function pauseFocusRule(focusId: string): Promise<void> {
  await updateFocusRuleStatus(focusId, "paused");
}

export async function activateFocusRule(focusId: string): Promise<void> {
  await updateFocusRuleStatus(focusId, "active");
}

export async function archiveFocusRule(focusId: string): Promise<void> {
  await updateFocusRuleStatus(focusId, "archived");
}

export async function extendFocusRule(focusId: string, newEndDate: string): Promise<void> {
  const rule = await prisma.focusRule.findUnique({ where: { focusId } });
  if (!rule) throw new Error("focus rule not found");

  await prisma.$transaction([
    prisma.focusRule.update({
      where: { focusId },
      data: { endDate: newEndDate, status: rule.status === "expired" ? "active" : rule.status }
    }),
    prisma.auditLog.create({
      data: {
        entityType: "focus_rule",
        entityId: rule.id,
        action: "extend",
        fromValue: rule.endDate,
        toValue: newEndDate
      }
    })
  ]);
}

async function updateFocusRuleStatus(focusId: string, status: string): Promise<void> {
  const rule = await prisma.focusRule.findUnique({ where: { focusId } });
  if (!rule) throw new Error("focus rule not found");

  await prisma.$transaction([
    prisma.focusRule.update({ where: { focusId }, data: { status } }),
    prisma.auditLog.create({
      data: {
        entityType: "focus_rule",
        entityId: rule.id,
        action: "update_status",
        fromValue: rule.status,
        toValue: status
      }
    })
  ]);
}

export async function refreshExpiredFocusRules(): Promise<number> {
  const today = new Date().toISOString().slice(0, 10);
  const result = await prisma.focusRule.updateMany({
    where: {
      status: "active",
      endDate: { lt: today }
    },
    data: { status: "expired" }
  });
  return result.count;
}

export async function listEffectiveFocusRules(): Promise<FocusRuleItem[]> {
  await refreshExpiredFocusRules();
  const rows = await prisma.focusRule.findMany({ where: { status: "active" } });
  return rows.map(mapRule).filter((r) => r.isEffective);
}

export async function exportFocusPolicyMarkdown(): Promise<string> {
  const rules = await prisma.focusRule.findMany({ orderBy: { focusId: "asc" } });
  const header = `# CortexOps Focus Policy (exported)

Generated from workbench FocusRule table. Edit in UI or sync back to docs/focus-policy.md.

`;
  const body = rules
    .map((r) => {
      const parsed: ParsedFocusRule = {
        focus_id: r.focusId,
        name: r.name,
        description: r.description,
        status: r.status,
        priority_boost: r.priorityBoost,
        source_types: parseJsonArray(r.sourceTypesJson),
        content_tags: parseJsonArray(r.contentTagsJson),
        candidate_pool_boost: parseJsonArray(r.candidatePoolBoostJson),
        applies_to: parseJsonArray(r.appliesToJson),
        start_date: r.startDate,
        end_date: r.endDate ?? undefined,
        review_cadence: r.reviewCadence ?? undefined,
        notes: r.notes ?? undefined
      };
      return `### ${r.name}\n\n\`\`\`yaml\n${serializeFocusRuleToYaml(parsed)}\n\`\`\``;
    })
    .join("\n\n");

  return header + body;
}
