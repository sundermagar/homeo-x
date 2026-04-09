import { pgTable, bigint, text, date, timestamp } from "drizzle-orm/pg-core";

export const userProfilesLegacy = pgTable("user_profiles", {
  id: bigint("id", { mode: "number" }).notNull(),
  userId: bigint("user_id", { mode: "number" }).notNull(),
  firstname: text("firstname"),
  lastname: text("lastname"),
  birthdate: date("birthdate"),
  gender: text("gender"),
  address: text("address"),
  phone: text("phone"),
  image: text("image"),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
  deletedAt: timestamp("deleted_at"),
});
