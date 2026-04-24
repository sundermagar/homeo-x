import { Router } from 'express';
import type { Request, Response, Router as IRouter } from 'express';
import { sql } from 'drizzle-orm';
import { createStaffSchema, updateStaffSchema, staffCategoryEnum } from '@mmc/validation';
import type { StaffCategory } from '@mmc/types';
import { StaffRepositoryPg } from '../../repositories/staff.repository.pg';
import {
  ListStaffUseCase,
  GetStaffUseCase,
  CreateStaffUseCase,
  UpdateStaffUseCase,
  DeleteStaffUseCase,
} from '../../../domains/staff';
import { createLogger } from '../../../shared/logger';
import { upload } from '../middleware/upload';
import { Role } from '@mmc/types';
import { eq } from 'drizzle-orm';
import { accounts, users } from '@mmc/database/schema';
import type { DbClient } from '@mmc/database';

const logger = createLogger('staff-router');

export const staffRouter: IRouter = Router();

async function getRepo(req: Request) {
  return new StaffRepositoryPg(req.tenantDb);
}

const USER_COLUMNS: { col: string; type: string }[] = [
  { col: 'title', type: 'text' },
  { col: 'firstname', type: 'text' },
  { col: 'middlename', type: 'text' },
  { col: 'surname', type: 'text' },
  { col: 'gender', type: 'text' },
  { col: 'mobile', type: 'text' },
  { col: 'mobile2', type: 'text' },
  { col: 'city', type: 'text' },
  { col: 'address', type: 'text' },
  { col: 'permanent_address', type: 'text' },
  { col: 'about', type: 'text' },
  { col: 'date_birth', type: 'date' },
  { col: 'date_left', type: 'date' },
  { col: 'joiningdate', type: 'date' },
  { col: 'designation', type: 'text' },
  { col: 'dept', type: 'integer' },
  { col: 'qualification', type: 'text' },
  { col: 'institute', type: 'text' },
  { col: 'passed_out', type: 'text' },
  { col: 'registration_id', type: 'text' },
  { col: 'consultation_fee', type: 'real' },
  { col: 'salary_cur', type: 'real' },
  { col: 'aadharnumber', type: 'text' },
  { col: 'pannumber', type: 'text' },
  { col: 'profilepic', type: 'text' },
  { col: 'registration_certificate', type: 'text' },
  { col: 'aadhar_card', type: 'text' },
  { col: 'pan_card', type: 'text' },
  { col: 'appointment_letter', type: 'text' },
  { col: '10_document', type: 'text' },
  { col: '12_document', type: 'text' },
  { col: 'bhms_document', type: 'text' },
  { col: 'role_id', type: 'integer' },
  { col: 'role_name', type: 'text' },
  { col: 'is_active', type: 'boolean' },
  { col: 'phone', type: 'text' },
  { col: 'md_document', type: 'text' },
];

/**
 * Ensures the users table has all columns needed for staff auth mirroring.
 * Uses raw SQL with template literals — safe against SQL injection (col names are static).
 */
async function ensureUsersColumns(db: DbClient): Promise<void> {
  for (const { col, type } of USER_COLUMNS) {
    try {
      const typeClause = type === 'integer' ? 'integer' : type === 'real' ? 'real' : 'text';
      const defaultClause = type === 'real' ? ' DEFAULT 0' : type === 'integer' ? ' DEFAULT 0' : '';
      await db.execute(sql.raw(`ALTER TABLE users ADD COLUMN IF NOT EXISTS "${col}" ${typeClause}${defaultClause}`));
    } catch {
      // column already exists or other issue — skip
    }
  }
}

