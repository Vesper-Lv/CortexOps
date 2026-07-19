import { prisma } from "@/server/db";
import { computeStatusOnFinalize } from "@/shared/signalStatus";
import { normalizePoolName } from "@/shared/poolOptions";

export async function syncSignalToCandidate(signalId: string): Promise<void> {
  const s = await prisma.signal.findUnique({ where: { id: signalId } });
  if (!s || s.humanStatus === "pending") return;

  const poolName = normalizePoolName(s.finalPool ?? s.suggestedPool ?? "archive") ?? "archive";
  const suggestedPool = normalizePoolName(s.suggestedPool);
  const finalPool = normalizePoolName(s.finalPool);
  const recordKey = `signal-sync:${s.recordKey}`;
  const status = s.status ?? computeStatusOnFinalize(finalPool);

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
      suggestedPool,
      finalPool,
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
      suggestedPool,
      finalPool,
      humanStatus: s.humanStatus,
      status,
      readingPackStatus: s.readingPackStatus
    }
  });
}
