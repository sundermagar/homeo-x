import { pgTable, integer, text } from "drizzle-orm/pg-core";

export const tempCommunicationLegacy = pgTable("temp_communication", {
  ID: integer("ID"),
  RegID: text("RegID"),
  CommunicationDate: text("CommunicationDate"),
  Comments: text("Comments"),
  Viewed: text("Viewed"),
});
