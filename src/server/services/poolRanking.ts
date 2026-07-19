import { prisma } from "@/server/db";
import { parseSignalRaw } from "@/server/signalRaw";
import { getPoolAliases, normalizePoolName } from "@/shared/poolOptions";

export type RankedItem = {
  id: string;
  title: string;
  url: string;
  pool: string;
  priority: string | null;
  rankScore: number;
  decisionConfidence: number | null;
  practiceFit: string | null;
  sourceType: string | null;
  sourceTier: string | null;
  publishedAt: string | null;
  date: string | null;
  summary: string;
  contentType: ContentType;
};

export type ContentType = "github" | "paper" | "general";

export type PracticeCandidateInput = {
  contentType: ContentType;
  decisionConfidence: number;
  practiceFit: string | null;
  publishedAt: string | null;
  sourceType: string | null;
};

function inferContentType(url: string): ContentType {
  if (url.includes("github.com")) return "github";
  if (url.includes("arxiv.org")) return "paper";
  return "general";
}

const PRACTICE_FIT_MAP: Record<string, number> = {
  high: 1.0,
  medium: 0.6,
  low: 0.2
};

const PRIORITY_SCORE_MAP: Record<string, number> = {
  P0: 1.0,
  P1: 0.8,
  P2: 0.55,
  P3: 0.3
};

function mapPracticeFit(pf: string | null): number {
  if (!pf) return 0.2;
  return PRACTICE_FIT_MAP[pf.toLowerCase()] ?? 0.2;
}

function mapPriority(priority: string | null): number {
  if (!priority) return 0.35;
  return PRIORITY_SCORE_MAP[priority.toUpperCase()] ?? 0.35;
}

function computeFreshness(publishedAt: string | null): number {
  if (!publishedAt) return 0;
  const pubDate = new Date(publishedAt);
  if (isNaN(pubDate.getTime())) return 0;
  const now = new Date();
  const daysOld = Math.max(0, (now.getTime() - pubDate.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, 1 - daysOld / 14);
}

function computeRankScore(
  pool: string,
  contentType: ContentType,
  decisionConfidence: number,
  priority: string | null,
  practiceFit: string | null,
  publishedAt: string | null
): number {
  const freshness = computeFreshness(publishedAt);
  const dc = decisionConfidence;
  const pf = mapPracticeFit(practiceFit);
  const priorityScore = mapPriority(priority);
  const contentBonus = contentType === "github" ? 0.08 : contentType === "paper" ? 0.04 : 0;

  switch (pool) {
    case "product":
      return 0.45 * pf + 0.20 * priorityScore + 0.20 * dc + 0.10 * freshness + contentBonus;

    case "paper":
      return 0.35 * pf + 0.25 * priorityScore + 0.20 * dc + 0.20 * freshness + contentBonus;

    case "engineering":
      return 0.50 * pf + 0.20 * priorityScore + 0.15 * dc + 0.10 * freshness + contentBonus;

    default:
      return 0.40 * pf + 0.25 * priorityScore + 0.15 * dc + 0.20 * freshness + contentBonus;
  }
}

const PRACTICE_SOURCE_TYPES = new Set(["github_repo", "tool", "release", "personal_blog"]);

export function isEngineeringPracticeCandidate(input: {
  contentType: ContentType;
  practiceFit: string | null;
  sourceType: string | null;
}): boolean {
  const fit = input.practiceFit?.toLowerCase();
  if (fit !== "high" && fit !== "medium") return false;
  if (input.contentType === "paper") return false;
  if (input.contentType === "github") return true;
  return input.sourceType ? PRACTICE_SOURCE_TYPES.has(input.sourceType) : false;
}

export function scoreEngineeringPracticeCandidate(input: PracticeCandidateInput): number {
  const freshness = computeFreshness(input.publishedAt);
  const pf = mapPracticeFit(input.practiceFit);
  const sourceBoost = input.contentType === "github" ? 1 : 0.7;
  return 0.5 * pf + 0.25 * input.decisionConfidence + 0.15 * freshness + 0.1 * sourceBoost;
}

export async function rankPoolItems(poolName: string, limit?: number): Promise<RankedItem[]> {
  const normalizedPool = normalizePoolName(poolName) ?? poolName;
  const aliases = getPoolAliases(poolName);
  if (aliases.length === 0) return [];

  const candidates = await prisma.candidate.findMany({
    where: { OR: [{ poolName: { in: aliases } }, { finalPool: { in: aliases } }] },
    orderBy: [{ date: "desc" }, { priority: "asc" }]
  });
  const confidenceMap = await buildDecisionConfidenceMap(candidates);

  const items: RankedItem[] = candidates.map((c) => {
    const url = c.originalUrl ?? c.sourceUrl ?? "";
    const contentType = inferContentType(url);
    const dc = confidenceMap.get(c.canonicalKey ?? "") ?? 0.5;
    const raw = parseSignalRaw(c.rawJson);
    const summary = raw.displaySummary ?? c.aihotSummary ?? c.reason ?? "";

    return {
      id: c.id,
      title: c.title ?? "(untitled)",
      url,
      pool: normalizedPool,
      priority: c.priority ?? null,
      rankScore: computeRankScore(normalizedPool, contentType, dc, c.priority, c.practiceFit, c.publishedAt),
      decisionConfidence: dc,
      practiceFit: c.practiceFit,
      sourceType: raw.sourceType ?? null,
      sourceTier: raw.sourceTier ?? null,
      publishedAt: c.publishedAt,
      date: c.date,
      summary,
      contentType
    };
  });

  items.sort((a, b) => b.rankScore - a.rankScore);
  return limit ? items.slice(0, limit) : items;
}

export async function rankAllPools(limitPerPool?: number): Promise<Record<string, RankedItem[]>> {
  const pools = ["product", "paper", "engineering"];
  const result: Record<string, RankedItem[]> = {};
  for (const pool of pools) {
    result[pool] = await rankPoolItems(pool, limitPerPool);
  }
  return result;
}

export async function rankEngineeringPracticeItems(limit = 3): Promise<RankedItem[]> {
  const items = await rankPoolItems("engineering");
  return items
    .filter((item) =>
      isEngineeringPracticeCandidate({
        contentType: item.contentType,
        practiceFit: item.practiceFit,
        sourceType: item.sourceType
      })
    )
    .map((item) => ({
      ...item,
      rankScore: scoreEngineeringPracticeCandidate({
        contentType: item.contentType,
        decisionConfidence: item.decisionConfidence ?? 0.5,
        practiceFit: item.practiceFit,
        publishedAt: item.publishedAt,
        sourceType: item.sourceType
      })
    }))
    .sort((a, b) => b.rankScore - a.rankScore)
    .slice(0, limit);
}

async function buildDecisionConfidenceMap(
  candidates: { canonicalKey: string | null }[]
): Promise<Map<string, number>> {
  const keys = [...new Set(candidates.map((c) => c.canonicalKey).filter((k): k is string => !!k))];
  if (keys.length === 0) return new Map();

  const signals = await prisma.signal.findMany({
    where: { canonicalKey: { in: keys } },
    select: { canonicalKey: true, decisionConfidence: true }
  });

  const map = new Map<string, number>();
  for (const s of signals) {
    if (s.canonicalKey && s.decisionConfidence !== null) {
      map.set(s.canonicalKey, s.decisionConfidence);
    }
  }
  return map;
}
