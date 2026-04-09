import { pgTable, integer, text, timestamp } from "drizzle-orm/pg-core";

export const caseUsgfemaleLegacy = pgTable("case_usgfemale", {
  id: integer("id").notNull(),
  randId: integer("rand_id"),
  regid: integer("regid"),
  dateval: text("dateval"),
  uteruesSize: text("uterues_size"),
  thickness: text("thickness"),
  fibroidsNo: text("fibroids_no"),
  description: text("description"),
  ovarySizeRt: text("ovary_size_rt"),
  ovarySizeLt: text("ovary_size_lt"),
  ovaryVolumeRt: text("ovary_volume_rt"),
  ovaryVolumeLt: text("ovary_volume_lt"),
  folliclesRt: text("follicles_rt"),
  folliclesLt: text("follicles_lt"),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
  deletedAt: text("deleted_at"),
});
