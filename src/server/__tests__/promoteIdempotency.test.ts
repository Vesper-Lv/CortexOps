import { afterEach, describe, expect, it } from "vitest";
import { prisma } from "@/server/db";
import { promoteCandidateToTask } from "@/server/services/tasks";
import { promoteCandidateToArtifact } from "@/server/services/artifacts";

describe("promote idempotency", () => {
  const createdCandidateIds: string[] = [];
  const createdTaskIds: string[] = [];
  const createdArtifactIds: string[] = [];

  afterEach(async () => {
    for (const id of createdArtifactIds.splice(0)) {
      await prisma.artifact.deleteMany({ where: { id } });
    }
    for (const id of createdTaskIds.splice(0)) {
      await prisma.task.deleteMany({ where: { id } });
    }
    for (const id of createdCandidateIds.splice(0)) {
      await prisma.candidate.deleteMany({ where: { id } });
    }
  });

  it("returns same task id on repeated candidate promote", async () => {
    const candidate = await prisma.candidate.create({
      data: {
        recordKey: `test:promote-task-${Date.now()}`,
        poolName: "knowledge-gap",
        title: "Test candidate",
        humanStatus: "confirmed",
        status: "confirmed",
        finalPool: "knowledge_gap",
        rawJson: "{}",
        sourceFile: "test.jsonl",
        sourceLine: 1,
        importRunId: (
          await prisma.importRun.create({
            data: { status: "success" }
          })
        ).id
      }
    });
    createdCandidateIds.push(candidate.id);

    const first = await promoteCandidateToTask(candidate.id);
    const second = await promoteCandidateToTask(candidate.id);
    createdTaskIds.push(first);

    expect(second).toBe(first);
    expect(await prisma.task.count({ where: { linkedCandidateId: candidate.id } })).toBe(1);
  });

  it("returns same artifact id on repeated candidate promote", async () => {
    const candidate = await prisma.candidate.create({
      data: {
        recordKey: `test:promote-artifact-${Date.now()}`,
        poolName: "knowledge-gap",
        title: "Test artifact candidate",
        humanStatus: "confirmed",
        status: "confirmed",
        finalPool: "knowledge_gap",
        rawJson: "{}",
        sourceFile: "test.jsonl",
        sourceLine: 1,
        importRunId: (
          await prisma.importRun.create({
            data: { status: "success" }
          })
        ).id
      }
    });
    createdCandidateIds.push(candidate.id);

    const first = await promoteCandidateToArtifact(candidate.id);
    const second = await promoteCandidateToArtifact(candidate.id);
    createdArtifactIds.push(first);

    expect(second).toBe(first);
    expect(await prisma.artifact.count({ where: { linkedCandidateId: candidate.id } })).toBe(1);
  });
});
