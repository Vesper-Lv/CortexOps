import { parseJsonlContent } from "@/server/importers/jsonlParser";
import { computeRecordKey } from "@/server/importers/recordMapper";
import {
  dbHumanFieldsToJson,
  HUMAN_OWNED_JSONL_FIELDS,
  mergeHumanFieldsIntoObject,
  type DbHumanFields
} from "@/server/exporters/humanFields";
import { prisma } from "@/server/db";

export type JsonlExportLineChange = {
  line: number;
  recordKey: string | null;
  fields: Partial<Record<(typeof HUMAN_OWNED_JSONL_FIELDS)[number], { from: unknown; to: unknown }>>;
};

export type JsonlExportFileResult = {
  path: string;
  linesTotal: number;
  matched: number;
  changed: number;
  parseErrors: number;
  changes: JsonlExportLineChange[];
  output: string | null;
};

export type JsonlExportSummary = {
  dryRun: boolean;
  files: JsonlExportFileResult[];
  filesChanged: number;
  linesChanged: number;
};

type DbRecord = DbHumanFields & {
  recordKey: string;
  sourceFile: string;
  sourceLine: number;
};

export type DbLookups = {
  byLine: Map<string, DbRecord>;
  byRecordKey: Map<string, DbRecord>;
  byExternalId: Map<string, DbRecord>;
  byCanonicalKey: Map<string, DbRecord>;
};

function lineKey(sourceFile: string, sourceLine: number): string {
  return `${sourceFile}#${sourceLine}`;
}

function isTriaged(record: DbHumanFields): boolean {
  const human = record.humanStatus ?? "pending";
  return human === "confirmed" || human === "changed";
}

/** Signals win over pool candidates; signal-sync shadows never win over a Signal on the same line. */
export function registerByLine(
  byLine: Map<string, DbRecord>,
  row: DbRecord,
  kind: "signal" | "candidate"
): void {
  const key = lineKey(row.sourceFile, row.sourceLine);
  const existing = byLine.get(key);

  if (!existing) {
    byLine.set(key, row);
    return;
  }

  if (kind === "signal") {
    byLine.set(key, row);
    return;
  }

  if (existing.recordKey.startsWith("signal-sync:")) {
    byLine.set(key, row);
  }
}

function diffHumanFields(
  before: Record<string, unknown>,
  after: Record<string, unknown>
): JsonlExportLineChange["fields"] {
  const fields: JsonlExportLineChange["fields"] = {};
  for (const key of HUMAN_OWNED_JSONL_FIELDS) {
    if (before[key] !== after[key]) {
      fields[key] = { from: before[key], to: after[key] };
    }
  }
  return fields;
}

export type JsonlExportDeps = {
  readFile: (path: string) => Promise<string>;
  writeFile?: (path: string, content: string) => Promise<void>;
  loadRecords?: (sourceFiles: string[]) => Promise<DbLookups>;
};

const dbRecordSelect = {
  recordKey: true,
  sourceFile: true,
  sourceLine: true,
  humanStatus: true,
  finalPool: true,
  status: true,
  readingPackStatus: true,
  priority: true,
  externalId: true,
  canonicalKey: true
} as const;

async function defaultLoadDbRecords(sourceFiles: string[]): Promise<DbLookups> {
  const byLine = new Map<string, DbRecord>();
  const byRecordKey = new Map<string, DbRecord>();
  const byExternalId = new Map<string, DbRecord>();
  const byCanonicalKey = new Map<string, DbRecord>();

  const [allSignals, fileSignals, candidates] = await Promise.all([
    prisma.signal.findMany({ select: dbRecordSelect }),
    prisma.signal.findMany({
      where: { sourceFile: { in: sourceFiles } },
      select: dbRecordSelect
    }),
    prisma.candidate.findMany({
      where: { sourceFile: { in: sourceFiles } },
      select: dbRecordSelect
    })
  ]);

  for (const row of allSignals) {
    if (row.externalId) byExternalId.set(row.externalId, row);
    if (row.canonicalKey) byCanonicalKey.set(row.canonicalKey, row);
  }

  for (const row of candidates) {
    if (!row.recordKey.startsWith("signal-sync:")) {
      registerByLine(byLine, row, "candidate");
    }
    byRecordKey.set(row.recordKey, row);
  }

  for (const row of fileSignals) {
    registerByLine(byLine, row, "signal");
    byRecordKey.set(row.recordKey, row);
  }

  return { byLine, byRecordKey, byExternalId, byCanonicalKey };
}

