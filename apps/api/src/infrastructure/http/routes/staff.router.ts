import { Router } from 'express';
import type { Request, Response, Router as IRouter } from 'express';
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

export const staffRouter: IRouter = Router();

function getRepo(req: Request) {
  return new StaffRepositoryPg(req.tenantDb);
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
    const { search, page = '1', limit = '30' } = req.query;
    const repo = getRepo(req);
    const uc = new ListStaffUseCase(repo);
    const result = await uc.execute({
      category,
      page: Number(page),
      limit: Number(limit),
      search: search as string,
    });
    if (result.success) {
      res.json({ success: true, data: result.data.data, total: result.data.total });
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
    const repo = getRepo(req);
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

// POST /api/staff
staffRouter.post('/', async (req: Request, res: Response) => {
  try {
    const parsed = createStaffSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, message: 'Validation failed', errors: parsed.error.flatten().fieldErrors });
      return;
    }
    const repo = getRepo(req);
    const uc = new CreateStaffUseCase(repo);
    const result = await uc.execute(parsed.data);
    if (result.success) {
      res.status(201).json({ success: true, data: result.data });
    } else {
      res.status(400).json({ success: false, message: result.error });
    }
  } catch (err: any) {
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
      res.status(400).json({ success: false, message: 'Validation failed', errors: parsed.error.flatten().fieldErrors });
      return;
    }
    const repo = getRepo(req);
    const uc = new UpdateStaffUseCase(repo);
    const result = await uc.execute(category, id, parsed.data);
    if (result.success) {
      res.json({ success: true, data: result.data });
    } else {
      res.status(404).json({ success: false, message: result.error });
    }
  } catch (err: any) {
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
    const repo = getRepo(req);
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
