import { readFile } from "node:fs/promises";
import { runImport } from "@/server/importers/runImport";
import { buildDefaultSources } from "@/server/importers/importSources";
import { prismaSignalRepository } from "@/server/importers/prismaSignalRepository";
import { prisma } from "@/server/db";

async function main() {
  const sources = await buildDefaultSources();
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
