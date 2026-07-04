import { prisma } from "@/server/db";
import { computeStatusOnFinalize } from "@/shared/signalStatus";

export async function syncSignalToCandidate(signalId: string): Promise<void> {
  const s = await prisma.signal.findUnique({ where: { id: signalId } });
  if (!s || s.humanStatus === "pending") return;

  const poolName = (s.finalPool ?? s.suggestedPool ?? "archive").replace(/_/g, "-");
  const recordKey = `signal-sync:${s.recordKey}`;
  const status = s.status ?? computeStatusOnFinalize(s.finalPool);

  await prisma.candidate.upsert({
    where: { recordKey },
    create: {
      recordKey,
      poolName,
      externalId: s.externalId,
      title: s.title,
      sourceUrl: s.sourceUrl,
      originalUrl: s.originalUrl,
      priority: s.priority,
      suggestedPool: s.suggestedPool,
      finalPool: s.finalPool,
      humanStatus: s.humanStatus,
      status,
      readingPackStatus: s.readingPackStatus,
      rawJson: s.rawJson,
      sourceFile: s.sourceFile,
      sourceLine: s.sourceLine,
      importRunId: s.importRunId
    },
    update: {
      poolName,
      title: s.title,
      priority: s.priority,
      finalPool: s.finalPool,
      humanStatus: s.humanStatus,
      status,
      readingPackStatus: s.readingPackStatus
    }
  });
}
