import { Router, type Request, type Response } from 'express';
import { sql } from 'drizzle-orm';
import { asyncHandler } from '../middleware/async-handler.js';
import { authMiddleware } from '../middleware/auth.js';
import { validate, validateQuery } from '../middleware/validate.js';
import {
  AdditionalChargeRepositoryPg,
  ExpenseRepositoryPg,
} from '../../repositories/accounts.repository.pg.js';
import { BillingRepositoryPg } from '../../repositories/billing.repository.pg.js';
import { MedicalCaseRepositoryPg } from '../../repositories/medical-case.repository.pg.js';
import {
  ListAdditionalChargesUseCase,
  GetAdditionalChargeUseCase,
  CreateAdditionalChargeUseCase,
  UpdateAdditionalChargeUseCase,
  DeleteAdditionalChargeUseCase,
  ListExpenseHeadsUseCase,
  GetExpenseHeadUseCase,
  CreateExpenseHeadUseCase,
  UpdateExpenseHeadUseCase,
  DeleteExpenseHeadUseCase,
  ProcessAdditionalChargeUseCase,
} from '../../../domains/billing/index.js';
import {
  createAdditionalChargeSchema,
  updateAdditionalChargeSchema,
  listAdditionalChargesQuerySchema,
  createExpenseHeadSchema,
  updateExpenseHeadSchema,
} from '@mmc/validation';
import type { DbClient } from '@mmc/database';

