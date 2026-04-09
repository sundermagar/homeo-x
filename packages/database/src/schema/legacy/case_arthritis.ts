import { pgTable, integer, text, timestamp } from "drizzle-orm/pg-core";

export const caseArthritisLegacy = pgTable("case_arthritis", {
  id: integer("id").notNull(),
  randId: integer("rand_id"),
  regid: integer("regid"),
  dateval: text("dateval"),
  antiO: text("anti_o"),
  accp: text("accp"),
  raFactor: text("ra_factor"),
  alkaline: text("alkaline"),
  ana: text("ana"),
  cReact: text("c_react"),
  c4: text("c4"),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
  deletedAt: text("deleted_at"),
});
