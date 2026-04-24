import { eq, and } from 'drizzle-orm';
import type { DbClient } from '../client';
import { rolesLegacy } from '../schema/legacy/roles';
import { permissionsLegacy } from '../schema/legacy/permissions';
import { permissionRoleLegacy } from '../schema/legacy/permission_role';

import { sql } from 'drizzle-orm';

async function repairRbacSchema(db: DbClient) {
  console.log('[Seed] Repairing RBAC schema (adding missing columns if needed)...');
  try {
    // Add missing columns to roles
    await db.execute(sql`ALTER TABLE roles ADD COLUMN IF NOT EXISTS display_name TEXT DEFAULT ''`);
    await db.execute(sql`ALTER TABLE roles ADD COLUMN IF NOT EXISTS parent INTEGER DEFAULT 0`);
    await db.execute(sql`ALTER TABLE roles ADD COLUMN IF NOT EXISTS dept INTEGER DEFAULT 1`);
    
    // Add missing columns to permissions
    await db.execute(sql`ALTER TABLE permissions ADD COLUMN IF NOT EXISTS display_name TEXT DEFAULT ''`);
    await db.execute(sql`ALTER TABLE permissions ADD COLUMN IF NOT EXISTS slug TEXT`);
    await db.execute(sql`ALTER TABLE permissions ADD COLUMN IF NOT EXISTS module TEXT`);
    
    // Ensure slug unique constraint (optional, but good if we want to rely on it)
    try {
      await db.execute(sql`ALTER TABLE permissions ADD CONSTRAINT permissions_slug_key UNIQUE (slug)`);
    } catch (e) { /* ignore if already exists */ }

    console.log('  - Schema repair completed successfully.');
  } catch (err: any) {
    console.warn(`  - Schema repair warning: ${err.message}`);
  }
}

export async function seedRbac(db: DbClient) {
  console.log('[Seed] Seeding Roles & Permissions (RBAC)...');
  
  // 0. Ensure schema is ready
  await repairRbacSchema(db);

  // 1. Seed Permissions (Capabilities)
  const permissions = [
    { id: 1, name: 'View Patients', slug: 'PATIENT_VIEW', module: 'Clinical', displayName: 'View Patients', description: 'Grants access to view patient lists and search.' },
    { id: 2, name: 'Write Patients', slug: 'PATIENT_WRITE', module: 'Clinical', displayName: 'Create/Edit Patients', description: 'Grants access to register and update patient profiles.' },
    { id: 3, name: 'Delete Patients', slug: 'PATIENT_DELETE', module: 'Clinical', displayName: 'Delete Patients', description: 'Grants access to soft-delete patient records.' },
    
    { id: 10, name: 'View Billing', slug: 'BILLING_VIEW', module: 'Financial', displayName: 'View Billing', description: 'Grants access to view invoices and collection reports.' },
    { id: 11, name: 'Write Billing', slug: 'BILLING_WRITE', module: 'Financial', displayName: 'Create Billing', description: 'Grants access to generate new bills and receipts.' },
    
    { id: 20, name: 'Manage Staff', slug: 'STAFF_MANAGE', module: 'System', displayName: 'Manage Staff', description: 'Grants access to add or edit staff members (Doctors, Receptionists).' },
    { id: 21, name: 'Manage RBAC', slug: 'RBAC_MANAGE', module: 'System', displayName: 'Manage Roles', description: 'Grants access to modify roles and permissions matrix.' },
    
    { id: 30, name: 'View Stocks', slug: 'STOCKS_VIEW', module: 'Inventory', displayName: 'View Stocks', description: 'Grants access to view medicine inventory levels.' },
    { id: 31, name: 'Manage Stocks', slug: 'STOCKS_WRITE', module: 'Inventory', displayName: 'Manage Stocks', description: 'Grants access to update medicine inventory and stock logs.' }
  ];

  for (const p of permissions) {
    const existingById = await db.select().from(permissionsLegacy).where(eq(permissionsLegacy.id, p.id)).limit(1);
    const existingBySlug = await db.select().from(permissionsLegacy).where(eq(permissionsLegacy.slug, p.slug)).limit(1);
    
    if (existingById.length === 0 && existingBySlug.length === 0) {
      await db.insert(permissionsLegacy).values(p as any);
      console.log(`  - Created permission: ${p.slug}`);
    } else {
      console.log(`  - Permission already exists (ID or Slug match): ${p.slug}`);
    }
  }

  // 2. Seed Roles
  const roles = [
    { id: 1, name: 'Super Admin', displayName: 'Super Administrator', description: 'Full system access with all capabilities.', parent: 0, dept: 1 },
    { id: 2, name: 'Clinic Admin', displayName: 'Clinic Administrator', description: 'Full clinic management access.', parent: 1, dept: 1 },
    { id: 3, name: 'Doctor', displayName: 'Medical Practitioner', description: 'Access to clinical and patient data.', parent: 1, dept: 1 },
    { id: 4, name: 'Receptionist', displayName: 'Front Desk Staff', description: 'Access to patient intake and scheduling.', parent: 2, dept: 1 },
    { id: 5, name: 'Account Manager', displayName: 'Billing Specialist', description: 'Access to financial records and billing.', parent: 2, dept: 1 }
  ];

  for (const r of roles) {
    const existingById = await db.select().from(rolesLegacy).where(eq(rolesLegacy.id, r.id)).limit(1);
    const existingByName = await db.select().from(rolesLegacy).where(eq(rolesLegacy.name, r.name)).limit(1);
    
    if (existingById.length === 0 && existingByName.length === 0) {
      await db.insert(rolesLegacy).values(r as any);
      console.log(`  - Created role: ${r.name}`);
    } else {
      console.log(`  - Role already exists (ID or Name match): ${r.name}`);
    }
  }

  // 3. Assign Default Permissions to Roles
  console.log('[Seed] Assigning default capabilities...');
  const assignments = [
    // Super Admin: Everything
    ...permissions.map(p => ({ roleId: 1, permissionId: p.id })),
    // Clinic Admin: Almost everything except RBAC manage perhaps
    ...permissions.filter(p => p.slug !== 'RBAC_MANAGE').map(p => ({ roleId: 2, permissionId: p.id })),
    // Doctor: Clinical stuff
    { roleId: 3, permissionId: 1 }, { roleId: 3, permissionId: 2 }, { roleId: 3, permissionId: 30 },
    // Receptionist: Patients and Billing View
    { roleId: 4, permissionId: 1 }, { roleId: 4, permissionId: 2 }, { roleId: 4, permissionId: 10 },
    // Account Manager: Billing and Stocks
    { roleId: 5, permissionId: 10 }, { roleId: 5, permissionId: 11 }, { roleId: 5, permissionId: 30 }
  ];

  for (const a of assignments) {
    const existing = await db.select().from(permissionRoleLegacy).where(
      and(
        eq(permissionRoleLegacy.roleId, a.roleId),
        eq(permissionRoleLegacy.permissionId, a.permissionId)
      )
    ).limit(1);
    
    if (existing.length === 0) {
      await db.insert(permissionRoleLegacy).values(a);
    }
  }

  console.log('[Seed] RBAC seeding completed.');
}
