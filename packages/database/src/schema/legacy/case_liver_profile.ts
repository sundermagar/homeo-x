import { pgTable, integer, text, timestamp } from "drizzle-orm/pg-core";

export const caseLiverProfileLegacy = pgTable("case_liver_profile", {
  id: integer("id").notNull(),
  randId: integer("rand_id"),
  regid: integer("regid"),
  dateval: text("dateval"),
  totalBil: text("total_bil"),
  dirBilirubin: text("dir_bilirubin"),
  indBilirubin: text("ind_bilirubin"),
  gammaGt: text("gamma_gt"),
  totalProtein: text("total_protein"),
  albumin: text("albumin"),
  globulin: text("globulin"),
  sgot: text("sgot"),
  sgpt: text("sgpt"),
  alkPhos: text("alk_phos"),
  austAntigen: text("aust_antigen"),
  amylase: text("amylase"),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
  deletedAt: text("deleted_at"),
});
