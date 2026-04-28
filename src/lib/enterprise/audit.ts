import { prisma } from "@/lib/db";

export type AuditContext = {
  branchId?: string;
  userId?: string;
  ipAddress?: string;
};

/**
 * Creates an immutable audit log entry.
 */
export async function logAudit(
  action: string,
  entity: string,
  entityId: string | null,
  ctx: AuditContext,
  oldValue?: unknown,
  newValue?: unknown
) {
  await prisma.auditLog.create({
    data: {
      branchId: ctx.branchId,
      userId: ctx.userId,
      action,
      entity,
      entityId,
      oldValue: oldValue ? JSON.parse(JSON.stringify(oldValue)) : null,
      newValue: newValue ? JSON.parse(JSON.stringify(newValue)) : null,
      ipAddress: ctx.ipAddress,
    },
  });
}
