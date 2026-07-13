import { parseJsonlContent } from "@/server/importers/jsonlParser";
import {
  mapToCandidate,
  mapToSignal,
  type CandidateInput,
  type SignalInput
} from "@/server/importers/recordMapper";

export type ImportRunCounts = {
  filesScanned: number;
  linesTotal: number;
  importedSignals: number;
  importedCandidates: number;
  skipped: number;
  errors: number;
  status: "success" | "partial" | "failed";
  notes: string | null;
};

const MAX_ERROR_NOTES = 50;

export type SignalRepository = {
  createImportRun(): Promise<{ id: string }>;
  upsertSignal(input: SignalInput & { importRunId: string }): Promise<void>;
  upsertCandidate(input: CandidateInput & { importRunId: string }): Promise<void>;
  finishImportRun(id: string, counts: ImportRunCounts): Promise<void>;
};

export type ImportDeps = {
  readFile: (path: string) => Promise<string>;
  repo: SignalRepository;
};

// stream === "pool" 的源写入 Candidate（file.poolName 必填）；其余写入 Signal。
export type ImportSource = {
  stream: string; // daily | memory | pool
  files: { path: string; poolName?: string }[];
};

export type ImportSummary = ImportRunCounts & { importRunId: string };

export async function runImport(deps: ImportDeps, sources: ImportSource[]): Promise<ImportSummary> {
  const { id: importRunId } = await deps.repo.createImportRun();

  let filesScanned = 0;
  let linesTotal = 0;
  let importedSignals = 0;
  let importedCandidates = 0;
  let errors = 0;
  const errorNotes: string[] = [];

  for (const source of sources) {
    for (const file of source.files) {
      filesScanned += 1;
      let content: string;
      try {
        content = await deps.readFile(file.path);
      } catch {
        errors += 1; // 缺失/不可读文件计为错误，但不中断
        errorNotes.push(`read failed: ${file.path}`);
        continue;
      }

      const { parsed, errors: parseErrors } = parseJsonlContent(content);
      linesTotal += parsed.length + parseErrors.length;
      errors += parseErrors.length;
      for (const pe of parseErrors) {
        errorNotes.push(`${file.path}#${pe.line}: ${pe.message}`);
      }

      for (const line of parsed) {
        if (source.stream === "pool") {
          const record = mapToCandidate(line, {
            poolName: file.poolName ?? file.path,
            sourceFile: file.path
          });
          await deps.repo.upsertCandidate({ ...record, importRunId });
          importedCandidates += 1;
        } else {
          const record = mapToSignal(line, { stream: source.stream, sourceFile: file.path });
          await deps.repo.upsertSignal({ ...record, importRunId });
          importedSignals += 1;
        }
      }
    }
  }

  const status: ImportRunCounts["status"] = errors > 0 ? "partial" : "success";
  const notes =
    errorNotes.length > 0
      ? errorNotes.slice(0, MAX_ERROR_NOTES).join("\n") +
        (errorNotes.length > MAX_ERROR_NOTES ? `\n…(+${errorNotes.length - MAX_ERROR_NOTES} more)` : "")
      : null;
  const counts: ImportRunCounts = {
    filesScanned,
    linesTotal,
    importedSignals,
    importedCandidates,
    skipped: 0,
    errors,
    status,
    notes
  };
  await deps.repo.finishImportRun(importRunId, counts);

  return { importRunId, ...counts };
}
