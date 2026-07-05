import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/server/db";
import { parseAutomationToml } from "@/server/importers/automationTomlParser";
import {
  AUTOMATION_REGISTRY,
  promptPathForSlug,
  type AutomationRegistryEntry
} from "@/shared/automationRegistry";

export function hashPromptBody(body: string): string {
  return createHash("sha256").update(body, "utf8").digest("hex");
}

function stripFrontmatter(markdown: string): string {
  if (!markdown.startsWith("---\n")) return markdown;
  const end = markdown.indexOf("\n---\n", 4);
  if (end === -1) return markdown;
  return markdown.slice(end + 5);
}

export function buildPromptMarkdown(
  entry: AutomationRegistryEntry,
  automationId: string,
  promptBody: string
): string {
  const frontmatter = [
    "---",
    `automation_id: ${automationId}`,
    `kind: ${entry.kind}`,
    `source_toml: ${entry.tomlPath}`,
    "---",
    ""
  ].join("\n");
  return frontmatter + promptBody.trim() + "\n";
}

export async function extractPromptFileFromToml(
  entry: AutomationRegistryEntry,
  deps: { readFile: (p: string) => Promise<string>; writeFile: (p: string, c: string) => Promise<void> }
): Promise<string> {
  const tomlContent = await deps.readFile(entry.tomlPath);
  const parsed = parseAutomationToml(tomlContent);
  const markdown = buildPromptMarkdown(entry, parsed.id, parsed.prompt);
  const outPath = promptPathForSlug(entry.slug);
  await mkdir(path.dirname(outPath), { recursive: true });
  await deps.writeFile(outPath, markdown);
  return outPath;
}

export async function syncPromptTemplates(deps: {
  readFile: (p: string) => Promise<string>;
  extractMissing?: boolean;
}): Promise<{ synced: number; extracted: number }> {
  let synced = 0;
  let extracted = 0;

  for (const entry of AUTOMATION_REGISTRY) {
    const sourcePath = promptPathForSlug(entry.slug);
    let markdown: string;

    try {
      markdown = await deps.readFile(sourcePath);
    } catch {
      if (!deps.extractMissing) {
        throw new Error(`prompt file missing: ${sourcePath} (run with extract)`);
      }
      await extractPromptFileFromToml(entry, {
        readFile: deps.readFile,
        writeFile: (p, c) => writeFile(p, c, "utf8")
      });
      extracted += 1;
      markdown = await readFile(sourcePath, "utf8");
    }

    const tomlContent = await deps.readFile(entry.tomlPath);
    const parsed = parseAutomationToml(tomlContent);
    const body = stripFrontmatter(markdown);
    const contentHash = hashPromptBody(body);

    await prisma.promptTemplate.upsert({
      where: { automationId: parsed.id },
      create: {
        slug: entry.slug,
        automationId: parsed.id,
        name: parsed.name,
        kind: entry.kind,
        sourcePath,
        contentHash,
        model: parsed.model ?? null,
        scheduleRrule: parsed.rrule ?? null,
        status: parsed.status === "ACTIVE" ? "active" : parsed.status.toLowerCase()
      },
      update: {
        slug: entry.slug,
        name: parsed.name,
        kind: entry.kind,
        sourcePath,
        contentHash,
        model: parsed.model ?? null,
        scheduleRrule: parsed.rrule ?? null,
        status: parsed.status === "ACTIVE" ? "active" : parsed.status.toLowerCase()
      }
    });

    synced += 1;
  }

  return { synced, extracted };
}

export type PromptTemplateItem = {
  id: string;
  slug: string;
  automationId: string;
  name: string;
  kind: string;
  sourcePath: string;
  contentHash: string;
  model: string | null;
  scheduleRrule: string | null;
  status: string;
};

export async function listPromptTemplates(): Promise<PromptTemplateItem[]> {
  return prisma.promptTemplate.findMany({ orderBy: { kind: "asc" } });
}

export async function getPromptTemplateByAutomationId(
  automationId: string
): Promise<PromptTemplateItem | null> {
  return prisma.promptTemplate.findUnique({ where: { automationId } });
}
