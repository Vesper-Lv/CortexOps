export const FOCUS_RULE_STATUSES = ["active", "paused", "expired", "archived"] as const;

export type FocusRuleStatus = (typeof FOCUS_RULE_STATUSES)[number];

export const PRIORITY_BOOSTS = ["low", "medium", "high"] as const;

export type FocusRuleItem = {
  id: string;
  focusId: string;
  name: string;
  description: string;
  status: string;
  priorityBoost: string;
  sourceTypes: string[];
  contentTags: string[];
  candidatePoolBoost: string[];
  appliesTo: string[];
  startDate: string;
  endDate: string | null;
  reviewCadence: string | null;
  notes: string | null;
  isEffective: boolean;
};

export function parseJsonArray(json: string): string[] {
  try {
    const parsed = JSON.parse(json) as unknown;
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

export function isFocusRuleEffective(rule: {
  status: string;
  startDate: string;
  endDate: string | null;
}): boolean {
  if (rule.status !== "active") return false;
  const today = new Date().toISOString().slice(0, 10);
  if (rule.startDate > today) return false;
  if (rule.endDate && rule.endDate < today) return false;
  return true;
}

export function buildImpactPreview(rule: {
  name: string;
  sourceTypes: string[];
  candidatePoolBoost: string[];
  appliesTo: string[];
  priorityBoost: string;
}): string[] {
  const lines: string[] = [];
  if (rule.sourceTypes.length > 0) {
    lines.push(`Daily/weekly outputs will emphasize: ${rule.sourceTypes.slice(0, 4).join(", ")}${rule.sourceTypes.length > 4 ? "…" : ""}.`);
  }
  if (rule.candidatePoolBoost.length > 0) {
    lines.push(`Candidate pool routing will boost: ${rule.candidatePoolBoost.join(", ")}.`);
  }
  if (rule.appliesTo.length > 0) {
    lines.push(`Applies to automations: ${rule.appliesTo.join(", ")}.`);
  }
  lines.push(`Priority boost level: ${rule.priorityBoost}.`);
  lines.push("Low-confidence items still require manual review before pool promotion.");
  return lines;
}
