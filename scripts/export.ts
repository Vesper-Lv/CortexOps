import { readFile, writeFile } from "node:fs/promises";
import { DAILY_ACTIVE_DIR, listBySuffix } from "@/server/importers/importSources";
import {
  exportJsonlFiles,
  formatJsonlExportSummary
} from "@/server/exporters/jsonlExporter";
import {
  exportFocusPolicyToMarkdown,
  formatFocusPolicyPatchResult
} from "@/server/exporters/focusPolicyExporter";
import { prisma } from "@/server/db";

const FOCUS_POLICY_PATH = "docs/focus-policy.md";

function hasFlag(args: string[], flag: string): boolean {
  return args.includes(flag);
}

async function buildDailyExportFiles() {
  const dailyFiles = await listBySuffix(DAILY_ACTIVE_DIR, "-links.jsonl");
  return dailyFiles.map((path) => ({ path, scope: "daily" }));
}

async function buildPoolExportFiles() {
  const poolFiles = await listBySuffix("pools", ".jsonl");
  return poolFiles.map((path) => ({
    path,
    scope: path.replace(/^pools\//, "").replace(/\.jsonl$/, "")
  }));
}

async function runJsonlExport(args: string[]) {
  const dryRun = !hasFlag(args, "--write");
  const includePools = hasFlag(args, "--pools");

  const files = await buildDailyExportFiles();
  if (includePools) {
    files.push(...(await buildPoolExportFiles()));
  }

  const summary = await exportJsonlFiles(
    files,
    {
      readFile: (p) => readFile(p, "utf8"),
      writeFile: dryRun ? undefined : (p, content) => writeFile(p, content, "utf8")
    },
    { dryRun }
  );

  console.log(formatJsonlExportSummary(summary));
}

async function runFocusPolicyExport(args: string[]) {
  const dryRun = !hasFlag(args, "--write");
  const markdown = await readFile(FOCUS_POLICY_PATH, "utf8");

  const result = await exportFocusPolicyToMarkdown(markdown, {
    dryRun,
    writeFile: dryRun ? undefined : (content) => writeFile(FOCUS_POLICY_PATH, content, "utf8")
  });

  console.log(formatFocusPolicyPatchResult(result));
}

async function main() {
  const [command, ...rest] = process.argv.slice(2);
  const args = command?.startsWith("--") ? [command, ...rest] : rest;
  const cmd = command?.startsWith("--") ? "jsonl" : (command ?? "jsonl");

  switch (cmd) {
    case "jsonl":
      await runJsonlExport(args);
      break;
    case "focus-policy":
      await runFocusPolicyExport(args);
      break;
    default:
      console.error(`Unknown export command: ${cmd}`);
      console.error("Usage: npm run export [-- --write] [-- --pools]");
      console.error("       npm run export:focus-policy [-- --write]");
      process.exitCode = 1;
  }

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
