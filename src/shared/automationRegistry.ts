/** Maps repo automation TOML files to prompt slugs and logical kinds. */
export type AutomationKind =
  | "daily"
  | "weekly"
  | "monthly"
  | "paper_radar"
  | "demo"
  | "engineering_learning";

export type AutomationRegistryEntry = {
  tomlPath: string;
  slug: string;
  kind: AutomationKind;
  /** Expected archive reportType when imported via importArchiveReports */
  archiveReportType?: string;
};

export const AUTOMATION_REGISTRY: AutomationRegistryEntry[] = [
  {
    tomlPath: "automations/ai-pm.toml",
    slug: "daily-ai-pm",
    kind: "daily"
  },
  {
    tomlPath: "automations/weekly-execution-review.toml",
    slug: "weekly-execution-review",
    kind: "weekly",
    archiveReportType: "weekly"
  },
  {
    tomlPath: "automations/ai-paper-radar.toml",
    slug: "paper-radar",
    kind: "paper_radar",
    archiveReportType: "paper_radar"
  },
  {
    tomlPath: "automations/demo.toml",
    slug: "demo-recommendation",
    kind: "demo",
    archiveReportType: "demo_recommendation"
  },
  {
    tomlPath: "automations/engineering-learning.toml",
    slug: "engineering-learning",
    kind: "engineering_learning",
    archiveReportType: "engineering_learning"
  },
  {
    tomlPath: "automations/monthly-review.toml",
    slug: "monthly-review",
    kind: "monthly",
    archiveReportType: "monthly"
  }
];

export function promptPathForSlug(slug: string): string {
  return `prompts/${slug}.md`;
}

export function findRegistryByAutomationId(automationId: string): AutomationRegistryEntry | undefined {
  return AUTOMATION_REGISTRY.find((e) => e.tomlPath.includes(automationId));
}

export function findRegistryByTomlPath(tomlPath: string): AutomationRegistryEntry | undefined {
  return AUTOMATION_REGISTRY.find((e) => e.tomlPath === tomlPath);
}

export function findRegistryBySlug(slug: string): AutomationRegistryEntry | undefined {
  return AUTOMATION_REGISTRY.find((e) => e.slug === slug);
}
