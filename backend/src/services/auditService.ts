import { prisma } from '../config/db';

export interface AuditLogParams {
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  reason?: string;
  oldValues?: any;
  newValues?: any;
}

export const recordAuditLog = async (params: AuditLogParams) => {
  try {
    return await prisma.auditLog.create({
      data: {
        actor_id: params.actorId,
        action: params.action,
        entity_type: params.entityType,
        entity_id: params.entityId,
        reason: params.reason || null,
        old_values: params.oldValues || null,
        new_values: params.newValues || null,
      },
    });
  } catch (error) {
    console.error('[Audit Log Error]: Failed to create audit log', error);
    // Never let audit failure crash the primary operation unless strictly required
    return null;
  }
};
