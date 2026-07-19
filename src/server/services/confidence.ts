import { prisma } from "@/server/db";
import { listEffectiveFocusRules } from "@/server/services/focusRules";
import { parseSignalRaw } from "@/server/signalRaw";
import { syncSignalToCandidate } from "@/server/services/candidateSync";
import { consolidatePreferenceWeights } from "@/server/services/behaviorLearning";
import { historyFromWeight, preferenceKey } from "@/shared/preferenceLearning";
import type { FocusRuleItem } from "@/shared/focusRules";

// Cross-mapping: confidence label x source_tier -> numeric value
const SOURCE_CONFIDENCE_MAP: Record<string, Record<string, number>> = {
  high: { "Tier 1": 0.95, "Tier 2": 0.85, "Tier 3": 0.75, "Tier 4": 0.65 },
  medium: { "Tier 1": 0.70, "Tier 2": 0.60, "Tier 3": 0.50, "Tier 4": 0.40 },
  low: { "Tier 1": 0.35, "Tier 2": 0.30, "Tier 3": 0.25, "Tier 4": 0.20 }
};

const DEFAULT_SOURCE_CONFIDENCE = 0.5;

export function mapSourceConfidence(
  confidence: string | null | undefined,
  sourceTier: string | null | undefined
): number {
  if (!confidence) return DEFAULT_SOURCE_CONFIDENCE;
  const tier = sourceTier ?? "Tier 3";
  const tierMap = SOURCE_CONFIDENCE_MAP[confidence.toLowerCase()];
  if (!tierMap) return DEFAULT_SOURCE_CONFIDENCE;
  return tierMap[tier] ?? tierMap["Tier 3"] ?? DEFAULT_SOURCE_CONFIDENCE;
}

export function computeFocusMatch(
  contentTags: string[],
  sourceType: string | null,
  focusRules: FocusRuleItem[]
): number {
  if (focusRules.length === 0) return 0;

  let anySourceMatch = false;
  let anyTagMatch = false;

  for (const rule of focusRules) {
    if (sourceType && rule.sourceTypes.includes(sourceType)) anySourceMatch = true;
    for (const tag of contentTags) {
      if (rule.contentTags.some((rt) => rt.toLowerCase() === tag.toLowerCase())) {
        anyTagMatch = true;
      }
    }
  }

  if (anySourceMatch && anyTagMatch) return 1.0;
  if (anySourceMatch || anyTagMatch) return 0.5;
  return 0;
}

async function computeHistoryMatch(
  contentTags: string[],
  sourceType: string | null
): Promise<number | null> {
  const key = preferenceKey(contentTags, sourceType);
  const row = await prisma.preferenceWeight.findUnique({
    where: {
      contentTags_sourceType: {
        contentTags: key.contentTags,
        sourceType: key.sourceType
      }
    },
    select: { weight: true, eventCount: true }
  });
  if (!row) return null;
  return historyFromWeight(row.weight, row.eventCount);
}

export type ConfidenceFactors = {
  source: number;
  focus: number;
  history: number | null;
};

export type ConfidenceResult = {
  score: number;
  factors: ConfidenceFactors;
};

export async function computeDecisionConfidence(params: {
  confidence: string | null;
  sourceTier: string | null;
  contentTags: string[];
  sourceType: string | null;
  focusRules?: FocusRuleItem[];
}): Promise<ConfidenceResult> {
  const source = mapSourceConfidence(params.confidence, params.sourceTier);

  const focusRules = params.focusRules ?? (await listEffectiveFocusRules());
  const focus = computeFocusMatch(params.contentTags, params.sourceType, focusRules);

  const history = await computeHistoryMatch(params.contentTags, params.sourceType);

  let score: number;
  if (history === null) {
    // Phase 1: history doesn't participate (insufficient data)
    score = 0.5 * source + 0.5 * focus;
  } else {
    // Phase 2: three-factor dynamic weights
    score = 0.35 * source + 0.3 * focus + 0.35 * history;
  }

  return { score, factors: { source, focus, history } };
}

export const AUTO_CONFIRM_THRESHOLD = 0.75;
export const REVOCABLE_THRESHOLD = 0.4;

export type RoutingDecision = "auto" | "revocable" | "intercept";

export function routeByConfidence(score: number): RoutingDecision {
  if (score >= AUTO_CONFIRM_THRESHOLD) return "auto";
  if (score >= REVOCABLE_THRESHOLD) return "revocable";
  return "intercept";
}

export type RouteResult = {
  routed: number;
  autoConfirmed: number;
  intercepted: number;
};

export async function routeSignalsByConfidence(importRunId: string): Promise<RouteResult> {
  const signals = await prisma.signal.findMany({
    where: { importRunId, decisionConfidence: null, stream: "daily" },
    select: { id: true, rawJson: true }
  });

  const focusRules = await listEffectiveFocusRules();
  let autoConfirmed = 0;
  let intercepted = 0;

  for (const signal of signals) {
    const raw = parseSignalRaw(signal.rawJson);
    const contentTags = raw.contentTags ?? [];
    const sourceType = raw.sourceType ?? null;
    const sourceTier = raw.sourceTier ?? null;
    const confidence = raw.confidence ?? null;

    const result = await computeDecisionConfidence({
      confidence,
      sourceTier,
      contentTags,
      sourceType,
      focusRules
    });

    const routing = routeByConfidence(result.score);
    const humanStatus = routing === "intercept" ? "pending" : "auto_confirmed";
    const readingPackStatus = routing === "intercept" ? "not_selected" : "selected";

    const factorsJson = JSON.stringify({
      source: result.factors.source,
      focus: result.factors.focus,
      history: result.factors.history
    });

    await prisma.$transaction([
      prisma.signal.update({
        where: { id: signal.id },
        data: {
          decisionConfidence: result.score,
          confidenceFactors: factorsJson,
          sourceTier: sourceTier,
          humanStatus,
          readingPackStatus,
          ...(routing !== "intercept" ? { status: "confirmed" } : {})
        }
      }),
      prisma.auditLog.create({
        data: {
          entityType: "signal",
          entityId: signal.id,
          action: routing === "intercept" ? "intercept" : "auto_confirm",
          fromValue: null,
          toValue: JSON.stringify({
            confidence: result.score,
            routing,
            factors: result.factors
          }),
          rationale: factorsJson
        }
      })
    ]);

    if (routing !== "intercept") {
      autoConfirmed += 1;
      await syncSignalToCandidate(signal.id);
    } else {
      intercepted += 1;
    }
  }

  await consolidatePreferenceWeights();

  return { routed: signals.length, autoConfirmed, intercepted };
}
