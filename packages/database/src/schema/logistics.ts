import {
  pgTable, serial, integer, varchar, timestamp, jsonb, boolean
} from 'drizzle-orm/pg-core';

// ─── Couriers ─────────────────────────────────────────────────────────────────
export const couriers = pgTable('couriers', {
  id: serial('id').primaryKey(),
  packageId: integer('package_id'),
  totalNoPackage: integer('total_no_package').default(1),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
});

// ─── Courier Medicines (legacy table name: couriermedicines, no underscore) ───
export const courierMedicines = pgTable('couriermedicines', {
  id: serial('id').primaryKey(),
  courierId: integer('courier_id'),
  regid: integer('regid'),
  medicineIds: jsonb('medicine_ids'),
  dispatchDate: timestamp('dispatch_date'),
  trackingNo: varchar('tracking_no', { length: 150 }),
  status: varchar('status', { length: 50 }).default('Pending'),
  notified: boolean('notified').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
});
