export type SignalRawFields = {
  displaySummary?: string;
  readReason?: string;
  focusDirection?: string;
  knownFacts?: string;
  openQuestions?: string;
  noveltyReason?: string;
  priorityRationale?: string;
  poolRationale?: string;
  contentTags?: string[];
  sourceType?: string;
  sourceTier?: string;
  confidence?: string;
};

const str = (v: unknown): string | undefined => (typeof v === "string" ? v : undefined);
const strArray = (v: unknown): string[] | undefined => {
  if (!Array.isArray(v)) return undefined;
  const values = v.filter((item): item is string => typeof item === "string");
  return values.length > 0 ? values : undefined;
};

export function parseSignalRaw(rawJson: string): SignalRawFields {
  let obj: Record<string, unknown>;
  try {
    obj = JSON.parse(rawJson) as Record<string, unknown>;
  } catch {
    return {};
  }
  return {
    displaySummary: str(obj.display_summary),
    readReason: str(obj.read_reason),
    focusDirection: str(obj.focus_direction),
    knownFacts: str(obj.known_facts),
    openQuestions: str(obj.open_questions),
    noveltyReason: str(obj.novelty_reason),
    priorityRationale: str(obj.priority_rationale),
    poolRationale: str(obj.pool_rationale),
    contentTags: strArray(obj.content_tags),
    sourceType: str(obj.source_type),
    sourceTier: str(obj.source_tier),
    confidence: str(obj.confidence)
  };
}

export function pickSummary(
  raw: SignalRawFields,
  aihotSummary: string | null,
  reason: string | null
): string {
  return raw.displaySummary ?? aihotSummary ?? reason ?? "";
}