function parseCategory(raw: unknown): StaffCategory | null {
  const parsed = staffCategoryEnum.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

// GET /api/staff?category=doctor&search=&page=&limit=
staffRouter.get('/', async (req: Request, res: Response) => {
  try {
    const category = parseCategory(req.query.category);
    if (!category) {
      res.status(400).json({ success: false, message: 'Invalid or missing category. Must be one of: doctor, employee, receptionist, clinicadmin, account' });
      return;
    }
    const { search, page = '1', limit = '30', sortBy, sortOrder } = req.query;
    const repo = await getRepo(req);
    const uc = new ListStaffUseCase(repo);

    // Pass contextId from logged in user as clinicId, unless they are a superadmin
    const user = (req as any).user;
    const isSuperAdmin = user?.type === Role.Admin;
    const clinicId = isSuperAdmin ? undefined : user?.contextId;

    const result = await uc.execute({
      category,
      page: Number(page),
      limit: Number(limit),
      search: search as string,
      clinicId,
      sortBy: sortBy as string,
      sortOrder: sortOrder as 'ASC' | 'DESC',
    });
    if (result.success) {
      res.json({ 
        success: true, 
        data: result.data.data, 
        total: result.data.total,
        activeCount: result.data.activeCount
      });
    } else {
      res.status(500).json({ success: false, message: result.error });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/staff/:id?category=doctor
staffRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const category = parseCategory(req.query.category);
    if (!category) {
      res.status(400).json({ success: false, message: 'Missing category query param' });
      return;
    }
    const id = Number(req.params.id);
    if (isNaN(id)) { res.status(400).json({ success: false, message: 'Invalid id' }); return; }
    const repo = await getRepo(req);
    const uc = new GetStaffUseCase(repo);
    const result = await uc.execute(category, id);
    if (result.success) {
      res.json({ success: true, data: result.data });
    } else {
      res.status(404).json({ success: false, message: result.error });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/staff/upload
staffRouter.post('/upload', upload.single('file'), (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, message: 'No file uploaded' });
      return;
    }
    logger.info(`File uploaded successfully: ${req.file.filename}`);
    res.json({ success: true, path: `/uploads/${req.file.filename}` });
  } catch (err: any) {
    logger.error(`Error in file upload: ${err.stack}`);
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/staff
staffRouter.post('/', async (req: Request, res: Response) => {
  try {
    const parsed = createStaffSchema.safeParse(req.body);
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      console.error(`[StaffRouter] VALIDATION FAILED for category: ${req.body.category}`, JSON.stringify(fieldErrors, null, 2));
      res.status(400).json({ success: false, message: 'Validation failed', errors: fieldErrors });
      return;
    }
    logger.info(`Creating new staff member: ${parsed.data.name} (Category: ${parsed.data.category})`);

    // Ensure users table has all required columns before mirroring
    await ensureUsersColumns(req.tenantDb);

    const repo = await getRepo(req);
    const uc = new CreateStaffUseCase(repo);

    // Force clinicId to match the admin's contextId for proper multi-tenant isolation
    const staffData = {
      ...parsed.data,
      clinicId: (req as any).user?.contextId || parsed.data.clinicId
    };

    const result = await uc.execute(staffData);
    if (result.success) {
      logger.info(`Successfully created staff member: ${result.data.id}`);
      res.status(201).json({ success: true, data: result.data });
    } else {
      logger.error(`Failed to create staff member: ${result.error}`);
      res.status(400).json({ success: false, message: result.error });
    }
  } catch (err: any) {
    logger.error(`Error in POST /api/staff: ${err.stack}`);
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/staff/:id?category=doctor
staffRouter.put('/:id', async (req: Request, res: Response) => {
  try {
    const category = parseCategory(req.query.category);
    if (!category) {
      res.status(400).json({ success: false, message: 'Missing category query param' });
      return;
    }
    const id = Number(req.params.id);
    if (isNaN(id)) { res.status(400).json({ success: false, message: 'Invalid id' }); return; }
    const parsed = updateStaffSchema.safeParse(req.body);
    if (!parsed.success) {
      logger.error(`Validation failed for staff update ${id}: ${JSON.stringify(parsed.error.flatten().fieldErrors)}`);
      res.status(400).json({ success: false, message: 'Validation failed', errors: parsed.error.flatten().fieldErrors });
      return;
    }
    logger.info(`Updating staff member: ${id} (Category: ${category})`);
    const repo = await getRepo(req);
    const uc = new UpdateStaffUseCase(repo);
    const result = await uc.execute(category, id, parsed.data);
    if (result.success) {
      logger.info(`Successfully updated staff member: ${id}`);
      res.json({ success: true, data: result.data });
    } else {
      logger.error(`Failed to update staff member ${id}: ${result.error}`);
      res.status(404).json({ success: false, message: result.error });
    }
  } catch (err: any) {
    logger.error(`Error in PUT /api/staff/${req.params.id}: ${err.stack}`);
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/staff/:id?category=doctor
staffRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const category = parseCategory(req.query.category);
    if (!category) {
      res.status(400).json({ success: false, message: 'Missing category query param' });
      return;
    }
    const id = Number(req.params.id);
    if (isNaN(id)) { res.status(400).json({ success: false, message: 'Invalid id' }); return; }
    const repo = await getRepo(req);
    const uc = new DeleteStaffUseCase(repo);
    const result = await uc.execute(category, id);
    if (result.success) {
      res.json({ success: true, message: 'Staff member deleted' });
    } else {
      res.status(404).json({ success: false, message: result.error });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});