export function resolveDbRecord(
  parsed: { line: number; value: Record<string, unknown> },
  sourceFile: string,
  scope: string,
  lookups: DbLookups,
  exportKind: "daily" | "pool"
): DbRecord | undefined {
  const externalId = typeof parsed.value.id === "string" ? parsed.value.id : null;
  const canonicalKey =
    typeof parsed.value.canonical_key === "string" ? parsed.value.canonical_key : null;

  if (exportKind === "pool") {
    const fromSignal =
      (externalId ? lookups.byExternalId.get(externalId) : undefined) ??
      (canonicalKey ? lookups.byCanonicalKey.get(canonicalKey) : undefined);
    if (fromSignal && isTriaged(fromSignal)) {
      return fromSignal;
    }
  }

  const lineHit = lookups.byLine.get(lineKey(sourceFile, parsed.line));
  if (lineHit) return lineHit;

  const recordKey = computeRecordKey({
    scope,
    externalId,
    canonicalKey,
    sourceFile,
    sourceLine: parsed.line
  });

  return lookups.byRecordKey.get(recordKey);
}

function exportKindForPath(path: string): "daily" | "pool" {
  return path.startsWith("pools/") ? "pool" : "daily";
}

export async function exportJsonlFiles(
  files: { path: string; scope: string }[],
  deps: JsonlExportDeps,
  options: { dryRun: boolean }
): Promise<JsonlExportSummary> {
  const paths = files.map((f) => f.path);
  const loadRecords = deps.loadRecords ?? defaultLoadDbRecords;
  const lookups = await loadRecords(paths);
  const results: JsonlExportFileResult[] = [];

  for (const file of files) {
    let content: string;
    try {
      content = await deps.readFile(file.path);
    } catch {
      results.push({
        path: file.path,
        linesTotal: 0,
        matched: 0,
        changed: 0,
        parseErrors: 0,
        changes: [],
        output: null
      });
      continue;
    }

    const { parsed, errors } = parseJsonlContent(content);
    const originalLines = content.split(/\r?\n/);
    const outputLines = [...originalLines];
    const changes: JsonlExportLineChange[] = [];
    let matched = 0;
    let changed = 0;
    const exportKind = exportKindForPath(file.path);

    for (const line of parsed) {
      const dbRecord = resolveDbRecord(line, file.path, file.scope, lookups, exportKind);
      if (!dbRecord) continue;

      matched += 1;
      const before = { ...line.value };
      const { merged, changed: lineChanged } = mergeHumanFieldsIntoObject(
        { ...line.value },
        dbRecord
      );

      if (!lineChanged) continue;

      changed += 1;
      changes.push({
        line: line.line,
        recordKey: dbRecord.recordKey,
        fields: diffHumanFields(before, merged)
      });

      outputLines[line.line - 1] = JSON.stringify(merged);
    }

    const fileChanged = changed > 0;
    const output = fileChanged ? outputLines.join("\n") : null;

    if (fileChanged && !options.dryRun && output !== null && deps.writeFile) {
      await deps.writeFile(file.path, output.endsWith("\n") ? output : `${output}\n`);
    }

    results.push({
      path: file.path,
      linesTotal: parsed.length,
      matched,
      changed,
      parseErrors: errors.length,
      changes,
      output
    });
  }

  return {
    dryRun: options.dryRun,
    files: results,
    filesChanged: results.filter((f) => f.changed > 0).length,
    linesChanged: results.reduce((n, f) => n + f.changed, 0)
  };
}

/** Pretty-print a dry-run summary for CLI output. */
export function formatJsonlExportSummary(summary: JsonlExportSummary): string {
  const parseErrors = summary.files.reduce((n, f) => n + f.parseErrors, 0);
  const lines: string[] = [
    summary.dryRun ? "export (dry-run)" : "export (write)",
    `files scanned: ${summary.files.length}`,
    `files with changes: ${summary.filesChanged}`,
    `lines changed: ${summary.linesChanged}`,
    `parse errors: ${parseErrors}`
  ];

  for (const file of summary.files) {
    if (file.changed === 0 && file.parseErrors === 0) continue;
    lines.push(`\n${file.path} (${file.changed}/${file.matched} matched lines changed)`);
    if (file.parseErrors > 0) {
      lines.push(`  parse errors: ${file.parseErrors} (file not partially rewritten)`);
    }
    for (const change of file.changes.slice(0, 20)) {
      const fieldSummary = Object.entries(change.fields)
        .map(([k, v]) => `${k}: ${JSON.stringify(v.from)} → ${JSON.stringify(v.to)}`)
        .join(", ");
      lines.push(`  line ${change.line}: ${fieldSummary}`);
    }
    if (file.changes.length > 20) {
      lines.push(`  …(+${file.changes.length - 20} more)`);
    }
  }

  if (summary.dryRun && summary.linesChanged > 0) {
    lines.push("\nRe-run with --write to apply changes.");
  }

  return lines.join("\n");
}

export { dbHumanFieldsToJson };
