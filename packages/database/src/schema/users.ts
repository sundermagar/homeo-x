import { pgTable, serial, text, integer, boolean, timestamp } from 'drizzle-orm/pg-core';
import { Role } from '@mmc/types';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  password: text('password').notNull(),
  name: text('name').notNull(),
  type: text('type').$type<Role>().notNull(), // Normalizes legacy 'DOCTOR' vs 'Doctor' at application level
  contextId: integer('context_id'),
  roleId: integer('role_id'),
  roleName: text('role_name'),
  phone: text('phone'),
  isActive: boolean('is_active').default(true).notNull(),
  rememberToken: text('remember_token'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
});
