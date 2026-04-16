import { eq } from 'drizzle-orm';
import type { DbClient } from '../client';
import { receptionistsLegacy } from '../schema/legacy/receptionists';
import { employeesLegacy } from '../schema/legacy/employees';
import { clinicadminsLegacy } from '../schema/legacy/clinicadmins';
import { accountsLegacy } from '../schema/legacy/accounts';

/**
 * Universal Hashed Password: password123
 */
const DEFAULT_PASSWORD = '$2a$10$8.UnVuG9HHgffUDAlk8qfOuVGkqRzgVymGe07xdM0ttR9i0NcMsuG';
const DEFAULT_DOE = '1990-01-01'; // Legacy fallback for active status

export async function seedStaffRegistry(db: DbClient) {
  console.log('[Seed] Seeding Staff Registry (Legacy Tables)...');

  // 1. Seed Receptionists
  const receptionists = [
    {
      id: 101,
      name: 'Anjali Verma',
      email: 'anjali.v@mmc.com',
      mobile: '9876500101',
      mobile2: '9876500201',
      gender: 'Female',
      designation: 'Senior Front Desk',
      dept: 1,
      city: 'Chandigarh',
      address: 'House 42, Sector 15',
      about: 'Highly experienced in patient intake and scheduling.',
      dateBirth: '1992-04-12',
      dateLeft: DEFAULT_DOE,
      salaryCur: 22000,
      password: DEFAULT_PASSWORD
    },
    {
      id: 102,
      name: 'Priya Singh',
      email: 'priya.s@mmc.com',
      mobile: '9876500102',
      mobile2: '',
      gender: 'Female',
      designation: 'Junior Receptionist',
      dept: 1,
      city: 'Zirakpur',
      address: 'Global Heights, Zirakpur',
      about: 'Dedicated staff member managing morning shifts.',
      dateBirth: '1995-11-20',
      dateLeft: DEFAULT_DOE,
      salaryCur: 18000,
      password: DEFAULT_PASSWORD
    }
  ];

  for (const item of receptionists) {
    const existingEmail = await db.select().from(receptionistsLegacy).where(eq(receptionistsLegacy.email, item.email)).limit(1);
    const existingId = await db.select().from(receptionistsLegacy).where(eq(receptionistsLegacy.id, item.id)).limit(1);
    
    if (existingEmail.length === 0 && existingId.length === 0) {
      await db.insert(receptionistsLegacy).values(item as any);
      console.log(`  - Created receptionist: ${item.name}`);
    }
  }

  // 2. Seed Employees
  const employees = [
    {
      id: 201,
      name: 'Vikram Singh',
      email: 'vikram.s@mmc.com',
      mobile: '9876500201',
      mobile2: '',
      gender: 'Male',
      designation: 'IT Support Engineer',
      dept: 4,
      city: 'Chandigarh',
      address: 'Sukhna Enclave',
      about: 'Manages clinic network and system infrastructure.',
      dateBirth: '1988-03-15',
      dateLeft: DEFAULT_DOE,
      salaryCur: 35000,
      packages: 'Standard',
      password: DEFAULT_PASSWORD
    },
    {
      id: 202,
      name: 'Sanjay Gupta',
      email: 'sanjay.g@mmc.com',
      mobile: '9876500202',
      mobile2: '',
      gender: 'Male',
      designation: 'Facility Manager',
      dept: 2,
      city: 'Mohali',
      address: 'Phase 3B2, Mohali',
      about: 'Responsible for facility maintenance and logistics.',
      dateBirth: '1982-12-05',
      dateLeft: DEFAULT_DOE,
      salaryCur: 42000,
      packages: 'Premium',
      password: DEFAULT_PASSWORD
    }
  ];

  for (const item of employees) {
    const existingEmail = await db.select().from(employeesLegacy).where(eq(employeesLegacy.email, item.email)).limit(1);
    const existingId = await db.select().from(employeesLegacy).where(eq(employeesLegacy.id, item.id)).limit(1);
    
    if (existingEmail.length === 0 && existingId.length === 0) {
      await db.insert(employeesLegacy).values(item as any);
      console.log(`  - Created employee: ${item.name}`);
    }
  }

  // 3. Seed Clinic Admins
  const admins = [
    {
      id: 301,
      name: 'Ravi Kumar',
      email: 'ravi.k@mmc.com',
      mobile: '9876500301',
      mobile2: '',
      gender: 'Male',
      designation: 'Operations Head',
      dept: 1,
      city: 'Chandigarh',
      address: 'Sector 34, Chandigarh',
      about: 'Clinical operations and regulatory compliance lead.',
      dateBirth: '1980-07-22',
      dateLeft: DEFAULT_DOE,
      salaryCur: 65000,
      password: DEFAULT_PASSWORD
    },
    {
      id: 302,
      name: 'Nisha Malhotra',
      email: 'nisha.m@mmc.com',
      mobile: '9876500302',
      mobile2: '',
      gender: 'Female',
      designation: 'Facility Director',
      dept: 1,
      city: 'Mohali',
      address: 'Sector 70, Mohali',
      about: 'Oversees multiple clinic branches and HR policy.',
      dateBirth: '1984-01-30',
      dateLeft: DEFAULT_DOE,
      salaryCur: 72000,
      password: DEFAULT_PASSWORD
    }
  ];

  for (const item of admins) {
    const existingEmail = await db.select().from(clinicadminsLegacy).where(eq(clinicadminsLegacy.email, item.email)).limit(1);
    const existingId = await db.select().from(clinicadminsLegacy).where(eq(clinicadminsLegacy.id, item.id)).limit(1);
    
    if (existingEmail.length === 0 && existingId.length === 0) {
      await db.insert(clinicadminsLegacy).values(item as any);
      console.log(`  - Created clinic admin: ${item.name}`);
    }
  }

  // 4. Seed Account Managers (Accounts Table)
  const accManagers = [
    {
      id: 401,
      name: 'Deepak Bansal',
      email: 'deepak.b@mmc.com',
      mobile: '9876500401',
      mobile2: '',
      gender: 'Male',
      designation: 'Billing Manager',
      dept: 1,
      city: 'Chandigarh',
      address: 'Panchkula Sector 12',
      about: 'Financial reconciliation and patient billing lead.',
      dateBirth: '1986-09-10',
      dateLeft: DEFAULT_DOE,
      salaryCur: 45000,
      password: DEFAULT_PASSWORD
    },
    {
      id: 402,
      name: 'Rahul Aggarwal',
      email: 'rahul.a@mmc.com',
      mobile: '9876500402',
      mobile2: '',
      gender: 'Male',
      designation: 'Senior Accountant',
      dept: 1,
      city: 'Zirakpur',
      address: 'Highland Park, Zirakpur',
      about: 'Corporate accounting and tax compliance.',
      dateBirth: '1990-05-25',
      dateLeft: DEFAULT_DOE,
      salaryCur: 38000,
      password: DEFAULT_PASSWORD
    }
  ];

  for (const item of accManagers) {
    const existingEmail = await db.select().from(accountsLegacy).where(eq(accountsLegacy.email, item.email)).limit(1);
    const existingId = await db.select().from(accountsLegacy).where(eq(accountsLegacy.id, item.id)).limit(1);
    
    if (existingEmail.length === 0 && existingId.length === 0) {
      await db.insert(accountsLegacy).values(item as any);
      console.log(`  - Created account manager: ${item.name}`);
    }
  }

  console.log('[Seed] Staff Registry seeding completed.');
}
