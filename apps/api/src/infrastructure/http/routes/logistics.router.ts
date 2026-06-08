import { Router, type Request, type Response } from 'express';
import { asyncHandler } from '../middleware/async-handler.js';
import { authMiddleware } from '../middleware/auth.js';
import { CourierRepositoryPg } from '../../repositories/courier.repository.pg.js';
import { sql } from 'drizzle-orm';
import { WhatsAppCloudGateway } from '../../communication/whatsapp-cloud-gateway.js';
import { WhatsAppRepositoryPG } from '../../repositories/whatsapp.repository.pg.js';
import { SendWhatsAppTemplateUseCase } from '../../../domains/communication/use-cases/send-whatsapp-template.use-case.js';
import { createLogger } from '../../../shared/logger.js';

const logger = createLogger('logistics-router');

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
    }),
  );

  // GET /api/logistics/pending
  router.get(
    '/pending',
    asyncHandler(async (req: Request, res: Response) => {
      const repo = getRepo(req);
      const shipments = await repo.getQueue(null);
      res.json({ success: true, data: shipments });
    }),
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
        randId: `${dateNow}${regid}`,
      });
      res.status(201).json({ success: true, data: shipment });
    }),
  );

  // PATCH /api/logistics/:id
  router.patch(
    '/:id',
    asyncHandler(async (req: Request, res: Response) => {
      const id = parseInt(req.params.id as string, 10);
      const repo = getRepo(req);
      const shipment = await repo.assign({ ...req.body, id });

      // Automatically send WhatsApp Courier tracking message if dispatched
      if (shipment.isAssign === 1 && shipment.pickup !== 1) {
        try {
          const details = await repo.getMedicineDetail(id);
          if (details && details.phone) {
            const waRepo = new WhatsAppRepositoryPG(req.tenantDb);
            const waGateway = new WhatsAppCloudGateway(waRepo);
            const waUseCase = new SendWhatsAppTemplateUseCase(waGateway, waRepo);

            // Using the legacy message or structured template if available
            // Note: Make sure "medicine_dispatched" template is approved in Meta if you use that name.
            // Using a generic custom message format here to ensure delivery with fallback text if template missing.
            await waUseCase.execute({
              phone: details.phone,
              templateName: 'medicine_dispatched',
              language: 'en',
              components: [
                {
                  type: 'body',
                  parameters: [
                    { type: 'text', text: details.firstName || 'Patient' },
                    { type: 'text', text: details.courier || 'Courier' },
                    { type: 'text', text: details.pcd || 'N/A' },
                  ]
                }
              ]
            });
            logger.info(`WhatsApp dispatch notification sent to ${details.phone} for shipment ${id}`);
          }
        } catch (err: any) {
          logger.error(`Failed to send WhatsApp dispatch notification: ${err.message}`);
        }
      }

      res.json({ success: true, data: shipment });
    }),
  );

  // GET /api/logistics/couriers
  router.get(
    '/couriers',
    asyncHandler(async (req: Request, res: Response) => {
      const courierRepo = new CourierRepositoryPg(req.tenantDb);
      // Fetch all shipments (recent 100)
      const shipments = await courierRepo.getAllShipments(null);
      res.json({ success: true, data: shipments });
    }),
  );

  // DELETE /api/logistics/:id
  router.delete(
    '/:id',
    asyncHandler(async (req: Request, res: Response) => {
      const id = parseInt(req.params.id as string, 10);
      const repo = getRepo(req);
      await repo.delete(id);
      res.json({ success: true });
    }),
  );

  return router;
}
