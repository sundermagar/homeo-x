import { pgTable, integer, text, timestamp } from "drizzle-orm/pg-core";

export const trialLegacy = pgTable("trial", {
  id: integer("id").notNull(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  verifyPhone: text("verify_phone"),
  email: text("email").notNull(),
  password: text("password").notNull(),
  clinicName: text("clinic_name").notNull(),
  address: text("address").notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
  deletedAt: timestamp("deleted_at"),
});
