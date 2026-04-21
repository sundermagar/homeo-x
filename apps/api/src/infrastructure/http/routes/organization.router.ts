import { Router, type Request, type Response } from 'express';
import { asyncHandler } from '../middleware/async-handler';
import { validate } from '../middleware/validate';
import { createOrganizationSchema, updateOrganizationSchema } from '@mmc/validation';
import { OrganizationRepositoryPg } from '../../repositories/organization.repository.pg';
import { createLogger } from '../../../shared/logger';
const logger = createLogger('organization-router');
import {  ListOrganizationsUseCase,
  CreateOrganizationUseCase,
  UpdateOrganizationUseCase,
  DeleteOrganizationUseCase,
} from '../../../domains/platform';
import bcrypt from 'bcryptjs';
import { StaffRepositoryPg } from '../../repositories/staff.repository.pg';

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

  // POST /api/organizations — Create new organization
  router.post('/', validate(createOrganizationSchema), asyncHandler(async (req: Request, res: Response) => {
    const repo = new OrganizationRepositoryPg(req.publicDb);
    const result = await new CreateOrganizationUseCase(repo).execute(req.body);

    const dbUrl = process.env.DATABASE_URL;
    if (dbUrl) {
      try {
        const { provisionTenant, TenantRegistry } = await import('@mmc/database');
        const slug = result.name.toLowerCase().replace(/[^a-z0-9]/g, '');
        const schemaName = `tenant_${slug}`;
        
        let shouldProvision = true;
        const allTenants = TenantRegistry.getAll();
        if (allTenants.find(t => t.slug === slug || t.schemaName === schemaName)) {
           shouldProvision = false;
        }
        
        if (shouldProvision) {
          await provisionTenant(dbUrl, schemaName);
          
          // CRITICAL: Create the initial administrator user in the new schema
          const { createDbClient } = await import('@mmc/database');
          const tenantDb = createDbClient(dbUrl, schemaName);
          const staffRepo = new StaffRepositoryPg(tenantDb);
          
          // Setup default fields to satisfy the strict Staff schema
          const adminDefaults = {
            title: 'Mr',
            firstname: '',
            middlename: '',
            surname: 'Admin',
            designation: 'Clinic Administrator',
            gender: 'Male' as const,
            dept: 1,
            address: '',
            city: '',
            mobile2: '',
            about: '',
            qualification: 'Management',
            consultationFee: 0,
            joiningdate: new Date().toISOString().split('T')[0],
            registrationId: 'N/A',
            salaryCur: 0,
            mobile: '',
            dateBirth: '',
            dateLeft: '',
            institute: '',
            passedOut: '',
            permanentAddress: '',
            registrationCertificate: '',
            aadharCard: '',
            panCard: '',
            appointmentLetter: '',
            profilepic: '',
            col10Document: '',
            col12Document: '',
            bhmsDocument: '',
            mdDocument: '',
            aadharnumber: '',
            pannumber: ''
          };

          await staffRepo.create({
            ...adminDefaults,
            category: 'clinicadmin' as any,
            name: `${result.name} Admin`,
            email: req.body.adminEmail,
            password: req.body.adminPassword,
            clinicId: result.id
          } as any);

          // MIRROR: Also create in the public schema for the Platform Dashboard global view
          const publicStaffRepo = new StaffRepositoryPg(req.publicDb);
          await publicStaffRepo.create({
            ...adminDefaults,
            category: 'clinicadmin' as any,
            name: `${result.name} Admin`,
            email: req.body.adminEmail,
            password: req.body.adminPassword,
            clinicId: result.id
          } as any);

          TenantRegistry.register({
            slug,
            schemaName,
            displayName: result.name,
            isActive: true
          });
          logger.info({ organizationName: result.name, slug, schemaName }, 'Successfully provisioned new tenant and global administrator record');
        }
      } catch (err: any) {
        logger.error({ err, organizationName: result.name }, 'Failed to provision tenant DB');
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
