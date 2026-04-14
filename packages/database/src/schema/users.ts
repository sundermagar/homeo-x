import { pgTable, serial, text, integer, boolean, timestamp } from 'drizzle-orm/pg-core';
import type { Role } from '@mmc/types';

/**
 * Users table — shared across all tenant schemas.
 * Merged: friend's extended fields (gender, mobile, city, address, about)
 * + our fields (isActive, roleId, roleName, type with Role enum)
 */
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  password: text('password').notNull(),
  name: text('name').notNull(),
  type: text('type').$type<Role>(),              // 'Doctor', 'Receptionist', 'Admin', 'Account', etc.
  contextId: integer('context_id'),
  roleId: integer('role_id'),
  roleName: text('role_name'),
  phone: text('phone'),
  // gender: text('gender'),
  // mobile: text('mobile'),
  // city: text('city'),
  // address: text('address'),
  // about: text('about'),
  isActive: boolean('is_active').default(true).notNull(),
  rememberToken: text('remember_token'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
});
