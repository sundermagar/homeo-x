import { Router, type Request, type Response } from 'express';
import { asyncHandler } from '../middleware/async-handler';
import { StaffRepositoryPg } from '../../repositories/staff.repository.pg';
import { createLogger } from '../../../shared/logger';

const logger = createLogger('clinicadmins-router');

export function createClinicAdminsRouter(): Router {
  const router = Router();

  // GET /api/clinicadmins — List all clinic admins from public schema
  router.get('/', asyncHandler(async (req: Request, res: Response) => {
    const repo = new StaffRepositoryPg(req.publicDb);
    const result = await repo.findAll({
      category: 'clinicadmin',
      page: 1,
      limit: 100,
      search: req.query.search as string | undefined,
    });
    res.json({ success: true, data: result.data, total: result.total });
  }));

  // GET /api/clinicadmins/:id — Get single clinic admin
  router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
    const repo = new StaffRepositoryPg(req.publicDb);
    const id = parseInt(req.params['id'] as string, 10);
    const admin = await repo.findById('clinicadmin', id);
    if (!admin) {
      res.status(404).json({ success: false, error: 'Clinic admin not found' });
      return;
    }
    res.json({ success: true, data: admin });
  }));

  // POST /api/clinicadmins — Create a new clinic admin in public schema
  router.post('/', asyncHandler(async (req: Request, res: Response) => {
    const repo = new StaffRepositoryPg(req.publicDb);
    const { name, email, password, mobile, gender, designation, city, address } = req.body;

    try {
      const created = await repo.create({
        category: 'clinicadmin',
        name: name || `${email} Admin`,
        email,
        password,
        mobile: mobile || '',
        mobile2: '',
        gender: gender || 'Male',
        designation: designation || 'Clinic Administrator',
        dept: 4,
        city: city || '',
        address: address || '',
        about: '',
        clinicId: req.body.clinicId || null,
      } as any);

      res.status(201).json({ success: true, data: created });
    } catch (err: any) {
      logger.error({ err }, 'Failed to create clinic admin');
      res.status(400).json({ success: false, error: err.message });
    }
  }));

  // PUT /api/clinicadmins/:id — Update clinic admin
  router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
    const repo = new StaffRepositoryPg(req.publicDb);
    const id = parseInt(req.params['id'] as string, 10);
    const updated = await repo.update('clinicadmin', id, req.body);
    if (!updated) {
      res.status(404).json({ success: false, error: 'Clinic admin not found' });
      return;
    }
    res.json({ success: true, data: updated });
  }));

  // DELETE /api/clinicadmins/:id — Soft delete clinic admin
  router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
    const repo = new StaffRepositoryPg(req.publicDb);
    const id = parseInt(req.params['id'] as string, 10);
    const deleted = await repo.delete('clinicadmin', id);
    if (!deleted) {
      res.status(404).json({ success: false, error: 'Clinic admin not found' });
      return;
    }
    res.json({ success: true, message: 'Clinic admin deleted successfully' });
  }));

  return router;
}
