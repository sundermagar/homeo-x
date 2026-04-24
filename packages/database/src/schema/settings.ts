import { pgTable, serial, varchar, text, integer, boolean, timestamp, real, date } from 'drizzle-orm/pg-core';

export const departments = pgTable('departments', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('detail'), // keeping for legacy
  tags: text('tags').default(''),
  color: varchar('color', { length: 50 }).default('#2563EB'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const dispensaries = pgTable('dispensaries', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }),
  password: text('password'),
  gender: varchar('gender', { length: 20 }).default('Male'),
  mobile: varchar('mobile', { length: 50 }),
  mobile2: varchar('mobile2', { length: 50 }),
  location: varchar('location', { length: 255 }), // current Kreed.health field
  city: varchar('city', { length: 100 }),
  address: text('address'),
  about: text('about'),
  designation: varchar('designation', { length: 100 }),
  dept: varchar('dept', { length: 100 }),
  dateBirth: date('date_birth'),
  contactNumber: varchar('contact_number', { length: 50 }), // legacy Kreed.health stub field
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  deletedAt: timestamp('deleted_at'),
});


export const referralSources = pgTable('referral_sources', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  type: varchar('type', { length: 100 }), // e.g. Doctor, Patient, Ad campaigns
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const referenceTypes = pgTable('reference_types', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  deletedAt: timestamp('deleted_at'),
});

export const stickers = pgTable('stickers', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  detail: text('detail').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const staticPages = pgTable('static_pages', {
  id: serial('id').primaryKey(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  title: varchar('title', { length: 255 }).notNull(),
  content: text('content'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const faqs = pgTable('faqs', {
  id: serial('id').primaryKey(),
  name: text('name'),
  ques: text('ques').notNull(),
  detail: text('detail'),
  ans: text('ans').notNull(),
  displayOrder: integer('display_order').default(0),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  deletedAt: timestamp('deleted_at'),
});

export const pdfSettings = pgTable('pdf_settings', {
  id: serial('id').primaryKey(),
  templateName: varchar('template_name', { length: 255 }).notNull(),
  headerHtml: text('header_html'),
  footerHtml: text('footer_html'),
  margin: varchar('margin', { length: 100 }),
  isDefault: boolean('is_default').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const medicines = pgTable('medicines', {
  id: serial('id').primaryKey(), // We use serial for mapping but in DB it's "ID".
  name: varchar('name', { length: 255 }).notNull(),
  disease: text('disease'),
  potencyId: integer('potency_id'),
  type: varchar('type', { length: 100 }),
  category: varchar('category', { length: 100 }),
  price: real('price').default(0),
  stockLevel: integer('stock_level').default(0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const potencies = pgTable('potencies', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  detail: text('detail'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const frequencies = pgTable('case_frequency', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 255 }),
  frequency: text('frequency'), // legacy field
  duration: varchar('duration', { length: 255 }),
  days: integer('days'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const courierMasters = pgTable('courier_masters', {
  id:            serial('id').primaryKey(),
  name:          varchar('name',           { length: 255 }).notNull(),
  contactPerson: varchar('contact_person', { length: 255 }),
  phone:         varchar('phone',          { length: 50 }),
  trackingUrl:   text('tracking_url'),
  isActive:      boolean('is_active').default(true),
  createdAt:     timestamp('created_at').defaultNow(),
  updatedAt:     timestamp('updated_at').defaultNow(),
});


