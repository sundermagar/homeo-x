import { pgTable, integer, text } from "drizzle-orm/pg-core";

export const tempDoctorsLegacy = pgTable("temp_doctors", {
  ID: integer("ID"),
  AssistantDoctor: text("AssistantDoctor"),
  PasswordString: text("PasswordString"),
});
