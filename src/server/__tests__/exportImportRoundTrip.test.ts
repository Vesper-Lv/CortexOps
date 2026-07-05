import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { prisma } from "@/server/db";
import { exportJsonlFiles } from "@/server/exporters/jsonlExporter";
import { prismaSignalRepository } from "@/server/importers/prismaSignalRepository";
import { runImport } from "@/server/importers/runImport";

describe("export ↔ import round trip", () => {
  let suffix = "";
  let recordKey = "";
  let externalId = "";
  let tmpDir = "";
  let jsonlPath = "";
  let importRunId = "";
  let signalId = "";

  afterEach(async () => {
    if (signalId) {
      await prisma.signal.deleteMany({ where: { id: signalId } });
      signalId = "";
    }
    if (importRunId) {
      await prisma.importRun.deleteMany({ where: { id: importRunId } });
      importRunId = "";
    }
    if (tmpDir) {
      await rm(tmpDir, { recursive: true, force: true });
      tmpDir = "";
    }
  });

  async function setupCase() {
    suffix = String(Date.now());
    externalId = `e2e-${suffix}`;
    recordKey = `daily:${externalId}`;
    tmpDir = await mkdtemp(path.join(tmpdir(), "cortexops-e2e-"));
    jsonlPath = path.join(tmpDir, "links.jsonl");
  }

  async function seedTriagedSignal() {
    const run = await prisma.importRun.create({ data: { status: "success" } });
    importRunId = run.id;

    const signal = await prisma.signal.create({
      data: {
        recordKey,
        stream: "daily",
        externalId,
        date: "2026-07-04",
        title: "E2E signal",
        humanStatus: "confirmed",
        finalPool: "demo_replication",
        status: "confirmed",
        readingPackStatus: "selected",
        rawJson: JSON.stringify({ id: externalId, human_status: "pending" }),
        sourceFile: jsonlPath,
        sourceLine: 1,
        importRunId: run.id
      }
    });
    signalId = signal.id;
    return signal;
  }

  it("re-import does not overwrite human-owned fields when JSONL is stale", async () => {
    await setupCase();

    await writeFile(
      jsonlPath,
      `${JSON.stringify({
        id: externalId,
        title: "E2E signal",
        human_status: "pending",
        final_pool: "knowledge_gap",
        status: "inbox",
        reading_pack_status: "candidate"
      })}\n`,
      "utf8"
    );

    await seedTriagedSignal();

    await runImport(
      {
        readFile: (p) => readFile(p, "utf8"),
        repo: prismaSignalRepository
      },
      [{ stream: "daily", files: [{ path: jsonlPath }] }]
    );

    const afterImport = await prisma.signal.findUnique({ where: { recordKey } });
    expect(afterImport?.humanStatus).toBe("confirmed");
    expect(afterImport?.finalPool).toBe("demo_replication");
    expect(afterImport?.status).toBe("confirmed");
    expect(afterImport?.readingPackStatus).toBe("selected");
    expect(afterImport?.title).toBe("E2E signal");
  });

  it("export writes human fields then re-import preserves them", async () => {
    await setupCase();

    await writeFile(
      jsonlPath,
      `${JSON.stringify({
        id: externalId,
        title: "Before export",
        human_status: "pending",
        final_pool: "knowledge_gap"
      })}\n`,
      "utf8"
    );

    await seedTriagedSignal();

    await exportJsonlFiles(
      [{ path: jsonlPath, scope: "daily" }],
      {
        readFile: (p) => readFile(p, "utf8"),
        writeFile: (p, content) => writeFile(p, content, "utf8")
      },
      { dryRun: false }
    );

    const exported = JSON.parse((await readFile(jsonlPath, "utf8")).trim()) as Record<string, unknown>;
    expect(exported.human_status).toBe("confirmed");
    expect(exported.final_pool).toBe("demo_replication");
    expect(exported.status).toBe("confirmed");
    expect(exported.reading_pack_status).toBe("selected");

    await writeFile(
      jsonlPath,
      `${JSON.stringify({
        id: externalId,
        title: "After automation refresh",
        human_status: "pending",
        final_pool: "knowledge_gap",
        status: "inbox",
        reading_pack_status: "candidate"
      })}\n`,
      "utf8"
    );

    await runImport(
      {
        readFile: (p) => readFile(p, "utf8"),
        repo: prismaSignalRepository
      },
      [{ stream: "daily", files: [{ path: jsonlPath }] }]
    );

    const afterReimport = await prisma.signal.findUnique({ where: { recordKey } });
    expect(afterReimport?.humanStatus).toBe("confirmed");
    expect(afterReimport?.finalPool).toBe("demo_replication");
    expect(afterReimport?.status).toBe("confirmed");
    expect(afterReimport?.readingPackStatus).toBe("selected");
    expect(afterReimport?.title).toBe("After automation refresh");
  });
});
