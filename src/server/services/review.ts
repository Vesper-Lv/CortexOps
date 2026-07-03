import { prisma } from "@/server/db";
import { assertValidPool } from "@/shared/poolOptions";

export type ReviewState = {
  humanStatus: string;
  finalPool: string | null;
  readingPackStatus: string | null;
};

export type ReviewAction =
  | { type: "confirm" }
  | { type: "change_pool"; pool: string }
  | { type: "reject" }
  | { type: "toggle_reading_pack" };

export function applyReviewAction(state: ReviewState, action: ReviewAction): ReviewState {
  switch (action.type) {
    case "confirm":
      return { ...state, humanStatus: "confirmed" };
    case "change_pool":
      return { ...state, humanStatus: "changed", finalPool: action.pool };
    case "reject":
      return { ...state, humanStatus: "rejected" };
    case "toggle_reading_pack":
      return {
        ...state,
        readingPackStatus: state.readingPackStatus === "selected" ? "not_selected" : "selected"
      };
  }
}

export async function reviewSignal(signalId: string, action: ReviewAction, rationale?: string): Promise<void> {
  if (action.type === "change_pool") {
    assertValidPool(action.pool);
  }

  const signal = await prisma.signal.findUnique({ where: { id: signalId } });
  if (!signal) throw new Error(`signal not found: ${signalId}`);

  const before: ReviewState = {
    humanStatus: signal.humanStatus ?? "pending",
    finalPool: signal.finalPool,
    readingPackStatus: signal.readingPackStatus
  };
  const after = applyReviewAction(before, action);

  await prisma.$transaction([
    prisma.signal.update({ where: { id: signalId }, data: after }),
    prisma.auditLog.create({
      data: {
        entityType: "signal",
        entityId: signalId,
        action: action.type,
        fromValue: JSON.stringify(before),
        toValue: JSON.stringify(after),
        rationale: rationale ?? null
      }
    })
  ]);
}
