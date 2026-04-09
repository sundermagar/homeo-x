import { pgTable, integer, text, real, boolean, timestamp } from "drizzle-orm/pg-core";

export const transcriptSegmentsLegacy = pgTable("transcript_segments", {
  id: integer("id").notNull(),
  sessionId: integer("session_id").notNull(),
  sequenceNumber: integer("sequence_number").notNull(),
  text: text("text").notNull(),
  speaker: text("speaker"),
  confidence: real("confidence"),
  startTimeMs: integer("start_time_ms").notNull(),
  endTimeMs: integer("end_time_ms").notNull(),
  isFinal: boolean("is_final"),
  source: text("source"),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});
