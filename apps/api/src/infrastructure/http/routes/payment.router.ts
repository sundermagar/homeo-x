import { Router, type Request, type Response } from 'express';
import { asyncHandler } from '../middleware/async-handler';
import { authMiddleware } from '../middleware/auth';
import { validate, validateQuery } from '../middleware/validate';
import { PaymentRepositoryPg } from '../../repositories/payment.repository.pg';
import { BillingRepositoryPg } from '../../repositories/billing.repository.pg';
import { RazorpayServiceAdapter } from '../../payments/razorpay.service';
import {
  CreatePaymentOrderUseCase,
  VerifyPaymentUseCase,
  RecordManualPaymentUseCase,
} from '../../../domains/billing';
import {
  createPaymentOrderSchema,
  verifyPaymentSchema,
  recordManualPaymentSchema,
  listPaymentsQuerySchema,
} from '@mmc/validation';
import { appConfig } from '../../../shared/config/app-config';
import type { DbClient } from '@mmc/database';

export function createPaymentRouter(): Router {
  const router = Router();
  router.use(authMiddleware);

  const razorpayService = new RazorpayServiceAdapter(
    appConfig.razorpay.keyId,
    appConfig.razorpay.keySecret
  );

  const getRepos = (req: Request) => ({
    paymentRepo: new PaymentRepositoryPg(req.tenantDb),
    billingRepo: new BillingRepositoryPg(req.tenantDb),
  });

  // POST /api/payments/create-order
  router.post(
    '/create-order',
    validate(createPaymentOrderSchema),
    asyncHandler(async (req: Request, res: Response) => {
      const useCase = new CreatePaymentOrderUseCase(razorpayService);
      const result = await useCase.execute(req.body);
      if (!result.success) {
        res.status(500).json({ success: false, error: result.error });
        return;
      }
      res.json({ success: true, data: result.data });
      return;
    })
  );

  // POST /api/payments/verify
  router.post(
    '/verify',
    validate(verifyPaymentSchema),
    asyncHandler(async (req: Request, res: Response) => {
      const { paymentRepo, billingRepo } = getRepos(req);
      const useCase = new VerifyPaymentUseCase(
        paymentRepo,
        billingRepo,
        appConfig.razorpay.keySecret || ''
      );
      const result = await useCase.execute(req.body);
      if (!result.success) {
        res.status(400).json({ success: false, error: result.error });
        return;
      }
      res.json({ success: true, data: result.data });
    })
  );

  // POST /api/payments (Manual Record)
  router.post(
    '/',
    validate(recordManualPaymentSchema),
    asyncHandler(async (req: Request, res: Response) => {
      const { paymentRepo, billingRepo } = getRepos(req);
      const useCase = new RecordManualPaymentUseCase(paymentRepo, billingRepo);
      const result = await useCase.execute(req.body);
      if (!result.success) {
        res.status(400).json({ success: false, error: result.error });
        return;
      }
      res.status(201).json({ success: true, data: result.data });
    })
  );

  // GET /api/payments/history
  router.get(
    '/history',
    validateQuery(listPaymentsQuerySchema),
    asyncHandler(async (req: Request, res: Response) => {
      const { paymentRepo } = getRepos(req);
      const { page, limit, regid } = req.query as any;
      const result = await paymentRepo.findAll({ page, limit, regid });
      res.json({
        success: true,
        data: result.data,
        pagination: { page, limit, total: result.total },
      });
      return;
    })
  );

  // GET /api/payments/:id
  router.get(
    '/:id',
    asyncHandler(async (req: Request, res: Response) => {
      const { paymentRepo } = getRepos(req);
      const id = parseInt(req.params.id as string, 10);
      if (isNaN(id)) {
        res.status(400).json({ success: false, error: 'Invalid ID' });
        return;
      }
      const payment = await paymentRepo.findById(id);
      if (!payment) {
        res.status(404).json({ success: false, error: 'Payment not found' });
        return;
      }
      res.json({ success: true, data: payment });
      return;
    })
  );

  return router;
}
