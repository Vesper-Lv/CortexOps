export type ThumbsDownReason = "direction" | "shallow" | "source_quality";

export const DEFAULT_WEIGHT = 0.5;
export const LEARNING_RATE = 0.2;
export const MIN_WEIGHT = 0;
export const MAX_WEIGHT = 1;
export const HISTORY_MIN_EVENTS = 5;

export const CONSOLIDATION_WINDOW_DAYS = 14;
export const REINFORCE_MIN_EVENTS = 2;
export const REINFORCE_BOOST = 0.05;
export const DECAY_FACTOR = 0.97;
export const PRUNE_WEIGHT_FLOOR = 0.05;
export const PRUNE_MIN_IDLE_DAYS = 30;

export function preferenceKey(
  contentTags: string[],
  sourceType: string | null
): {
  contentTags: string;
  sourceType: string;
} {
  const tags = [...contentTags]
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean)
    .sort();
  return {
    contentTags: tags.join("|"),
    sourceType: (sourceType ?? "").trim().toLowerCase()
  };
}

export function actualFromEvent(eventType: "thumbs_up" | "thumbs_down"): number {
  return eventType === "thumbs_up" ? 1 : 0;
}

/** Multiplier for content-tag weight updates. source_quality → 0 (skip). */
export function reasonScale(reason: ThumbsDownReason | null): number {
  if (reason === null) return 1; // thumbs_up
  if (reason === "direction") return 1;
  if (reason === "shallow") return 0.4;
  return 0; // source_quality
}

export function nextWeight(params: {
  currentWeight: number;
  predictedConfidence: number;
  eventType: "thumbs_up" | "thumbs_down";
  reason: ThumbsDownReason | null;
}): number | null {
  const scale = reasonScale(params.reason);
  if (scale === 0) return null;
  const actual = actualFromEvent(params.eventType);
  const error = actual - params.predictedConfidence;
  const updated = params.currentWeight + LEARNING_RATE * scale * error;
  return Math.min(MAX_WEIGHT, Math.max(MIN_WEIGHT, updated));
}

export function historyFromWeight(weight: number | null, eventCount: number): number | null {
  if (weight === null || eventCount < HISTORY_MIN_EVENTS) return null;
  return weight;
}

export function clampWeight(weight: number): number {
  return Math.min(MAX_WEIGHT, Math.max(MIN_WEIGHT, weight));
}
