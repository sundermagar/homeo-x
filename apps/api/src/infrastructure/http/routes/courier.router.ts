import { Router, type Request, type Response } from 'express';
import { asyncHandler } from '../middleware/async-handler.js';
import { authMiddleware } from '../middleware/auth.js';
import { CourierRepositoryPg } from '../../repositories/courier.repository.pg.js';

export function createCourierRouter(): Router {
  const router = Router();
  router.use(authMiddleware);

  const getRepo = (req: Request) => new CourierRepositoryPg(req.tenantDb);

  /**
   * GET /api/courier/queue?date=YYYY-MM-DD
   * Staff view: today's courier/pickup queue, filtered by clinic.
   * Matches legacy CouriermedicineController::index()
   */
  router.get(
    '/queue',
    asyncHandler(async (req: Request, res: Response) => {
      const repo = getRepo(req);
      const user = (req as any).user;
      const date = req.query.date as string | undefined;
      
      // Determine clinic_id based on user role (matches legacy logic)
      let clinicId: number | null = null;
      if (user?.contextId) {
        clinicId = user.contextId;
      }

      const queue = await repo.getQueue(clinicId, date);
      res.json({ success: true, data: queue });
    })
  );

  /**
   * GET /api/courier/patient/:regid
   * Courier history for a specific patient.
   * Matches legacy CouriermedicineController::getcourierdetails()
   */
  router.get(
    '/patient/:regid',
    asyncHandler(async (req: Request, res: Response) => {
      const regid = parseInt(req.params.regid as string, 10);
      const repo = getRepo(req);
      const entries = await repo.getByPatient(regid);
      res.json({ success: true, data: entries });
    })
  );

  /**
   * GET /api/courier/unread-count
   * Count of unread courier entries (for notification badge).
   */
  router.get(
    '/unread-count',
    asyncHandler(async (req: Request, res: Response) => {
      const repo = getRepo(req);
      const count = await repo.getUnreadCount();
      res.json({ success: true, data: { count } });
    })
  );

  /**
   * POST /api/courier
   * Create a courier_medicine entry when prescription is saved.
   * Matches legacy Couriermedicine::create() in MedicalcasesController::store()
   */
  router.post(
    '/',
    asyncHandler(async (req: Request, res: Response) => {
      const repo = getRepo(req);
      const entry = await repo.create(req.body);
      res.status(201).json({ success: true, data: entry });
    })
  );

  /**
   * PATCH /api/courier/:id/assign
   * Assign courier details (POD, company) or confirm pickup.
   * Matches legacy CouriermedicineController::savepackages()
   */
  router.patch(
    '/:id/assign',
    asyncHandler(async (req: Request, res: Response) => {
      const id = parseInt(req.params.id as string, 10);
      const repo = getRepo(req);
      const entry = await repo.assign({ ...req.body, id });
      res.json({ success: true, data: entry });
    })
  );

  /**
   * GET /api/courier/:id/sms-detail
   * Get pre-filled SMS/WhatsApp message for a courier entry.
   * Matches legacy CouriermedicineController::getmedicinedetail()
   */
  router.get(
    '/:id/sms-detail',
    asyncHandler(async (req: Request, res: Response) => {
      const id = parseInt(req.params.id as string, 10);
      const repo = getRepo(req);
      const detail = await repo.getMedicineDetail(id);
      if (!detail) {
        res.status(404).json({ success: false, error: 'Courier entry not found' });
      } else {
        res.json({ success: true, data: detail });
      }
    })
  );

  /**
   * POST /api/courier/mark-read
   * Mark all unread entries as read.
   * Matches legacy CouriermedicineController::updatenotify()
   */
  router.post(
    '/mark-read',
    asyncHandler(async (req: Request, res: Response) => {
      const repo = getRepo(req);
      const count = await repo.markAllRead();
      res.json({ success: true, data: { updated: count } });
    })
  );

  return router;
}
