import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { runImport, type ImportSource } from "@/server/importers/runImport";
import { prismaSignalRepository } from "@/server/importers/prismaSignalRepository";
import { prisma } from "@/server/db";

async function listBySuffix(dir: string, suffix: string): Promise<string[]> {
  try {
    const entries = await readdir(dir);
    return entries.filter((f) => f.endsWith(suffix)).map((f) => path.join(dir, f)).sort();
  } catch {
    return [];
  }
}

async function buildSources(): Promise<ImportSource[]> {
  const dailyFiles = await listBySuffix("state/daily", "-links.jsonl");
  const poolFiles = await listBySuffix("pools", ".jsonl");

  return [
    { stream: "daily", files: dailyFiles.map((p) => ({ path: p })) },
    { stream: "memory", files: [{ path: "state/memory/ai-pm-7d.jsonl" }] },
    {
      stream: "pool",
      files: poolFiles.map((p) => ({ path: p, poolName: path.basename(p, ".jsonl") }))
    }
  ];
}

async function main() {
  const sources = await buildSources();
  const summary = await runImport(
    { readFile: (p) => readFile(p, "utf8"), repo: prismaSignalRepository },
    sources
  );
  console.log("import summary:", summary);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
