import { afterEach, describe, expect, it } from "vitest";
import { prisma } from "@/server/db";
import { listRecentAuditLogs } from "@/server/services/auditLogView";

describe("listRecentAuditLogs", () => {
  const createdIds: string[] = [];

  afterEach(async () => {
    for (const id of createdIds.splice(0)) {
      await prisma.auditLog.deleteMany({ where: { id } });
    }
  });

  it("returns newest entries first", async () => {
    const older = await prisma.auditLog.create({
      data: {
        entityType: "signal",
        entityId: "sig-old",
        action: "finalize",
        createdAt: new Date("2026-07-01T10:00:00Z")
      }
    });
    const newer = await prisma.auditLog.create({
      data: {
        entityType: "signal",
        entityId: "sig-new",
        action: "watch",
        createdAt: new Date("2026-07-04T10:00:00Z")
      }
    });
    createdIds.push(older.id, newer.id);

    const entries = (await listRecentAuditLogs(200)).filter(
      (e) => e.entityId === "sig-old" || e.entityId === "sig-new"
    );
    const ids = entries.map((e) => e.id);
    expect(ids).toContain(newer.id);
    expect(ids).toContain(older.id);
    expect(ids.indexOf(newer.id)).toBeLessThan(ids.indexOf(older.id));
  });
});
