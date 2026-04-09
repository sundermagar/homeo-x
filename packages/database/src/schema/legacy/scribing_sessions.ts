import { pgTable, integer, text, jsonb, timestamp } from "drizzle-orm/pg-core";

export const scribingSessionsLegacy = pgTable("scribing_sessions", {
  id: integer("id").notNull(),
  tenantId: integer("tenant_id"),
  visitId: integer("visit_id").notNull(),
  userId: integer("user_id"),
  status: text("status"),
  language: text("language"),
  totalDurationMs: integer("total_duration_ms"),
  metadata: jsonb("metadata"),
  startedAt: timestamp("started_at"),
  endedAt: timestamp("ended_at"),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});
