import { prisma } from "@/server/db";
import { parseSignalRaw } from "@/server/signalRaw";
import {
  clampWeight,
  CONSOLIDATION_WINDOW_DAYS,
  DECAY_FACTOR,
  DEFAULT_WEIGHT,
  HISTORY_MIN_EVENTS,
  nextWeight,
  preferenceKey,
  PRUNE_MIN_IDLE_DAYS,
  PRUNE_WEIGHT_FLOOR,
  reasonScale,
  REINFORCE_BOOST,
  REINFORCE_MIN_EVENTS,
  type ThumbsDownReason
} from "@/shared/preferenceLearning";

export type RecordBehaviorInput = {
  signalId: string;
  eventType: "thumbs_up" | "thumbs_down";
  reason?: ThumbsDownReason | null;
};

export async function recordBehaviorEvent(
  input: RecordBehaviorInput
): Promise<{ eventId: string; weightUpdated: boolean }> {
  const signal = await prisma.signal.findUnique({ where: { id: input.signalId } });
  if (!signal) throw new Error(`signal not found: ${input.signalId}`);

  const raw = parseSignalRaw(signal.rawJson);
  const tags = raw.contentTags ?? [];
  const sourceType = raw.sourceType ?? null;
  const reason = input.eventType === "thumbs_up" ? null : (input.reason ?? null);
  if (input.eventType === "thumbs_down" && !reason) {
    throw new Error("thumbs_down requires a reason");
  }

  const predictedConfidence = signal.decisionConfidence;
  const key = preferenceKey(tags, sourceType);

  const event = await prisma.behaviorEvent.create({
    data: {
      signalId: signal.id,
      eventType: input.eventType,
      reason,
      contentTags: JSON.stringify(tags),
      sourceType,
      predictedConfidence
    }
  });

  await prisma.auditLog.create({
    data: {
      entityType: "signal",
      entityId: signal.id,
      action: input.eventType,
      fromValue: null,
      toValue: JSON.stringify({
        reason,
        predictedConfidence,
        contentTags: tags,
        sourceType
      }),
      rationale: null
    }
  });

  if (input.eventType === "thumbs_down") {
    await prisma.signal.update({
      where: { id: signal.id },
      data: { readingPackStatus: "not_selected" }
    });
  }

  const scale = reasonScale(reason);
  if (scale === 0) {
    return { eventId: event.id, weightUpdated: false };
  }

  const predicted = predictedConfidence ?? DEFAULT_WEIGHT;
  const existing = await prisma.preferenceWeight.findUnique({
    where: {
      contentTags_sourceType: {
        contentTags: key.contentTags,
        sourceType: key.sourceType
      }
    }
  });

  if (!existing) {
    const weight = nextWeight({
      currentWeight: DEFAULT_WEIGHT,
      predictedConfidence: predicted,
      eventType: input.eventType,
      reason
    });
    if (weight === null) {
      return { eventId: event.id, weightUpdated: false };
    }
    await prisma.preferenceWeight.create({
      data: {
        contentTags: key.contentTags,
        sourceType: key.sourceType,
        weight,
        eventCount: 1,
        lastUpdated: new Date()
      }
    });
  } else {
    const weight = nextWeight({
      currentWeight: existing.weight,
      predictedConfidence: predicted,
      eventType: input.eventType,
      reason
    });
    if (weight === null) {
      return { eventId: event.id, weightUpdated: false };
    }
    await prisma.preferenceWeight.update({
      where: { id: existing.id },
      data: {
        weight,
        eventCount: existing.eventCount + 1,
        lastUpdated: new Date()
      }
    });
  }

  return { eventId: event.id, weightUpdated: true };
}

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

function idleDays(lastUpdated: Date, now: Date): number {
  return (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24);
}

export async function consolidatePreferenceWeights(): Promise<{
  reinforced: number;
  decayed: number;
  pruned: number;
}> {
  const now = new Date();
  const windowStart = daysAgo(CONSOLIDATION_WINDOW_DAYS);

  const weights = await prisma.preferenceWeight.findMany();
  const recentEvents = await prisma.behaviorEvent.findMany({
    where: { createdAt: { gte: windowStart } },
    select: { contentTags: true, sourceType: true, createdAt: true }
  });

  const recentCounts = new Map<string, number>();
  for (const event of recentEvents) {
    let tags: string[] = [];
    try {
      const parsed = JSON.parse(event.contentTags) as unknown;
      tags = Array.isArray(parsed) ? parsed.filter((t): t is string => typeof t === "string") : [];
    } catch {
      tags = [];
    }
    const key = preferenceKey(tags, event.sourceType);
    const mapKey = `${key.contentTags}::${key.sourceType}`;
    recentCounts.set(mapKey, (recentCounts.get(mapKey) ?? 0) + 1);
  }

  let reinforced = 0;
  let decayed = 0;
  let pruned = 0;

  for (const row of weights) {
    const mapKey = `${row.contentTags}::${row.sourceType}`;
    const recent = recentCounts.get(mapKey) ?? 0;
    const idle = idleDays(row.lastUpdated, now);

    if (recent >= REINFORCE_MIN_EVENTS) {
      await prisma.preferenceWeight.update({
        where: { id: row.id },
        data: {
          weight: clampWeight(row.weight + REINFORCE_BOOST),
          lastUpdated: now
        }
      });
      reinforced += 1;
      continue;
    }

    if (
      row.weight < PRUNE_WEIGHT_FLOOR &&
      idle >= PRUNE_MIN_IDLE_DAYS &&
      row.eventCount < HISTORY_MIN_EVENTS
    ) {
      await prisma.preferenceWeight.delete({ where: { id: row.id } });
      pruned += 1;
      continue;
    }

    if (idle > CONSOLIDATION_WINDOW_DAYS) {
      await prisma.preferenceWeight.update({
        where: { id: row.id },
        data: {
          weight: clampWeight(row.weight * DECAY_FACTOR),
          lastUpdated: now
        }
      });
      decayed += 1;
    }
  }

  return { reinforced, decayed, pruned };
}
