import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { runImport, type ImportSource } from "@/server/importers/runImport";
import { prismaSignalRepository } from "@/server/importers/prismaSignalRepository";

async function listBySuffix(dir: string, suffix: string): Promise<string[]> {
  try {
    const entries = await readdir(dir);
    return entries.filter((f) => f.endsWith(suffix)).map((f) => path.join(dir, f)).sort();
  } catch {
    return [];
  }
}

export async function POST() {
  const dailyFiles = await listBySuffix("state/daily", "-links.jsonl");
  const poolFiles = await listBySuffix("pools", ".jsonl");
  const sources: ImportSource[] = [
    { stream: "daily", files: dailyFiles.map((p) => ({ path: p })) },
    { stream: "memory", files: [{ path: "state/memory/ai-pm-7d.jsonl" }] },
    { stream: "pool", files: poolFiles.map((p) => ({ path: p, poolName: path.basename(p, ".jsonl") })) }
  ];

  const summary = await runImport(
    { readFile: (p) => readFile(p, "utf8"), repo: prismaSignalRepository },
    sources
  );
  return NextResponse.json(summary);
}
