import { Router, type Request, type Response } from 'express';
import { asyncHandler } from '../middleware/async-handler.js';
import { authMiddleware } from '../middleware/auth.js';
import { validate, validateQuery } from '../middleware/validate.js';
import { BillingRepositoryPg } from '../../repositories/billing.repository.pg.js';
import {
  CreateBillUseCase,
  CreateCustomBillUseCase,
  ListBillsUseCase,
  GetDailyCollectionUseCase,
  GetPatientBillsUseCase,
} from '../../../domains/billing/index.js';
import { createBillSchema, listBillsQuerySchema, createCustomBillSchema } from '@mmc/validation';
import type { DbClient } from '@mmc/database';

export function createBillingRouter(): Router {
  const router = Router();
  router.use(authMiddleware);

  // Helper to get repository for current tenant
  const getRepo = (req: Request) => new BillingRepositoryPg(req.tenantDb);

  // GET /api/billing?regid=&date=&page=&limit=
  router.get(
    '/',
    validateQuery(listBillsQuerySchema),
    asyncHandler(async (req: Request, res: Response) => {
      const clinicId = (req as any).user?.contextId;
      const useCase = new ListBillsUseCase(getRepo(req));
      const result = await useCase.execute(req.query as any, clinicId);
      if (!result.success) {
        res.status(400).json({ success: false, error: result.error });
        return;
      }
      res.json({ success: true, ...result.data });
    }),
  );

  // GET /api/billing/daily?date=YYYY-MM-DD
  router.get(
    '/daily',
    asyncHandler(async (req: Request, res: Response) => {
      const clinicId = (req as any).user?.contextId;
      const useCase = new GetDailyCollectionUseCase(getRepo(req));
      const result = await useCase.execute(req.query.date as string | undefined, clinicId);
      if (!result.success) {
        res.status(400).json({ success: false, error: result.error });
        return;
      }
      res.json({ success: true, data: result.data });
    }),
  );

  // GET /api/billing/patient/:regid
  router.get(
    '/patient/:regid',
    asyncHandler(async (req: Request, res: Response) => {
      const regid = parseInt(req.params.regid as string, 10);
      if (isNaN(regid)) {
        res.status(400).json({ success: false, error: 'Invalid regid' });
        return;
      }

      const useCase = new GetPatientBillsUseCase(getRepo(req));
      const result = await useCase.execute(regid);
      if (!result.success) {
        res.status(400).json({ success: false, error: result.error });
        return;
      }
      res.json({ success: true, data: result.data });
    }),
  );

  // POST /api/billing
  router.post(
    '/',
    validate(createBillSchema),
    asyncHandler(async (req: Request, res: Response) => {
      const useCase = new CreateBillUseCase(getRepo(req));
      const result = await useCase.execute(req.body);
      if (!result.success) {
        res.status(400).json({ success: false, error: result.error });
        return;
      }
      res.status(201).json({ success: true, data: result.data });
    }),
  );

  // POST /api/billing/custom — create a custom/manual bill
  router.post(
    '/custom',
    validate(createCustomBillSchema),
    asyncHandler(async (req: Request, res: Response) => {
      const useCase = new CreateCustomBillUseCase(getRepo(req));
      const result = await useCase.execute(req.body);
      if (!result.success) {
        res.status(400).json({ success: false, error: result.error });
        return;
      }
      res.status(201).json({ success: true, data: result.data });
    }),
  );

  // GET /api/billing/pdf/:id
  router.get(
    '/pdf/:id',
    asyncHandler(async (req: Request, res: Response) => {
      const id = parseInt(req.params.id as string, 10);
      if (isNaN(id)) {
        res.status(400).json({ success: false, error: 'Invalid bill ID' });
        return;
      }

      // We dynamically import the pdf service to avoid tight coupling 
      const { PdfkitServiceAdapter } = await import('../../pdf/pdfkit.service.js');
      const pdfService = new PdfkitServiceAdapter();
      
      const repo = getRepo(req);
      const bills = await repo.findAll({ limit: 100, page: 1 }); // Simplistic lookup since findById is not purely defined in findMany for billing
      const bill = bills.data.find((b: any) => b.id === id);

      if (!bill) {
        res.status(404).json({ success: false, error: 'Bill not found' });
        return;
      }

      const filename = `invoice-${bill.id}.pdf`;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

      await pdfService.generateBill(res, {
        clinicName: (req as any).tenantDb?.schemaName || 'Clinic Admin',
        patientName: 'Patient Name', // A proper join is required to get Patient Name in production
        regid: bill.regid,
        billNo: bill.billNo || 0,
        charges: bill.charges,
        received: bill.received,
        balance: bill.balance,
        paymentMode: bill.paymentMode || 'Unknown',
      });
    }),
  );

  return router;
}
