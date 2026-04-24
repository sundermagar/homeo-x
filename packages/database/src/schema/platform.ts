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
  tagLine:      text('tag_line').default(''),
  registration: text('registration').default(''),
  logo:         text('logo').default(''),
  address2:     text('address2').default(''),
  timing:       text('timing').default(''),
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
  mobile:      text('mobile').default('').notNull(),
  mobile2:     text('mobile2').default('').notNull(),
  gender:      text('gender').default('Male').notNull(),
  city:        text('city').default('').notNull(),
  address:     text('address').default('').notNull(),
  about:       text('about').default('').notNull(),
  designation: text('designation').default('').notNull(),
  dept:        integer('dept').default(1).notNull(), // Finance/Accounts dept
  dateBirth:   date('date_birth'),
  dateLeft:    date('date_left'),
  salaryCur:   integer('salary_cur').default(0).notNull(),
  packages:    text('packages').default('').notNull(),
  clinicId:    integer('clinic_id'),   // references organizations(id)
  deletedAt:   timestamp('deleted_at'),
  createdAt:   timestamp('created_at').defaultNow(),
  updatedAt:   timestamp('updated_at').defaultNow(),
});

/**
 * clinicadmins — Professional profiles of clinic administrators.
 * This table enables the Platform Dashboard to show a consolidated list
 * of administrators across all clinics.
 */
export const clinicadmins = pgTable('clinicadmins', {
  id:           serial('id').primaryKey(),
  name:         text('name').notNull(),
  password:     text('password'),
  designation:  text('designation').default('Clinic Administrator'),
  gender:       text('gender').default('Male').notNull(),
  mobile:       text('mobile').default('').notNull(),
  mobile2:      text('mobile2').default('').notNull(),
  email:        text('email').notNull(),
  dept:         integer('dept').default(4).notNull(),
  city:         text('city').default('').notNull(),
  address:      text('address').default('').notNull(),
  about:        text('about').default('').notNull(),
  dateBirth:    date('date_birth'),
  dateLeft:     date('date_left'),
  salaryCur:    integer('salary_cur').default(0).notNull(),
  packages:     text('packages').default('').notNull(),
  clinicId:     integer('clinic_id'), // Reference to organization
  deletedAt:    timestamp('deleted_at'),
  createdAt:    timestamp('created_at').defaultNow(),
  updatedAt:    timestamp('updated_at').defaultNow(),
});

export type Organization    = typeof organizations.$inferSelect;
export type NewOrganization = typeof organizations.$inferInsert;
export type Account         = typeof accounts.$inferSelect;
export type NewAccount      = typeof accounts.$inferInsert;
export type ClinicAdmin     = typeof clinicadmins.$inferSelect;
export type NewClinicAdmin  = typeof clinicadmins.$inferInsert;
