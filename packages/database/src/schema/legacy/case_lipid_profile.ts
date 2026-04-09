import { pgTable, integer, text, timestamp } from "drizzle-orm/pg-core";

export const caseLipidProfileLegacy = pgTable("case_lipid_profile", {
  id: integer("id").notNull(),
  randId: integer("rand_id"),
  regid: integer("regid"),
  dateval: text("dateval"),
  totalCholesterol: text("total_cholesterol"),
  triglycerides: text("triglycerides"),
  hdlCholesterol: text("hdl_cholesterol"),
  ldlCholesterol: text("ldl_cholesterol"),
  vldl: text("vldl"),
  hdlRatio: text("hdl_ratio"),
  ldlHdl: text("ldl_hdl"),
  lipoprotein: text("lipoprotein"),
  apolipoproteinA: text("apolipoprotein_a"),
  apolipoproteinB: text("apolipoprotein_b"),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
  deletedAt: text("deleted_at"),
});
