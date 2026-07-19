import type { ParsedLine } from "@/server/importers/jsonlParser";
import { normalizePoolName } from "@/shared/poolOptions";

export type MappedCommon = {
  externalId: string | null;
  canonicalKey: string | null;
  date: string | null;
  title: string | null;
  sourceName: string | null;
  sourceUrl: string | null;
  originalUrl: string | null;
  priority: string | null;
  suggestedPool: string | null;
  finalPool: string | null;
  humanStatus: string | null;
  status: string | null;
  readingPackStatus: string | null;
  duplicateStatus: string | null;
  practiceFit: string | null;
  category: string | null;
  publishedAt: string | null;
  reason: string | null;
  aihotSummary: string | null;
  codexSummary: string | null;
  rawJson: string;
  sourceFile: string;
  sourceLine: number;
};

export type SignalInput = MappedCommon & { recordKey: string; stream: string };
export type CandidateInput = MappedCommon & { recordKey: string; poolName: string };

const s = (v: unknown): string | null => (typeof v === "string" ? v : null);

function normalizeImportedPool(pool: string | null): string | null {
  return pool ? normalizePoolName(pool) : null;
}

export function computeRecordKey(args: {
  scope: string; // stream（Signal）或 poolName（Candidate）
  externalId: string | null;
  canonicalKey: string | null;
  sourceFile: string;
  sourceLine: number;
}): string {
  // 注意：无 id 且无 canonical_key 时退回 sourceFile#line。此 key 依赖行位置，
  // 若该文件后续在上方插入行会导致 key 漂移、重入产生重复行。当前数据无此类记录。
  const id = args.externalId ?? args.canonicalKey ?? `${args.sourceFile}#${args.sourceLine}`;
  return `${args.scope}:${id}`;
}

export function mapCommon(parsed: ParsedLine, sourceFile: string): MappedCommon {
  const v = parsed.value;
  return {
    externalId: s(v.id),
    canonicalKey: s(v.canonical_key),
    date: s(v.date),
    title: s(v.title),
    sourceName: s(v.source_name),
    sourceUrl: s(v.source_url),
    originalUrl: s(v.original_url),
    priority: s(v.priority),
    suggestedPool: normalizeImportedPool(s(v.suggested_pool)),
    finalPool: normalizeImportedPool(s(v.final_pool)),
    humanStatus: s(v.human_status),
    status: s(v.status),
    readingPackStatus: s(v.reading_pack_status),
    duplicateStatus: s(v.duplicate_status),
    practiceFit: s(v.practice_fit),
    category: s(v.category),
    publishedAt: s(v.published_at),
    reason: s(v.reason),
    aihotSummary: s(v.aihot_summary),
    codexSummary: s(v.codex_summary),
    rawJson: parsed.raw,
    sourceFile,
    sourceLine: parsed.line
  };
}

export function mapToSignal(parsed: ParsedLine, ctx: { stream: string; sourceFile: string }): SignalInput {
  const common = mapCommon(parsed, ctx.sourceFile);
  return {
    recordKey: computeRecordKey({
      scope: ctx.stream,
      externalId: common.externalId,
      canonicalKey: common.canonicalKey,
      sourceFile: ctx.sourceFile,
      sourceLine: parsed.line
    }),
    stream: ctx.stream,
    ...common
  };
}

export function mapToCandidate(parsed: ParsedLine, ctx: { poolName: string; sourceFile: string }): CandidateInput {
  const common = mapCommon(parsed, ctx.sourceFile);
  return {
    recordKey: computeRecordKey({
      scope: ctx.poolName,
      externalId: common.externalId,
      canonicalKey: common.canonicalKey,
      sourceFile: ctx.sourceFile,
      sourceLine: parsed.line
    }),
    poolName: normalizeImportedPool(ctx.poolName) ?? "archive",
    ...common
  };
}
