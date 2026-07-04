import { prisma } from "@/server/db";

export type AuditLogEntry = {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  fromValue: string | null;
  toValue: string | null;
  rationale: string | null;
  createdAt: Date;
};

export async function listRecentAuditLogs(limit = 80): Promise<AuditLogEntry[]> {
  return prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      entityType: true,
      entityId: true,
      action: true,
      fromValue: true,
      toValue: true,
      rationale: true,
      createdAt: true
    }
  });
}
