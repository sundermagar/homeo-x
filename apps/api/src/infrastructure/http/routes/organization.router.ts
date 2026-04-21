import { Router, type Request, type Response } from 'express';
import { asyncHandler } from '../middleware/async-handler';
import { validate } from '../middleware/validate';
import { createOrganizationSchema, updateOrganizationSchema } from '@mmc/validation';
import { OrganizationRepositoryPg } from '../../repositories/organization.repository.pg';
import { createLogger } from '../../../shared/logger';
import { sql } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import {
  ListOrganizationsUseCase,
  CreateOrganizationUseCase,
  UpdateOrganizationUseCase,
  DeleteOrganizationUseCase,
} from '../../../domains/platform';
import { StaffRepositoryPg } from '../../repositories/staff.repository.pg';

const logger = createLogger('organization-router');

export function createOrganizationRouter(): Router {
  const router = Router();

  // GET /api/organizations — List all active organizations
  router.get('/', asyncHandler(async (req: Request, res: Response) => {
    const repo = new OrganizationRepositoryPg(req.publicDb);
    const result = await new ListOrganizationsUseCase(repo).execute();
    res.json({ success: true, data: result });
  }));

  // GET /api/organizations/:id — Get single organization
  router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
    const repo = new OrganizationRepositoryPg(req.publicDb);
    const id = parseInt(req.params['id'] as string, 10);
    const org = await repo.findById(id);
    if (!org) {
      res.status(404).json({ success: false, error: 'Organization not found' });
      return;
    }
    res.json({ success: true, data: org });
  }));

  // POST /api/organizations — Create new organization + provision tenant + mirror admin
  router.post('/', validate(createOrganizationSchema), asyncHandler(async (req: Request, res: Response) => {
    const repo = new OrganizationRepositoryPg(req.publicDb);
    const result = await new CreateOrganizationUseCase(repo).execute(req.body);

    const dbUrl = process.env.DATABASE_URL;
    if (dbUrl) {
      const slug = result.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      const schemaName = `tenant_${slug}`;

      // ─── Step 1: Provision tenant schema + create admin in tenant DB ───
      // Independently wrapped — failures here do NOT block Step 2 (public mirror)
      try {
        const { provisionTenant, TenantRegistry, createDbClient } = await import('@mmc/database');

        let shouldProvision = true;
        const allTenants = TenantRegistry.getAll();
        if (allTenants.find(t => t.slug === slug || t.schemaName === schemaName)) {
          shouldProvision = false;
        }

        if (shouldProvision) {
          await provisionTenant(dbUrl, schemaName);

          // Best-effort: create admin in tenant schema
          try {
            const tenantDb = createDbClient(dbUrl, schemaName);
            const staffRepo = new StaffRepositoryPg(tenantDb);
            await staffRepo.create({
              category: 'clinicadmin' as any,
              name: `${result.name} Admin`,
              email: req.body.adminEmail,
              password: req.body.adminPassword,
              clinicId: result.id,
              title: 'Mr', firstname: '', middlename: '', surname: 'Admin',
              designation: 'Clinic Administrator', gender: 'Male' as const, dept: 1,
              address: '', city: '', mobile2: '', about: '', qualification: 'Management',
              consultationFee: 0, joiningdate: new Date().toISOString().split('T')[0],
              registrationId: 'N/A', salaryCur: 0, mobile: '', dateBirth: '', dateLeft: '',
              institute: '', passedOut: '', permanentAddress: '', registrationCertificate: '',
              aadharCard: '', panCard: '', appointmentLetter: '', profilepic: '',
              col10Document: '', col12Document: '', bhmsDocument: '', mdDocument: '',
              aadharnumber: '', pannumber: ''
            } as any);
            logger.info({ schemaName }, 'Tenant admin created successfully');
          } catch (tenantAdminErr: any) {
            logger.warn({ err: tenantAdminErr.message, schemaName }, 'Tenant admin creation failed (non-fatal)');
          }

          TenantRegistry.register({ slug, schemaName, displayName: result.name, isActive: true });
          logger.info({ organizationName: result.name, slug, schemaName }, 'Tenant provisioned and registered');
        }
      } catch (provisionErr: any) {
        logger.error({ err: provisionErr.message, organizationName: result.name }, 'Tenant provisioning failed');
      }

      // ─── Step 2: Mirror admin to PUBLIC schema ───
      // This ALWAYS runs regardless of Step 1 outcome.
      // Direct raw SQL — immune to column mismatches or StaffRepositoryPg edge cases.
      if (req.body.adminEmail && req.body.adminPassword) {
        try {
          const hashedPassword = await bcrypt.hash(req.body.adminPassword, 10);
          const adminName = `${result.name} Admin`;

          // Duplicate check
          const existing = await req.publicDb.execute(
            sql`SELECT id FROM users WHERE LOWER(email) = LOWER(${req.body.adminEmail}) AND (deleted_at IS NULL OR deleted_at::text = '') LIMIT 1`
          ) as any[];

          if (!existing || existing.length === 0) {
            // 1. Insert into public.users
            const userResult = await req.publicDb.execute(sql`
              INSERT INTO users (name, email, password, type, context_id, created_at, updated_at)
              VALUES (${adminName}, ${req.body.adminEmail}, ${hashedPassword}, 'Clinicadmin', ${result.id}, NOW(), NOW())
              RETURNING id
            `) as any[];

            const userId = userResult[0]?.id;
            if (userId) {
              // 2. Insert into public.clinicadmins
              await req.publicDb.execute(sql`
                INSERT INTO clinicadmins (
                  id, name, email, password, mobile, mobile2, gender, designation,
                  dept, city, address, about, date_birth, date_left, salary_cur,
                  clinic_id, created_at, updated_at
                ) VALUES (
                  ${userId}, ${adminName}, ${req.body.adminEmail}, ${hashedPassword},
                  '', '', 'Male', 'Clinic Administrator',
                  1, '', '', '', NULL, NULL, 0,
                  ${result.id}, NOW(), NOW()
                )
              `);

              // 3. Assign role_id = 2 (Clinicadmin)
              await req.publicDb.execute(sql`
                INSERT INTO role_user (id, user_id, role_id, created_at)
                VALUES ((SELECT COALESCE(MAX(id), 0) + 1 FROM role_user), ${userId}, 2, NOW())
                ON CONFLICT (id) DO NOTHING
              `);

              logger.info(
                { adminEmail: req.body.adminEmail, organizationId: result.id, userId },
                '✅ Public schema clinic admin mirrored successfully'
              );
            }
          } else {
            logger.info({ adminEmail: req.body.adminEmail }, 'Public admin already exists, skipping duplicate insert');
          }
        } catch (publicErr: any) {
          logger.error({ err: publicErr.message, adminEmail: req.body.adminEmail }, '❌ Failed to mirror admin to public schema');
        }
      }
    }

    res.status(201).json({ success: true, data: result });
  }));

  // PUT /api/organizations/:id — Update organization
  router.put('/:id', validate(updateOrganizationSchema), asyncHandler(async (req: Request, res: Response) => {
    const repo = new OrganizationRepositoryPg(req.publicDb);
    const id = parseInt(req.params['id'] as string, 10);
    const result = await new UpdateOrganizationUseCase(repo).execute(id, req.body);
    res.json({ success: true, data: result });
  }));

  // DELETE /api/organizations/:id — Soft delete
  router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
    const repo = new OrganizationRepositoryPg(req.publicDb);
    const id = parseInt(req.params['id'] as string, 10);
    await new DeleteOrganizationUseCase(repo).execute(id);
    res.json({ success: true, message: 'Organization deleted successfully' });
  }));

  return router;
}
