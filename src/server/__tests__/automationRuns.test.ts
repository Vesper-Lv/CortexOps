import { readFile } from "node:fs/promises";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { registerAutomationRun, detectAutomationRunsFromImport } from "@/server/services/automationRuns";
import { syncPromptTemplates } from "@/server/services/promptTemplates";
import { getOrCreatePolicySnapshot } from "@/server/services/policySnapshotStore";
import { prisma } from "@/server/db";

describe("registerAutomationRun", () => {
  const runIds: string[] = [];
  const jobIds: string[] = [];
  let policySnapshotId = "";

  beforeEach(async () => {
    await syncPromptTemplates({
      readFile: (p) => readFile(p, "utf8"),
      extractMissing: true
    });
    policySnapshotId = (await getOrCreatePolicySnapshot({ readFile: (p) => readFile(p, "utf8") })).id;
  });

  afterEach(async () => {
    for (const runId of runIds.splice(0)) {
      await prisma.automationRun.deleteMany({ where: { id: runId } });
    }
    for (const jobId of jobIds.splice(0)) {
      await prisma.job.deleteMany({ where: { id: jobId } });
    }
  });

  it("creates a manual run linked to prompt template and policy snapshot", async () => {
    const result = await registerAutomationRun({
      automationId: "ai-pm",
      trigger: "manual",
      policySnapshotId,
      outputFiles: ["state/daily/test-manual-run-links.jsonl"]
    });
    runIds.push(result.id);
    expect(result.created).toBe(true);

    const run = await prisma.automationRun.findUnique({
      where: { id: result.id },
      include: { promptTemplate: true, policySnapshot: true }
    });
    expect(run?.automationId).toBe("ai-pm");
    expect(run?.promptTemplate?.slug).toBe("daily-ai-pm");
    expect(run?.policySnapshotId).toBe(policySnapshotId);
    expect(run?.trigger).toBe("manual");

    const job = await prisma.job.findFirst({
      where: { type: "automation_register", payload: { contains: result.id } }
    });
    if (job) jobIds.push(job.id);
    expect(job?.status).toBe("completed");
  });

  it("dedupes identical output files within 24h", async () => {
    const outputs = ["state/daily/test-dedupe-links.jsonl"];
    const first = await registerAutomationRun({
      automationId: "ai-pm",
      trigger: "manual",
      policySnapshotId,
      outputFiles: outputs
    });
    runIds.push(first.id);

    const second = await registerAutomationRun({
      automationId: "ai-pm",
      trigger: "manual",
      policySnapshotId,
      outputFiles: outputs
    });

    expect(second.created).toBe(false);
    expect(second.id).toBe(first.id);
  });
});

describe("detectAutomationRunsFromImport", () => {
  const runIds: string[] = [];

  beforeEach(async () => {
    await syncPromptTemplates({
      readFile: (p) => readFile(p, "utf8"),
      extractMissing: true
    });
  });

  afterEach(async () => {
    for (const runId of runIds.splice(0)) {
      await prisma.automationRun.deleteMany({ where: { id: runId } });
    }
  });

  it("registers daily automation when daily link files are present", async () => {
    const policySnapshotId = (await getOrCreatePolicySnapshot({ readFile: (p) => readFile(p, "utf8") })).id;
    const outputFile = "state/daily/test-import-detect-links.jsonl";
    const registered = await detectAutomationRunsFromImport({
      policySnapshotId,
      dailyLinkFiles: [outputFile],
      weeklyFiles: [],
      monthlyFiles: [],
      archiveReportTypes: []
    });
    expect(registered).toBe(1);

    const runs = await prisma.automationRun.findMany({
      where: { automationId: "ai-pm", trigger: "import_detected", outputFilesJson: { contains: outputFile } },
      orderBy: { createdAt: "desc" },
      take: 1
    });
    if (runs[0]) runIds.push(runs[0].id);
    expect(runs[0]?.notes).toContain("daily links");
  });

  it("does not duplicate when the same import context is processed twice", async () => {
    const policySnapshotId = (await getOrCreatePolicySnapshot({ readFile: (p) => readFile(p, "utf8") })).id;
    const outputFile = "state/daily/test-import-dedupe-links.jsonl";
    const ctx = {
      policySnapshotId,
      dailyLinkFiles: [outputFile],
      weeklyFiles: [],
      monthlyFiles: [],
      archiveReportTypes: [] as string[]
    };
    const first = await detectAutomationRunsFromImport(ctx);
    const second = await detectAutomationRunsFromImport(ctx);
    expect(first).toBe(1);
    expect(second).toBe(0);

    const runs = await prisma.automationRun.findMany({
      where: { automationId: "ai-pm", outputFilesJson: { contains: outputFile } }
    });
    for (const run of runs) runIds.push(run.id);
    expect(runs).toHaveLength(1);
  });
});
