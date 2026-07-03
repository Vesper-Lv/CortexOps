export const SIGNAL_STATUSES = [
  "inbox",
  "confirmed",
  "watching",
  "scheduled",
  "in_progress",
  "done",
  "archived",
  "dropped"
] as const;

export type SignalLifecycleStatus = (typeof SIGNAL_STATUSES)[number];

export function isValidSignalStatus(value: string): value is SignalLifecycleStatus {
  return (SIGNAL_STATUSES as readonly string[]).includes(value);
}

export function assertValidSignalStatus(value: string): asserts value is SignalLifecycleStatus {
  if (!isValidSignalStatus(value)) {
    throw new Error(`invalid signal status: ${value}`);
  }
}

/** Status written when a pending signal is finalized. */
export function computeStatusOnFinalize(finalPool: string | null): SignalLifecycleStatus {
  return finalPool === "drop" ? "dropped" : "confirmed";
}

export type DownstreamEligibilityInput = {
  humanStatus: string | null;
  status: string | null;
  finalPool: string | null;
};

/**
 * Whether weekly/monthly automations may consume this item.
 * Import-only `humanStatus=rejected` is treated like drop.
 */
export function isDownstreamEligible(input: DownstreamEligibilityInput): boolean {
  const human = input.humanStatus ?? "pending";
  if (human !== "confirmed" && human !== "changed") return false;
  if (input.finalPool === "drop") return false;
  const lifecycle = input.status ?? "inbox";
  if (lifecycle === "dropped") return false;
  return true;
}

export function canWatchCandidate(input: {
  humanStatus: string;
  status: string | null;
}): boolean {
  if (input.humanStatus === "pending") return false;
  const lifecycle = input.status ?? "inbox";
  return lifecycle !== "dropped";
}
