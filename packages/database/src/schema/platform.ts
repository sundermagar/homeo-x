import { pgTable, serial, integer, text, timestamp, date } from 'drizzle-orm/pg-core';

/**
 * organizations — mirrors the legacy 'organizations' table exactly.
 * Lives in the public schema (shared across all tenants).
 */
export const organizations = pgTable('organizations', {
  id:           serial('id').primaryKey(),
  name:         text('name').notNull(),
  email:        text('email').default(''),
  phone:        text('phone').default(''),
  address:      text('address').default(''),
  website:      text('website').default(''),
  assignedTo:   integer('assigned_to').default(1),
  connectSince: date('connect_since').default('1990-01-01'),
  city:         text('city').default(''),
  description:  text('description').default(''),
  adminEmail:   text('admin_email').default(''),
  adminPassword: text('admin_password').default(''),
  deletedAt:    timestamp('deleted_at'),
  createdAt:    timestamp('created_at').defaultNow(),
  updatedAt:    timestamp('updated_at').defaultNow(),
});

/**
 * accounts — mirrors the legacy 'accounts' table exactly.
 * Clinic admin users. Each account is mirrored to the tenant's 'users' table
 * with type = 'Account' for authentication purposes.
 * Lives in the public schema.
 */
export const accounts = pgTable('accounts', {
  id:          serial('id').primaryKey(),
  name:        text('name').notNull(),
  email:       text('email').default(''),
  password:    text('password').default(''),
  mobile:      text('mobile').default(''),
  mobile2:     text('mobile2').default(''),
  gender:      text('gender').default('Male'),
  city:        text('city').default(''),
  address:     text('address').default(''),
  about:       text('about').default(''),
  designation: text('designation').default(''),
  clinicId:    integer('clinic_id'),   // references organizations(id)
  deletedAt:   timestamp('deleted_at'),
  createdAt:   timestamp('created_at').defaultNow(),
  updatedAt:   timestamp('updated_at').defaultNow(),
});

export type Organization    = typeof organizations.$inferSelect;
export type NewOrganization = typeof organizations.$inferInsert;
export type Account         = typeof accounts.$inferSelect;
export type NewAccount      = typeof accounts.$inferInsert;
