/**
 * Hard-delete Candidate rows that have been in the `drop` pool for > 90 days.
 *
 * Usage:
 *   npx tsx scripts/purge-dropped-pools.ts           # dry-run
 *   npx tsx scripts/purge-dropped-pools.ts --apply   # delete
 *
 * Optional launchd / cron (weekly):
 *   0 3 * * 0 cd /path/to/CortexOps-web-workbench && npx tsx scripts/purge-dropped-pools.ts --apply
 *
 * See docs/workbench-drop-purge.md
 */
import { prisma } from "@/server/db";

const DAYS = 90;
const APPLY = process.argv.includes("--apply");

async function main() {
  const cutoff = new Date(Date.now() - DAYS * 24 * 60 * 60 * 1000);

  const candidates = await prisma.candidate.findMany({
    where: {
      OR: [{ poolName: "drop" }, { finalPool: "drop" }, { status: "dropped" }],
      updatedAt: { lt: cutoff }
    },
    select: { id: true, title: true, poolName: true, finalPool: true, updatedAt: true }
  });

  console.log(
    `[purge-dropped-pools] cutoff=${cutoff.toISOString()} matches=${candidates.length} mode=${APPLY ? "apply" : "dry-run"}`
  );
  for (const c of candidates.slice(0, 20)) {
    console.log(`  - ${c.id}  ${c.updatedAt.toISOString()}  ${c.title ?? "(untitled)"}`);
  }
  if (candidates.length > 20) console.log(`  … and ${candidates.length - 20} more`);

  if (!APPLY) {
    console.log("Pass --apply to delete.");
    return;
  }

  const ids = candidates.map((c) => c.id);
  if (ids.length === 0) return;

  const result = await prisma.candidate.deleteMany({ where: { id: { in: ids } } });
  console.log(`[purge-dropped-pools] deleted=${result.count}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
