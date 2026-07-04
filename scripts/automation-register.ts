import { readFile } from "node:fs/promises";
import { registerAutomationRun } from "@/server/services/automationRuns";
import { getOrCreatePolicySnapshot } from "@/server/services/policySnapshotStore";
import { prisma } from "@/server/db";

function parseArgs(argv: string[]): { automationId: string; outputs: string[] } {
  let automationId = "";
  const outputs: string[] = [];

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--id" && argv[i + 1]) {
      automationId = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg === "--outputs" && argv[i + 1]) {
      outputs.push(...argv[i + 1].split(",").map((s) => s.trim()).filter(Boolean));
      i += 1;
    }
  }

  if (!automationId) {
    throw new Error("usage: npm run automation:register -- --id <automation-id> [--outputs file1,file2]");
  }

  return { automationId, outputs };
}

async function main() {
  const { automationId, outputs } = parseArgs(process.argv.slice(2));
  const { id: policySnapshotId } = await getOrCreatePolicySnapshot({
    readFile: (p) => readFile(p, "utf8")
  });

  const result = await registerAutomationRun({
    automationId,
    trigger: "manual",
    policySnapshotId,
    outputFiles: outputs.length > 0 ? outputs : undefined,
    notes: outputs.length > 0 ? "manual register via CLI" : "manual register (no outputs)"
  });

  console.log(
    result.created
      ? `registered automation run ${result.id} for ${automationId}`
      : `reused existing run ${result.id} for ${automationId} (deduped within 24h)`
  );

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
