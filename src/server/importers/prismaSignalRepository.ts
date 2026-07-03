import { prisma } from "@/server/db";
import type { ImportRunCounts, SignalRepository } from "@/server/importers/runImport";
import type { CandidateInput, SignalInput } from "@/server/importers/recordMapper";

export const prismaSignalRepository: SignalRepository = {
  async createImportRun() {
    const run = await prisma.importRun.create({ data: {} });
    return { id: run.id };
  },

  async upsertSignal(input: SignalInput & { importRunId: string }) {
    const { recordKey, ...rest } = input;
    await prisma.signal.upsert({
      where: { recordKey },
      create: { recordKey, ...rest },
      update: { ...rest }
    });
  },

  async upsertCandidate(input: CandidateInput & { importRunId: string }) {
    const { recordKey, ...rest } = input;
    await prisma.candidate.upsert({
      where: { recordKey },
      create: { recordKey, ...rest },
      update: { ...rest }
    });
  },

  async finishImportRun(id: string, counts: ImportRunCounts) {
    await prisma.importRun.update({
      where: { id },
      data: {
        finishedAt: new Date(),
        status: counts.status,
        filesScanned: counts.filesScanned,
        linesTotal: counts.linesTotal,
        importedSignals: counts.importedSignals,
        importedCandidates: counts.importedCandidates,
        skipped: counts.skipped,
        errors: counts.errors,
        notes: counts.notes
      }
    });
  }
};
