import { readFile } from "node:fs/promises";
import { prisma } from "@/server/db";
import { buildDefaultSources } from "@/server/importers/importSources";
import { prismaSignalRepository } from "@/server/importers/prismaSignalRepository";
import { runImport } from "@/server/importers/runImport";
import { reviewSignal } from "@/server/services/review";

async function main() {
  const signal = await prisma.signal.findFirst({ where: { stream: "daily" } });
  if (!signal) throw new Error("no daily signal");

  const id = signal.id;

  await reviewSignal(id, { type: "confirm" });
  await reviewSignal(id, { type: "toggle_reading_pack" });
  await reviewSignal(id, { type: "change_pool", pool: "demo_replication" });

  const afterReview = await prisma.signal.findUnique({ where: { id } });
  const auditCount = await prisma.auditLog.count({ where: { entityId: id } });

  const sources = await buildDefaultSources();
  await runImport({ readFile: (p) => readFile(p, "utf8"), repo: prismaSignalRepository }, sources);

  const afterReimport = await prisma.signal.findUnique({ where: { id } });

  const humanFieldsPreservedOnReimport =
    afterReimport?.humanStatus === afterReview?.humanStatus &&
    afterReimport?.finalPool === afterReview?.finalPool &&
    afterReimport?.readingPackStatus === afterReview?.readingPackStatus;

  const result = {
    signalId: id,
    recordKey: signal.recordKey,
    afterReview: {
      humanStatus: afterReview?.humanStatus,
      finalPool: afterReview?.finalPool,
      readingPackStatus: afterReview?.readingPackStatus
    },
    auditLogEntries: auditCount,
    afterReimport: {
      humanStatus: afterReimport?.humanStatus,
      finalPool: afterReimport?.finalPool,
      readingPackStatus: afterReimport?.readingPackStatus
    },
    humanFieldsPreservedOnReimport
  };

  console.log(JSON.stringify(result, null, 2));

  if (!humanFieldsPreservedOnReimport || auditCount < 3) {
    process.exit(1);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
