import { prisma } from "@/server/db";
import { syncSignalToCandidate } from "@/server/services/candidateSync";
import { assertValidPool } from "@/shared/poolOptions";

export type DraftState = {
  finalPool: string | null;
  priority: string | null;
  readingPackStatus: string | null;
};

export type DraftAction =
  | { type: "set_pool"; pool: string }
  | { type: "set_priority"; priority: string }
  | { type: "toggle_reading_pack" };

export type FinalizeInput = {
  suggestedPool: string | null;
  finalPool: string | null;
  priority: string | null;
  initialPriority: string | null;
  readingPackStatus: string | null;
  initialReadingPackStatus: string | null;
};

function draftActionName(action: DraftAction): string {
  switch (action.type) {
    case "set_pool":
      return "draft_set_pool";
    case "set_priority":
      return "draft_set_priority";
    case "toggle_reading_pack":
      return "draft_toggle_reading_pack";
  }
}

export function applyDraftAction(state: DraftState, action: DraftAction): DraftState {
  switch (action.type) {
    case "set_pool":
      return { ...state, finalPool: action.pool };
    case "set_priority":
      return { ...state, priority: action.priority };
    case "toggle_reading_pack":
      return {
        ...state,
        readingPackStatus: state.readingPackStatus === "selected" ? "not_selected" : "selected"
      };
  }
}

export function computeHumanStatusOnFinalize(input: FinalizeInput): "confirmed" | "changed" {
  const effectivePool = input.finalPool ?? input.suggestedPool;
  const poolChanged = effectivePool !== input.suggestedPool;
  const priorityChanged = input.priority !== input.initialPriority;
  const packChanged = input.readingPackStatus !== input.initialReadingPackStatus;

  return poolChanged || priorityChanged || packChanged ? "changed" : "confirmed";
}

export function extractInitialFromRaw(rawJson: string): {
  priority: string | null;
  readingPackStatus: string | null;
} {
  try {
    const obj = JSON.parse(rawJson) as Record<string, unknown>;
    return {
      priority: typeof obj.priority === "string" ? obj.priority : null,
      readingPackStatus:
        typeof obj.reading_pack_status === "string" ? obj.reading_pack_status : null
    };
  } catch {
    return { priority: null, readingPackStatus: null };
  }
}

export async function draftSignalEdit(signalId: string, action: DraftAction): Promise<void> {
  if (action.type === "set_pool") {
    assertValidPool(action.pool);
  }

  const signal = await prisma.signal.findUnique({ where: { id: signalId } });
  if (!signal) throw new Error(`signal not found: ${signalId}`);

  const before: DraftState = {
    finalPool: signal.finalPool,
    priority: signal.priority,
    readingPackStatus: signal.readingPackStatus
  };
  const after = applyDraftAction(before, action);

  await prisma.$transaction([
    prisma.signal.update({
      where: { id: signalId },
      data: {
        ...after,
        humanStatus: "pending"
      }
    }),
    prisma.auditLog.create({
      data: {
        entityType: "signal",
        entityId: signalId,
        action: draftActionName(action),
        fromValue: JSON.stringify(before),
        toValue: JSON.stringify(after),
        rationale: null
      }
    })
  ]);
}

export async function finalizeSignal(signalId: string): Promise<void> {
  const signal = await prisma.signal.findUnique({ where: { id: signalId } });
  if (!signal) throw new Error(`signal not found: ${signalId}`);
  if ((signal.humanStatus ?? "pending") !== "pending") return;

  const initial = extractInitialFromRaw(signal.rawJson);
  const effectiveFinalPool = signal.finalPool ?? signal.suggestedPool;
  const humanStatus = computeHumanStatusOnFinalize({
    suggestedPool: signal.suggestedPool,
    finalPool: effectiveFinalPool,
    priority: signal.priority,
    initialPriority: initial.priority,
    readingPackStatus: signal.readingPackStatus,
    initialReadingPackStatus: initial.readingPackStatus
  });

  const before = {
    humanStatus: signal.humanStatus ?? "pending",
    finalPool: signal.finalPool
  };
  const after = { humanStatus, finalPool: effectiveFinalPool };

  await prisma.$transaction([
    prisma.signal.update({
      where: { id: signalId },
      data: { humanStatus, finalPool: effectiveFinalPool }
    }),
    prisma.auditLog.create({
      data: {
        entityType: "signal",
        entityId: signalId,
        action: "finalize",
        fromValue: JSON.stringify(before),
        toValue: JSON.stringify(after),
        rationale: null
      }
    })
  ]);

  await syncSignalToCandidate(signalId);
}

export async function finalizeAllPending(date: string): Promise<number> {
  const pending = await prisma.signal.findMany({
    where: { stream: "daily", date, humanStatus: "pending" },
    select: { id: true }
  });

  for (const { id } of pending) {
    await finalizeSignal(id);
  }

  return pending.length;
}
