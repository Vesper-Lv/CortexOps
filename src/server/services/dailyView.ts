import { prisma } from "@/server/db";
import { parseSignalRaw, pickSummary } from "@/server/signalRaw";

export type SignalLike = {
  title: string | null;
  originalUrl: string | null;
  sourceUrl: string | null;
  priority: string | null;
  suggestedPool: string | null;
  finalPool: string | null;
  readingPackStatus: string | null;
  aihotSummary: string | null;
  reason: string | null;
  rawJson: string;
};

export type SignalView = {
  title: string;
  url: string;
  priority: string;
  pool: string;
  summary: string;
  readReason?: string;
  focusDirection?: string;
  knownFacts?: string;
  openQuestions?: string;
  isKnowledgeGap: boolean;
};

export type DailyReadingView = {
  readingPack: SignalView[];
  candidates: SignalView[];
  selectedCount: number;
  candidateCount: number;
  remainingCount: number;
};

function toView(s: SignalLike): SignalView {
  const raw = parseSignalRaw(s.rawJson);
  const pool = s.finalPool ?? s.suggestedPool ?? "";
  return {
    title: s.title ?? "(untitled)",
    url: s.originalUrl ?? s.sourceUrl ?? "",
    priority: s.priority ?? "",
    pool,
    summary: pickSummary(raw, s.aihotSummary, s.reason),
    readReason: raw.readReason,
    focusDirection: raw.focusDirection,
    knownFacts: raw.knownFacts,
    openQuestions: raw.openQuestions,
    isKnowledgeGap: pool === "knowledge_gap"
  };
}

export function buildReadingView(signals: SignalLike[]): DailyReadingView {
  const readingPack = signals.filter((s) => s.readingPackStatus === "selected").map(toView);
  const candidates = signals.filter((s) => s.readingPackStatus === "candidate").map(toView);
  const remainingCount = signals.filter((s) => s.readingPackStatus !== "selected").length;
  return {
    readingPack,
    candidates,
    selectedCount: readingPack.length,
    candidateCount: candidates.length,
    remainingCount
  };
}

export async function getLatestDailyDate(): Promise<string | null> {
  const row = await prisma.signal.findFirst({
    where: { stream: "daily" },
    orderBy: { date: "desc" },
    select: { date: true }
  });
  return row?.date ?? null;
}

export async function getDailyReadingView(date?: string): Promise<{ date: string; view: DailyReadingView } | null> {
  const targetDate = date ?? (await getLatestDailyDate());
  if (!targetDate) return null;
  const signals = await prisma.signal.findMany({
    where: { stream: "daily", date: targetDate },
    orderBy: [{ priority: "asc" }, { sourceLine: "asc" }]
  });
  return { date: targetDate, view: buildReadingView(signals) };
}
