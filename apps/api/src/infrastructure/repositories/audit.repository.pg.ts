import { sql, desc, eq, and, gte, lte } from 'drizzle-orm';
import type { DbClient } from '@mmc/database';
import { auditLogs } from '@mmc/database';
import { AuditAction, AuditEntry, AuditRepository } from '../../../shared/audit/audit-logger';

export class AuditRepositoryPg implements AuditRepository {
  constructor(private readonly db: DbClient) {}

  async log(entry: AuditEntry): Promise<void> {
    await this.db.insert(auditLogs).values({
      action: entry.action,
      tenantId: entry.tenantId,
      userId: entry.userId,
      correlationId: entry.correlationId,
      resourceType: entry.resourceType,
      resourceId: String(entry.resourceId),
      oldData: entry.oldData,
      newData: entry.newData,
      metadata: entry.metadata,
      ip: entry.ip,
      userAgent: entry.userAgent,
    });
  }

  async query(filters: {
    tenantId?: string;
    resourceType?: string;
    resourceId?: string | number;
    userId?: number;
    action?: AuditAction;
    from?: Date;
    to?: Date;
    limit?: number;
    offset?: number;
  }): Promise<{ entries: any[]; total: number }> {
    const { tenantId, resourceType, resourceId, userId, action, from, to, limit = 50, offset = 0 } = filters;

    const conditions = [];
    if (tenantId) conditions.push(eq(auditLogs.tenantId, tenantId));
    if (resourceType) conditions.push(eq(auditLogs.resourceType, resourceType));
    if (resourceId) conditions.push(eq(auditLogs.resourceId, String(resourceId)));
    if (userId) conditions.push(eq(auditLogs.userId, userId));
    if (action) conditions.push(eq(auditLogs.action, action));
    if (from) conditions.push(gte(auditLogs.createdAt, from));
    if (to) conditions.push(lte(auditLogs.createdAt, to));

    const finalCondition = conditions.length > 0 ? and(...conditions) : undefined;

    const entries = await this.db
      .select()
      .from(auditLogs)
      .where(finalCondition)
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit)
      .offset(offset);

    const countResult = await this.db.execute(sql`
      SELECT count(*) as count FROM audit_logs
      ${finalCondition ? sql`WHERE ${finalCondition}` : sql``}
    `) as any[];

    return {
      entries: entries.map(e => ({
        ...e,
        action: e.action as AuditAction,
        createdAt: e.createdAt.toISOString()
      })),
      total: Number(countResult[0]?.count || 0),
    };
  }
}
