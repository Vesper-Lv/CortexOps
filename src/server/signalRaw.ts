export type SignalRawFields = {
  displaySummary?: string;
  readReason?: string;
  focusDirection?: string;
  knownFacts?: string;
  openQuestions?: string;
  noveltyReason?: string;
};

const str = (v: unknown): string | undefined => (typeof v === "string" ? v : undefined);

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
    noveltyReason: str(obj.novelty_reason)
  };
}

export function pickSummary(
  raw: SignalRawFields,
  aihotSummary: string | null,
  reason: string | null
): string {
  return raw.displaySummary ?? aihotSummary ?? reason ?? "";
}
