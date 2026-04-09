import { pgTable, integer, text, date, real, timestamp } from "drizzle-orm/pg-core";

export const employeesLegacy = pgTable("employees", {
  id: integer("id").notNull(),
  name: text("name").notNull(),
  password: text("password"),
  designation: text("designation").notNull(),
  gender: text("gender").notNull(),
  mobile: text("mobile").notNull(),
  mobile2: text("mobile2").notNull(),
  email: text("email").notNull(),
  dept: integer("dept").notNull(),
  city: text("city").notNull(),
  address: text("address").notNull(),
  about: text("about").notNull(),
  dateBirth: date("date_birth").notNull(),
  dateLeft: date("date_left").notNull(),
  salaryCur: real("salary_cur").notNull(),
  packages: text("packages").notNull(),
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});
