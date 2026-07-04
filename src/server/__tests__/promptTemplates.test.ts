import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { hashPromptBody, syncPromptTemplates } from "@/server/services/promptTemplates";
import { prisma } from "@/server/db";

describe("syncPromptTemplates", () => {
  it("extracts and upserts all six prompt templates", async () => {
    const result = await syncPromptTemplates({
      readFile: (p) => readFile(p, "utf8"),
      extractMissing: true
    });
    expect(result.synced).toBe(6);

    const templates = await prisma.promptTemplate.findMany();
    expect(templates).toHaveLength(6);
    expect(templates.map((t) => t.slug).sort()).toEqual([
      "daily-ai-pm",
      "demo-recommendation",
      "engineering-learning",
      "monthly-review",
      "paper-radar",
      "weekly-execution-review"
    ]);
  });

  it("updates contentHash when prompt body changes", async () => {
    await syncPromptTemplates({
      readFile: (p) => readFile(p, "utf8"),
      extractMissing: true
    });
    const before = await prisma.promptTemplate.findUnique({ where: { automationId: "ai-pm" } });
    expect(before).not.toBeNull();

    const mutatedHash = hashPromptBody("mutated prompt body");
    await prisma.promptTemplate.update({
      where: { automationId: "ai-pm" },
      data: { contentHash: mutatedHash, updatedAt: new Date("2020-01-01") }
    });

    await syncPromptTemplates({ readFile: (p) => readFile(p, "utf8") });
    const after = await prisma.promptTemplate.findUnique({ where: { automationId: "ai-pm" } });
    expect(after?.contentHash).not.toBe(mutatedHash);
    expect(after!.updatedAt.getTime()).toBeGreaterThan(new Date("2020-01-01").getTime());
  });
});
