import { readFile } from "node:fs/promises";
import { syncPromptTemplates } from "@/server/services/promptTemplates";
import { prisma } from "@/server/db";

async function main() {
  const result = await syncPromptTemplates({
    readFile: (p) => readFile(p, "utf8"),
    extractMissing: true
  });

  console.log(`prompts sync: ${result.synced} templates synced, ${result.extracted} extracted from TOML`);
  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
