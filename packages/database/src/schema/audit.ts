import { pgTable, serial, varchar, integer, timestamp, text, jsonb, index } from 'drizzle-orm/pg-core';

// ─── Application Audit Logs ───────────────────────────────────────────────────
export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  action: varchar('action', { length: 100 }).notNull(),
  tenantId: varchar('tenant_id', { length: 50 }).notNull(),
  userId: integer('user_id'),
  correlationId: varchar('correlation_id', { length: 50 }),
  resourceType: varchar('resource_type', { length: 50 }).notNull(),
  resourceId: varchar('resource_id', { length: 100 }),
  oldData: jsonb('old_data'),
  newData: jsonb('new_data'),
  metadata: jsonb('metadata'),
  ip: varchar('ip', { length: 50 }),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  actionIdx: index('idx_audit_action').on(table.action),
  tenantIdx: index('idx_audit_tenant').on(table.tenantId),
  resourceIdx: index('idx_audit_resource').on(table.resourceType, table.resourceId),
  userIdx: index('idx_audit_user').on(table.userId),
  createdIdx: index('idx_audit_created').on(table.createdAt),
}));

// ─── AI Model Interaction Audit ───────────────────────────────────────────────
export const aiAuditLogs = pgTable('ai_audit_logs', {
  id: serial('id').primaryKey(),
  tenantId: varchar('tenant_id', { length: 50 }).notNull(),
  userId: integer('user_id'),
  visitId: varchar('visit_id', { length: 50 }),
  actionType: varchar('action_type', { length: 100 }).notNull(),
  provider: varchar('provider', { length: 30 }),
  model: varchar('model', { length: 50 }),
  inputTokens: integer('input_tokens'),
  outputTokens: integer('output_tokens'),
  latencyMs: integer('latency_ms'),
  confidence: integer('confidence'),
  inputHash: varchar('input_hash', { length: 100 }),
  outputJson: jsonb('output_json'),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  tenantIdx: index('idx_ai_audit_tenant').on(table.tenantId),
  visitIdx: index('idx_ai_audit_visit').on(table.visitId),
}));
