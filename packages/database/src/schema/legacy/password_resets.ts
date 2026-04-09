import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const passwordResetsLegacy = pgTable("password_resets", {
  email: text("email").notNull(),
  token: text("token").notNull(),
  createdAt: timestamp("created_at"),
});
