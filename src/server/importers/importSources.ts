import { readdir } from "node:fs/promises";
import path from "node:path";
import type { ImportSource } from "@/server/importers/runImport";

export async function listBySuffix(dir: string, suffix: string): Promise<string[]> {
  try {
    const entries = await readdir(dir);
    return entries.filter((f) => f.endsWith(suffix)).map((f) => path.join(dir, f)).sort();
  } catch {
    return [];
  }
}

export async function listDailyReportFiles(): Promise<string[]> {
  return listBySuffix("state/daily", "-report.md");
}

export async function listWeeklyReportFiles(): Promise<string[]> {
  return listBySuffix("state/weekly", ".md");
}

export async function listMonthlyReportFiles(): Promise<string[]> {
  return listBySuffix("state/monthly", ".md");
}

// 单一事实来源：CLI 与 API 路由都用它构建优先导入的文件列表，避免逻辑漂移。
export async function buildDefaultSources(): Promise<ImportSource[]> {
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
