import { prisma } from "@/server/db";
import { AUTOMATION_REGISTRY } from "@/shared/automationRegistry";
import { shortHash } from "@/server/services/policySnapshotStore";
import { getPromptTemplateByAutomationId } from "@/server/services/promptTemplates";

export type RegisterAutomationRunInput = {
  automationId: string;
  trigger: "manual" | "cron" | "import_detected";
  status?: "external" | "success" | "failed" | "partial";
  policySnapshotId?: string;
  outputFiles?: string[];
  inputFiles?: string[];
  notes?: string;
  startedAt?: Date;
  finishedAt?: Date;
};

const DEDUPE_WINDOW_MS = 24 * 60 * 60 * 1000;

export async function registerAutomationRun(
  input: RegisterAutomationRunInput
): Promise<{ id: string; created: boolean }> {
  const template = await getPromptTemplateByAutomationId(input.automationId);

  const outputFilesJson = input.outputFiles ? JSON.stringify(input.outputFiles) : null;

  if (outputFilesJson) {
    const since = new Date(Date.now() - DEDUPE_WINDOW_MS);
    const duplicate = await prisma.automationRun.findFirst({
      where: {
        automationId: input.automationId,
        outputFilesJson,
        createdAt: { gte: since }
      }
    });
    if (duplicate) return { id: duplicate.id, created: false };
  }

  const run = await prisma.automationRun.create({
    data: {
      automationId: input.automationId,
      promptTemplateId: template?.id ?? null,
      policySnapshotId: input.policySnapshotId ?? null,
      status: input.status ?? "external",
      trigger: input.trigger,
      model: template?.model ?? null,
      inputFilesJson: input.inputFiles ? JSON.stringify(input.inputFiles) : null,
      outputFilesJson,
      notes: input.notes ?? null,
      startedAt: input.startedAt ?? new Date(),
      finishedAt: input.finishedAt ?? new Date()
    }
  });

  await prisma.job.create({
    data: {
      type: "automation_register",
      status: "completed",
      payload: JSON.stringify({ automationRunId: run.id, automationId: input.automationId })
    }
  });

  return { id: run.id, created: true };
}

export type AutomationRegistryRow = {
  automationId: string;
  slug: string;
  name: string;
  kind: string;
  sourcePath: string;
  contentHash: string;
  model: string | null;
  scheduleRrule: string | null;
  status: string;
  lastRun: {
    id: string;
    status: string;
    trigger: string;
    createdAt: Date;
    policySnapshotKey: string | null;
    outputFiles: string[];
  } | null;
};

export async function listAutomationRegistry(): Promise<AutomationRegistryRow[]> {
  const templates = await prisma.promptTemplate.findMany({ orderBy: { name: "asc" } });
  const rows: AutomationRegistryRow[] = [];

  for (const t of templates) {
    const lastRun = await prisma.automationRun.findFirst({
      where: { automationId: t.automationId },
      orderBy: { createdAt: "desc" },
      include: { policySnapshot: true }
    });

    rows.push({
      automationId: t.automationId,
      slug: t.slug,
      name: t.name,
      kind: t.kind,
      sourcePath: t.sourcePath,
      contentHash: t.contentHash,
      model: t.model,
      scheduleRrule: t.scheduleRrule,
      status: t.status,
      lastRun: lastRun
        ? {
            id: lastRun.id,
            status: lastRun.status,
            trigger: lastRun.trigger,
            createdAt: lastRun.createdAt,
            policySnapshotKey: lastRun.policySnapshot?.snapshotKey ?? null,
            outputFiles: lastRun.outputFilesJson ? JSON.parse(lastRun.outputFilesJson) : []
          }
        : null
    });
  }

  return rows;
}

export async function getAutomationSummaryMetrics(): Promise<{
  templateCount: number;
  lastDailyRunAt: Date | null;
}> {
  const templateCount = await prisma.promptTemplate.count();
  const dailyTemplate = await prisma.promptTemplate.findFirst({ where: { kind: "daily" } });
  const lastDaily = dailyTemplate
    ? await prisma.automationRun.findFirst({
        where: { automationId: dailyTemplate.automationId },
        orderBy: { createdAt: "desc" }
      })
    : null;

  return {
    templateCount,
    lastDailyRunAt: lastDaily?.createdAt ?? null
  };
}

export type ImportDetectContext = {
  policySnapshotId: string;
  dailyLinkFiles: string[];
  weeklyFiles: string[];
  monthlyFiles: string[];
  archiveReportTypes: string[];
};

export async function detectAutomationRunsFromImport(ctx: ImportDetectContext): Promise<number> {
  let registered = 0;

  if (ctx.dailyLinkFiles.length > 0) {
    const daily = await getPromptTemplateByAutomationId("ai-pm");
    if (daily) {
      const result = await registerAutomationRun({
        automationId: daily.automationId,
        trigger: "import_detected",
        policySnapshotId: ctx.policySnapshotId,
        outputFiles: ctx.dailyLinkFiles,
        notes: "detected daily links import"
      });
      if (result.created) registered += 1;
    }
  }

  if (ctx.weeklyFiles.length > 0) {
    const weekly = await getPromptTemplateByAutomationId("ai-pm-2");
    if (weekly) {
      const result = await registerAutomationRun({
        automationId: weekly.automationId,
        trigger: "import_detected",
        policySnapshotId: ctx.policySnapshotId,
        outputFiles: ctx.weeklyFiles,
        notes: "detected weekly markdown import"
      });
      if (result.created) registered += 1;
    }
  }

  if (ctx.monthlyFiles.length > 0) {
    const monthly = await prisma.promptTemplate.findFirst({ where: { kind: "monthly" } });
    if (monthly) {
      const result = await registerAutomationRun({
        automationId: monthly.automationId,
        trigger: "import_detected",
        policySnapshotId: ctx.policySnapshotId,
        outputFiles: ctx.monthlyFiles,
        notes: "detected monthly markdown import"
      });
      if (result.created) registered += 1;
    }
  }

  for (const reportType of ctx.archiveReportTypes) {
    const entry = AUTOMATION_REGISTRY.find((e) => e.archiveReportType === reportType);
    if (!entry) continue;
    const template = await prisma.promptTemplate.findFirst({ where: { slug: entry.slug } });
    if (!template) continue;

    const already = ctx.weeklyFiles.length > 0 && reportType === "weekly";
    const alreadyMonthly = ctx.monthlyFiles.length > 0 && reportType === "monthly";
    if (already || alreadyMonthly) continue;

    const result = await registerAutomationRun({
      automationId: template.automationId,
      trigger: "import_detected",
      policySnapshotId: ctx.policySnapshotId,
      outputFiles: [],
      notes: `detected archive report import: ${reportType}`
    });
    if (result.created) registered += 1;
  }

  return registered;
}

export { shortHash };
