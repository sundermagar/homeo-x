import { Router, type Request, type Response } from 'express';
import { asyncHandler } from '../middleware/async-handler.js';
import { authMiddleware } from '../middleware/auth.js';
import { CourierRepositoryPg } from '../../repositories/courier.repository.pg.js';
import { DispensaryRepositoryPg } from '../../repositories/dispensary.repository.pg.js';
import { sql } from 'drizzle-orm';

export function createLogisticsRouter(): Router {
  const router = Router();
  router.use(authMiddleware);

  const getRepo = (req: Request) => new CourierRepositoryPg(req.tenantDb);

  // GET /api/logistics/patient/:regid
  router.get(
    '/patient/:regid',
    asyncHandler(async (req: Request, res: Response) => {
      const regid = parseInt(req.params.regid as string, 10);
      const repo = getRepo(req);
      const shipments = await repo.getByPatient(regid);
      res.json({ success: true, data: shipments });
    })
  );

  // GET /api/logistics/stickers/pending
  router.get(
    '/stickers/pending',
    asyncHandler(async (req: Request, res: Response) => {
      const date = req.query.date as string | undefined;
      const dispensaryRepo = new DispensaryRepositoryPg(req.tenantDb);
      const clinicId = (req as any).user?.contextId || null;
      const stickers = await dispensaryRepo.getPendingStickers(clinicId, date);
      res.json({ success: true, data: stickers });
    })
  );

  // POST /api/logistics/stickers/print
  router.post(
    '/stickers/print',
    asyncHandler(async (req: Request, res: Response) => {
      const { randId } = req.body;
      const dispensaryRepo = new DispensaryRepositoryPg(req.tenantDb);
      await dispensaryRepo.markStickersPrinted(randId);
      res.json({ success: true });
    })
  );

  // GET /api/logistics/dispensary-dashboard
  router.get(
    '/dispensary-dashboard',
    asyncHandler(async (req: Request, res: Response) => {
      const dispensaryRepo = new DispensaryRepositoryPg(req.tenantDb);
      const clinicId = (req as any).user?.contextId || null;
      const dashboardData = await dispensaryRepo.getDispensaryDashboard(clinicId);
      res.json({ success: true, data: dashboardData });
    })
  );

  // POST /api/logistics/stickers/dispense
  router.post(
    '/stickers/dispense',
    asyncHandler(async (req: Request, res: Response) => {
      const { randId } = req.body;
      const dispensaryRepo = new DispensaryRepositoryPg(req.tenantDb);
      await dispensaryRepo.markStickersDispensed(randId);
      res.json({ success: true });
    })
  );

  // GET /api/logistics/pending
  router.get(
    '/pending',
    asyncHandler(async (req: Request, res: Response) => {
      const repo = getRepo(req);
      const shipments = await repo.getQueue(null);
      res.json({ success: true, data: shipments });
    })
  );

  // POST /api/logistics
  router.post(
    '/',
    asyncHandler(async (req: Request, res: Response) => {
      const repo = getRepo(req);
      const { regid, type, notes } = req.body;
      const dateNow = new Date().toISOString().split('T')[0]!.replace(/-/g, '');
      const shipment = await repo.create({
        caseId: regid,
        postType: type === 'PICKUP' ? 'Pickup' : 'Courier',
        randId: `${dateNow}${regid}`
      });
      res.status(201).json({ success: true, data: shipment });
    })
  );

  // PATCH /api/logistics/:id
  router.patch(
    '/:id',
    asyncHandler(async (req: Request, res: Response) => {
      const id = parseInt(req.params.id as string, 10);
      const repo = getRepo(req);
      const shipment = await repo.assign({ ...req.body, id });
      res.json({ success: true, data: shipment });
    })
  );

  // GET /api/logistics/couriers
  router.get(
    '/couriers',
    asyncHandler(async (req: Request, res: Response) => {
      const courierRepo = new CourierRepositoryPg(req.tenantDb);
      // Fetch all shipments (recent 100)
      const shipments = await courierRepo.getAllShipments(null);
      res.json({ success: true, data: shipments });
    })
  );

  // DELETE /api/logistics/:id
  router.delete(
    '/:id',
    asyncHandler(async (req: Request, res: Response) => {
      const id = parseInt(req.params.id as string, 10);
      const repo = getRepo(req);
      await repo.delete(id);
      res.json({ success: true });
    })
  );

  return router;
}
