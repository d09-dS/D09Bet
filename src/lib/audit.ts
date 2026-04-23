import { prisma } from "@/lib/prisma";

let cachedSystemAdminId: string | null = null;

/**
 * Returns the ID of the first active admin user.
 * Used for system/cron actions that have no authenticated user.
 */
async function getSystemAdminId(): Promise<string> {
  if (cachedSystemAdminId) return cachedSystemAdminId;
  const admin = await prisma.user.findFirst({
    where: { role: "ADMIN", isActive: true, deletedAt: null },
    select: { id: true },
  });
  if (!admin) throw new Error("No active admin found for system audit log");
  cachedSystemAdminId = admin.id;
  return admin.id;
}

/**
 * Centralized audit logging utility.
 *
 * Logs an action to the admin_audit_log table.
 * For admin actions, pass the admin's userId.
 * For user actions (registration, bets, etc.), pass the user's id.
 * For system/cron actions, pass null — the first admin will be used.
 *
 * This is fire-and-forget — errors are caught and logged to console
 * so they never break the main request flow.
 */
export async function logAction(
  userId: string | null,
  action: string,
  entityType?: string | null,
  entityId?: string | null,
  details?: Record<string, unknown> | null,
) {
  try {
    const adminId = userId ?? await getSystemAdminId();
    await prisma.adminAuditLog.create({
      data: {
        adminId,
        action,
        entityType: entityType ?? null,
        entityId: entityId ?? null,
        details: details ?? undefined,
      },
    });
  } catch (err) {
    console.error("[audit] Failed to log action:", action, err);
  }
}
