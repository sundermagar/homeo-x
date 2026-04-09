import { pgTable, integer, text, jsonb, real, timestamp } from "drizzle-orm/pg-core";

export const aiAuditLogsLegacy = pgTable("ai_audit_logs", {
  id: integer("id").notNull(),
  tenantId: integer("tenant_id"),
  visitId: integer("visit_id"),
  actionType: text("action_type"),
  inputHash: text("input_hash"),
  outputJson: jsonb("output_json"),
  userId: integer("user_id"),
  action: text("action"),
  promptName: text("prompt_name"),
  modelProvider: text("model_provider"),
  modelName: text("model_name"),
  inputTokens: integer("input_tokens"),
  outputTokens: integer("output_tokens"),
  latencyMs: integer("latency_ms"),
  inputData: jsonb("input_data"),
  outputData: jsonb("output_data"),
  confidence: real("confidence"),
  clinicianOverride: jsonb("clinician_override"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at"),
});