export function createAccountsRouter(): Router {
  const router = Router();
  router.use(authMiddleware);

  const getRepo = (req: Request) => new AdditionalChargeRepositoryPg(req.tenantDb);
  const getExpenseRepo = (req: Request) => new ExpenseRepositoryPg(req.tenantDb);

  // GET /api/accounts/additional-charges
  router.get(
    '/additional-charges',
    validateQuery(listAdditionalChargesQuerySchema),
    asyncHandler(async (req: Request, res: Response) => {
      const useCase = new ListAdditionalChargesUseCase(getRepo(req));
      const result = await useCase.execute(req.query as any);
      if (!result.success) {
        res.status(400).json({ success: false, error: result.error });
        return;
      }
      res.json({ success: true, data: result.data!.data, total: result.data!.total });
    }),
  );

  // GET /api/accounts/additional-charges/:id
  router.get(
    '/additional-charges/:id',
    asyncHandler(async (req: Request, res: Response) => {
      const id = parseInt(req.params.id as string, 10);
      if (isNaN(id)) {
        res.status(400).json({ success: false, error: 'Invalid ID' });
        return;
      }
      const useCase = new GetAdditionalChargeUseCase(getRepo(req));
      const result = await useCase.execute(id);
      if (!result.success) {
        res.status(404).json({ success: false, error: result.error });
        return;
      }
      res.json({ success: true, data: result.data });
    }),
  );

  // POST /api/accounts/additional-charges
  router.post(
    '/additional-charges',
    validate(createAdditionalChargeSchema),
    asyncHandler(async (req: Request, res: Response) => {
      const { BillingRepositoryPg } = await import('../../repositories/billing.repository.pg.js');
      const { MedicalCaseRepositoryPg } =
        await import('../../repositories/medical-case.repository.pg.js');
      const useCase = new ProcessAdditionalChargeUseCase(
        getRepo(req),
        new BillingRepositoryPg(req.tenantDb),
        new MedicalCaseRepositoryPg(req.tenantDb),
      );
      const result = await useCase.execute(req.body);
      if (!result.success) {
        res.status(400).json({ success: false, error: result.error });
        return;
      }
      res.status(201).json({ success: true, data: result.data });
    }),
  );

  // PUT /api/accounts/additional-charges/:id
  router.put(
    '/additional-charges/:id',
    validate(updateAdditionalChargeSchema),
    asyncHandler(async (req: Request, res: Response) => {
      const id = parseInt(req.params.id as string, 10);
      if (isNaN(id)) {
        res.status(400).json({ success: false, error: 'Invalid ID' });
        return;
      }
      const useCase = new UpdateAdditionalChargeUseCase(getRepo(req), new BillingRepositoryPg(req.tenantDb));
      const result = await useCase.execute(id, req.body);
      if (!result.success) {
        res.status(400).json({ success: false, error: result.error });
        return;
      }
      res.json({ success: true, data: result.data });
    }),
  );

  // DELETE /api/accounts/additional-charges/:id
  router.delete(
    '/additional-charges/:id',
    asyncHandler(async (req: Request, res: Response) => {
      const id = parseInt(req.params.id as string, 10);
      if (isNaN(id)) {
        res.status(400).json({ success: false, error: 'Invalid ID' });
        return;
      }
      const useCase = new DeleteAdditionalChargeUseCase(getRepo(req), new BillingRepositoryPg(req.tenantDb));
      const result = await useCase.execute(id);
      if (!result.success) {
        res.status(404).json({ success: false, error: result.error });
        return;
      }
      res.json({ success: true });
    }),
  );

  // ─── Sync Pending Bills ────────────────────────────────────────────────────────

  // GET /api/accounts/cleanup-duplicates
  router.get(
    '/cleanup-duplicates',
    asyncHandler(async (req: Request, res: Response) => {
      const db = req.tenantDb;
      const { bills } = await import('@mmc/database');
      const { eq, and, desc, isNull, inArray } = await import('drizzle-orm');

      const allRegBills = await db.select()
        .from(bills)
        .where(and(eq(bills.billType, 'Registration'), isNull(bills.deletedAt)))
        .orderBy(desc(bills.id));

      const dupGroups: Record<string, any[]> = {};
      for (const b of allRegBills) {
        if (b.id < 50) continue; // Skip old bills just in case
        const dateStr = (b.billDate as any) instanceof Date ? (b.billDate as any).toISOString().split('T')[0] : b.billDate;
        const key = `${b.regid}-${dateStr}`;
        if (!dupGroups[key]) dupGroups[key] = [];
        dupGroups[key].push(b);
      }

      let deletedCount = 0;
      for (const [key, bList] of Object.entries(dupGroups)) {
        if (bList.length > 1) {
          bList.sort((a, b) => b.charges - a.charges || b.id - a.id);
          const deleteIds = bList.slice(1).map(b => b.id);
          await db.update(bills).set({ deletedAt: new Date() }).where(inArray(bills.id, deleteIds));
          deletedCount += deleteIds.length;
        }
      }

      // Do the same for Medicine Days
      const allMedBills = await db.select()
        .from(bills)
        .where(and(eq(bills.billType, 'Consultation'), isNull(bills.deletedAt)))
        .orderBy(desc(bills.id));

      const medGroups: Record<string, any[]> = {};
      for (const b of allMedBills) {
        if (b.id < 50) continue;
        const dateStr = (b.billDate as any) instanceof Date ? (b.billDate as any).toISOString().split('T')[0] : b.billDate;
        const key = `${b.regid}-${dateStr}`;
        if (!medGroups[key]) medGroups[key] = [];
        medGroups[key].push(b);
      }

      for (const [key, bList] of Object.entries(medGroups)) {
        if (bList.length > 1) {
          bList.sort((a, b) => b.charges - a.charges || b.id - a.id);
          const deleteIds = bList.slice(1).map(b => b.id);
          await db.update(bills).set({ deletedAt: new Date() }).where(inArray(bills.id, deleteIds));
          deletedCount += deleteIds.length;
        }
      }

      res.json({ success: true, deletedCount });
    })
  );

  // POST /api/accounts/pending-bills
  router.post(
    '/pending-bills',
    asyncHandler(async (req: Request, res: Response) => {
      const { regid, dateval, regular, daysCharge } = req.body;
      console.log('[pending-bills] Received sync request:', { regid, dateval, regular, daysCharge });
      if (!regid || !dateval) {
        res.status(400).json({ success: false, error: 'regid and dateval required' });
        return;
      }
      
      const db = req.tenantDb;
      const { bills } = await import('@mmc/database');
      const { eq, and, isNull } = await import('drizzle-orm');

      // Helper to get next bill no safely
      const getNextBillNo = async () => {
        try {
          const [res] = await db.execute(sql`SELECT nextval('bill_no_seq')`);
          return Number(res?.nextval ?? 1);
        } catch(e) {
          return 0;
        }
      };

      // 1. Sync Registration Bill
      if (regular !== undefined && regular >= 0) {
        try {
          const [existingReg] = await db
            .select({ id: bills.id, received: bills.received })
            .from(bills)
            .where(
              and(
                eq(bills.regid, regid),
                eq(bills.billDate, dateval),
                eq(bills.billType, 'Registration'),
                isNull(bills.deletedAt)
              )
            )
            .limit(1);

          if (existingReg) {
            const received = existingReg.received ?? 0;
            await db
              .update(bills)
              .set({ charges: regular, balance: regular - received, updatedAt: new Date() })
              .where(eq(bills.id, existingReg.id));
          } else {
            const billNo = await getNextBillNo();
            console.log('[pending-bills] Creating Registration bill:', { regid, billNo, dateval, regular });
            await db.insert(bills).values({
              regid,
              billNo,
              billDate: dateval,
              charges: regular,
              received: 0,
              balance: regular,
              paymentMode: 'Cash',
              billType: 'Registration',
              customTitle: 'Registration Fee',
              createdAt: new Date(),
              updatedAt: new Date(),
            });
            console.log('[pending-bills] Registration bill created successfully');
          }
        } catch(e) { console.error('Failed to sync registration bill', e); }
      }

      // 2. Sync Consultation Bill (Medicine Days)
      if (daysCharge !== undefined && daysCharge >= 0) {
        try {
          const [existingCons] = await db
            .select({ id: bills.id, received: bills.received })
            .from(bills)
            .where(
              and(
                eq(bills.regid, regid),
                eq(bills.billDate, dateval),
                eq(bills.billType, 'Consultation'),
                eq(bills.customTitle, 'Medicine Days Charge'),
                isNull(bills.deletedAt)
              )
            )
            .limit(1);

          if (existingCons) {
            const received = existingCons.received ?? 0;
            await db
              .update(bills)
              .set({ charges: daysCharge, balance: daysCharge - received, updatedAt: new Date() })
              .where(eq(bills.id, existingCons.id));
          } else {
            const billNo = await getNextBillNo();
            console.log('[pending-bills] Creating Medicine Days bill:', { regid, billNo, dateval, daysCharge });
            await db.insert(bills).values({
              regid,
              billNo,
              billDate: dateval,
              charges: daysCharge,
              received: 0,
              balance: daysCharge,
              paymentMode: 'Cash',
              billType: 'Consultation',
              customTitle: 'Medicine Days Charge',
              createdAt: new Date(),
              updatedAt: new Date(),
            });
            console.log('[pending-bills] Medicine Days bill created successfully');
          }
        } catch(e) { console.error('Failed to sync medicine bill', e); }
      }

      res.json({ success: true });
    })
  );

  // ─── Expense Heads ────────────────────────────────────────────────────────

  // GET /api/accounts/expense-heads
  router.get(
    '/expense-heads',
    asyncHandler(async (req: Request, res: Response) => {
      const useCase = new ListExpenseHeadsUseCase(getExpenseRepo(req));
      const result = await useCase.execute();
      if (!result.success) {
        res.status(400).json({ success: false, error: result.error });
        return;
      }
      res.json({ success: true, data: result.data });
    }),
  );

  // GET /api/accounts/expense-heads/:id
  router.get(
    '/expense-heads/:id',
    asyncHandler(async (req: Request, res: Response) => {
      const id = parseInt(req.params.id as string, 10);
      if (isNaN(id)) {
        res.status(400).json({ success: false, error: 'Invalid ID' });
        return;
      }
      const useCase = new GetExpenseHeadUseCase(getExpenseRepo(req));
      const result = await useCase.execute(id);
      if (!result.success) {
        res.status(404).json({ success: false, error: result.error });
        return;
      }
      res.json({ success: true, data: result.data });
    }),
  );

  // POST /api/accounts/expense-heads
  router.post(
    '/expense-heads',
    validate(createExpenseHeadSchema),
    asyncHandler(async (req: Request, res: Response) => {
      const useCase = new CreateExpenseHeadUseCase(getExpenseRepo(req));
      const result = await useCase.execute(req.body);
      if (!result.success) {
        res.status(400).json({ success: false, error: result.error });
        return;
      }
      res.status(201).json({ success: true, data: result.data });
    }),
  );

  // PUT /api/accounts/expense-heads/:id
  router.put(
    '/expense-heads/:id',
    validate(updateExpenseHeadSchema),
    asyncHandler(async (req: Request, res: Response) => {
      const id = parseInt(req.params.id as string, 10);
      if (isNaN(id)) {
        res.status(400).json({ success: false, error: 'Invalid ID' });
        return;
      }
      const useCase = new UpdateExpenseHeadUseCase(getExpenseRepo(req));
      const result = await useCase.execute(id, req.body);
      if (!result.success) {
        res.status(400).json({ success: false, error: result.error });
        return;
      }
      res.json({ success: true, data: result.data });
    }),
  );

  // DELETE /api/accounts/expense-heads/:id
  router.delete(
    '/expense-heads/:id',
    asyncHandler(async (req: Request, res: Response) => {
      const id = parseInt(req.params.id as string, 10);
      if (isNaN(id)) {
        res.status(400).json({ success: false, error: 'Invalid ID' });
        return;
      }
      const useCase = new DeleteExpenseHeadUseCase(getExpenseRepo(req));
      const result = await useCase.execute(id);
      if (!result.success) {
        res.status(404).json({ success: false, error: result.error });
        return;
      }
      res.json({ success: true });
    }),
  );

  return router;
}
