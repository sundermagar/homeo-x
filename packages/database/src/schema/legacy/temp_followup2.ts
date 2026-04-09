import { pgTable, integer, text } from "drizzle-orm/pg-core";

export const tempFollowup2Legacy = pgTable("temp_followup2", {
  FollowupID: integer("FollowupID"),
  Followup: text("Followup"),
});
