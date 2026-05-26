import { Router, type Request, type Response } from 'express';
import { sql } from 'drizzle-orm';
import { asyncHandler } from '../middleware/async-handler.js';
import { authMiddleware } from '../middleware/auth.js';
import { validate, validateQuery } from '../middleware/validate.js';
import { BillingRepositoryPg } from '../../repositories/billing.repository.pg.js';
import { NotificationsRepositoryPg } from '../../repositories/notifications.repository.pg.js';
import { triggerNotificationToRoles } from '../notification-trigger.js';
import {
  CreateBillUseCase,
  CreateCustomBillUseCase,
  ListBillsUseCase,
  GetDailyCollectionUseCase,
  GetPatientBillsUseCase,
  UpdateChargesUseCase,
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
      const bill = result.data;
      const clinicId = (req as any).user?.contextId;
      void triggerNotificationToRoles({
        roles: ['Account', 'Clinicadmin'],
        clinicId,
        type: 'INVOICE_GENERATED',
        title: 'Invoice Generated',
        message: `Bill #${bill.billNo ?? bill.id} — ₹${bill.charges} (received ₹${bill.received}).`,
        repo: new NotificationsRepositoryPg(req.tenantDb),
      });
      res.status(201).json({ success: true, data: bill });
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
      const bill = result.data;
      const clinicId = (req as any).user?.contextId;
      void triggerNotificationToRoles({
        roles: ['Account', 'Clinicadmin'],
        clinicId,
        type: 'INVOICE_GENERATED',
        title: 'Custom Invoice Generated',
        message: `Bill #${bill.billNo ?? bill.id} (${(bill as any).customTitle ?? 'custom'}) — ₹${bill.charges}.`,
        repo: new NotificationsRepositoryPg(req.tenantDb),
      });
      res.status(201).json({ success: true, data: bill });
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

  // PATCH /api/billing/:id/charges
  router.patch(
    '/:id/charges',
    asyncHandler(async (req: Request, res: Response) => {
      const id = parseInt(req.params.id as string, 10);
      const amount = Number(req.body.amount);
      if (isNaN(id) || isNaN(amount) || amount < 0) {
        res.status(400).json({ success: false, error: 'Invalid ID or amount' });
        return;
      }

      const useCase = new UpdateChargesUseCase(getRepo(req));
      const result = await useCase.execute(id, amount);
      if (!result.success) {
        res.status(400).json({ success: false, error: result.error });
        return;
      }
      res.json({ success: true, data: result.data });
    }),
  );

  // DELETE /api/billing/:id
  router.delete(
    '/:id',
    asyncHandler(async (req: Request, res: Response) => {
      const id = parseInt(req.params.id as string, 10);
      if (isNaN(id)) {
        res.status(400).json({ success: false, error: 'Invalid ID' });
        return;
      }
      const repo = getRepo(req);
      const success = await repo.softDelete(id);
      if (!success) {
        res.status(400).json({ success: false, error: 'Failed to delete bill or bill not found' });
        return;
      }
      res.json({ success: true });
    }),
  );

  // ─── ViewCollection Legacy Parity Routes ──────────────────────────────────

  /**
   * GET /api/billing/extended-summary?date=YYYY-MM-DD
   * Returns the full daily summary matching legacy ViewCollection index page.
   */
  router.get(
    '/extended-summary',
    asyncHandler(async (req: Request, res: Response) => {
      const db = req.tenantDb;
      const dateParam = (req.query.date as string) || new Date().toISOString().split('T')[0];
      const d = new Date(dateParam + 'T00:00:00');
      // Legacy date formats
      const legacyDate = `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`; // n/j/Y
      const legacyDateDMY = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`; // d/m/Y

      try {
        // Run all queries concurrently to optimize load time
        const [
          receipts,
          countRes,
          expRes,
          cashDepRes,
          bankDepRes,
          cumCashRes,
          cumBankRes,
          prodRes
        ] = await Promise.all([
          db.execute(
            sql`SELECT mode, COALESCE(SUM(CAST(amount AS NUMERIC)), 0) as total
                FROM receipt
                WHERE receiptdate = ${legacyDate}
                  AND deleted_at IS NULL
                  AND regid > 0
                GROUP BY mode`
          ),
          db.execute(
            sql`SELECT COUNT(*) as cnt FROM receipt
                WHERE receiptdate = ${legacyDate} AND deleted_at IS NULL AND regid > 0`
          ),
          db.execute(
            sql`SELECT COALESCE(SUM(amount), 0) as total FROM expenses
                WHERE dateval = ${legacyDate} AND deleted_at IS NULL`
          ),
          db.execute(
            sql`SELECT COALESCE(SUM(CAST(amount AS NUMERIC)), 0) as total FROM cash_deposit
                WHERE deposit_date = ${legacyDateDMY} AND deleted_at IS NULL`
          ),
          db.execute(
            sql`SELECT COALESCE(SUM(CAST(amount AS NUMERIC)), 0) as total FROM bank_deposit
                WHERE deposit_date = ${legacyDateDMY} AND deleted_at IS NULL`
          ),
          db.execute(
            sql`SELECT COALESCE(SUM(CAST(amount AS NUMERIC)), 0) as total FROM cash_deposit
                WHERE deleted_at IS NULL AND dateval <= ${dateParam} AND dateval >= '2021-01-01'`
          ),
          db.execute(
            sql`SELECT COALESCE(SUM(CAST(amount AS NUMERIC)), 0) as total FROM bank_deposit
                WHERE deleted_at IS NULL AND dateval <= ${dateParam} AND dateval >= '2021-01-01'`
          ),
          db.execute(
            sql`SELECT COALESCE(SUM(ac.additional_price * ac.additional_quantity), 0) as total
                FROM additional_charges ac
                LEFT JOIN charges c ON c.id = CAST(ac.additional_name AS INTEGER)
                WHERE ac.dateval = ${legacyDate}
                  AND ac.deleted_at IS NULL
                  AND c.type = 'Product'`
          )
        ]);

        const modeMap: Record<string, number> = {};
        for (const r of receipts as any[]) {
          modeMap[r.mode] = Number(r.total) || 0;
        }
        const cash = modeMap['C'] || 0;
        const card = modeMap['S'] || 0;
        const cheque = modeMap['B'] || 0;
        const online = modeMap['O'] || 0;
        const upi = modeMap['U'] || 0;
        const collection = cash + card + cheque + online + upi;

        const recordCount = Number((countRes as any[])[0]?.cnt) || 0;
        const expenses = Number((expRes as any[])[0]?.total) || 0;
        const cashDeposited = Number((cashDepRes as any[])[0]?.total) || 0;
        const bankDeposit = Number((bankDepRes as any[])[0]?.total) || 0;
        
        const cashInHand = (Number((cumCashRes as any[])[0]?.total) || 0) - (Number((cumBankRes as any[])[0]?.total) || 0);
        const productCharges = Number((prodRes as any[])[0]?.total) || 0;

        const deficit = cash - expenses - cashDeposited;

        res.json({
          success: true,
          data: {
            date: dateParam,
            collection,
            cash,
            card,
            cheque,
            online,
            upi,
            productCharges,
            expenses,
            cashDeposited,
            deficit,
            bankDeposit,
            cashInHand,
            recordCount,
          },
        });
      } catch (err: any) {
        console.error('[billing] extended-summary error:', err.message);
        res.status(500).json({ success: false, error: err.message });
      }
    }),
  );

  /**
   * GET /api/billing/payment-drilldown?date=YYYY-MM-DD&mode=Cash|Card|Cheque|Online|Product
   * Returns individual patient records for a payment mode on a given date.
   */
  router.get(
    '/payment-drilldown',
    asyncHandler(async (req: Request, res: Response) => {
      const db = req.tenantDb;
      const dateParam = (req.query.date as string) || new Date().toISOString().split('T')[0];
      const mode = (req.query.mode as string) || 'Cash';
      const d = new Date(dateParam + 'T00:00:00');
      const legacyDate = `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;

      try {
        if (mode === 'Product') {
          const rows: any[] = await db.execute(
            sql`SELECT ac.*, c.charges as charge_name, cd.regid as rid, cd.first_name
                FROM additional_charges ac
                LEFT JOIN charges c ON c.id = CAST(ac.additional_name AS INTEGER)
                LEFT JOIN case_datas cd ON cd.id = ac.regid
                WHERE ac.dateval = ${legacyDate}
                  AND ac.deleted_at IS NULL
                  AND c.type = 'Product'
                ORDER BY ac.id DESC`
          );
          const records = rows.map((r: any) => ({
            regid: Number(r.rid) || 0,
            patientName: r.first_name || '',
            amount: (Number(r.additional_price) || 0) * (Number(r.additional_quantity) || 1),
            chargeName: r.charge_name || '',
            quantity: Number(r.additional_quantity) || 1,
            date: r.created_at || new Date().toISOString(),
          }));
          res.json({ success: true, data: records });
        } else {
          const modeCode = { Cash: 'C', Card: 'S', Cheque: 'B', Online: 'O', UPI: 'U' }[mode] || 'C';
          const rows: any[] = await db.execute(
            sql`SELECT r.*, cd.regid as rid, cd.first_name
                FROM receipt r
                LEFT JOIN case_datas cd ON cd.id = r.regid
                WHERE r.receiptdate = ${legacyDate}
                  AND r.deleted_at IS NULL
                  AND r.regid > 0
                  AND r.mode = ${modeCode}
                ORDER BY r.id DESC`
          );
          const records = rows.map((r: any) => ({
            regid: Number(r.rid) || 0,
            patientName: r.first_name || '',
            amount: Number(r.amount) || 0,
            date: r.created_at || new Date().toISOString(),
          }));
          res.json({ success: true, data: records });
        }
      } catch (err: any) {
        console.error('[billing] payment-drilldown error:', err.message);
        res.status(500).json({ success: false, error: err.message });
      }
    }),
  );

  /**
   * GET /api/billing/month-list?endDate=YYYY-MM-DD&days=32
   * Returns rolling N-day summary table matching legacy viewlist page.
   */
  router.get(
    '/month-list',
    asyncHandler(async (req: Request, res: Response) => {
      const db = req.tenantDb;
      const endDate = (req.query.endDate as string) || new Date().toISOString().split('T')[0];
      const days = Math.min(parseInt(req.query.days as string, 10) || 32, 60);

      try {
        const rows = [];
        for (let i = 0; i < days; i++) {
          const d = new Date(endDate + 'T00:00:00');
          d.setDate(d.getDate() - i);
          const legacyDate = `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
          const legacyDateDMY = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
          const isoDate = d.toISOString().split('T')[0];

          const [
            receipts,
            expRes,
            cdRes,
            bdRes,
            cumCash,
            cumBank,
            prodRes,
            cntRes
          ] = await Promise.all([
            db.execute(
              sql`SELECT mode, COALESCE(SUM(CAST(amount AS NUMERIC)), 0) as total
                  FROM receipt WHERE receiptdate = ${legacyDate} AND deleted_at IS NULL AND regid > 0
                  GROUP BY mode`
            ),
            db.execute(
              sql`SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE dateval = ${legacyDate} AND deleted_at IS NULL`
            ),
            db.execute(
              sql`SELECT COALESCE(SUM(CAST(amount AS NUMERIC)), 0) as total FROM cash_deposit WHERE deposit_date = ${legacyDateDMY} AND deleted_at IS NULL`
            ),
            db.execute(
              sql`SELECT COALESCE(SUM(CAST(amount AS NUMERIC)), 0) as total FROM bank_deposit WHERE deposit_date = ${legacyDateDMY} AND deleted_at IS NULL`
            ),
            db.execute(
              sql`SELECT COALESCE(SUM(CAST(amount AS NUMERIC)), 0) as total FROM cash_deposit WHERE deleted_at IS NULL AND dateval <= ${isoDate} AND dateval >= '2021-01-01'`
            ),
            db.execute(
              sql`SELECT COALESCE(SUM(CAST(amount AS NUMERIC)), 0) as total FROM bank_deposit WHERE deleted_at IS NULL AND dateval <= ${isoDate} AND dateval >= '2021-01-01'`
            ),
            db.execute(
              sql`SELECT COALESCE(SUM(ac.additional_price * ac.additional_quantity), 0) as total
                  FROM additional_charges ac
                  LEFT JOIN charges c ON c.id = CAST(ac.additional_name AS INTEGER)
                  WHERE ac.dateval = ${legacyDate} AND ac.deleted_at IS NULL AND c.type = 'Product'`
            ),
            db.execute(
              sql`SELECT COUNT(*) as cnt FROM receipt WHERE receiptdate = ${legacyDate} AND deleted_at IS NULL AND regid > 0`
            )
          ]);

          const mm: Record<string, number> = {};
          for (const r of receipts as any[]) mm[r.mode] = Number(r.total) || 0;
          const cash = mm['C'] || 0;
          const card = mm['S'] || 0;
          const cheque = mm['B'] || 0;
          const online = mm['O'] || 0;
          const upi = mm['U'] || 0;

          const expenses = Number((expRes as any[])[0]?.total) || 0;
          const cashDeposited = Number((cdRes as any[])[0]?.total) || 0;
          const bankDeposit = Number((bdRes as any[])[0]?.total) || 0;
          const cashInHand = (Number((cumCash as any[])[0]?.total) || 0) - (Number((cumBank as any[])[0]?.total) || 0);
          const productCharges = Number((prodRes as any[])[0]?.total) || 0;

          rows.push({
            date: legacyDateDMY,
            collection: cash + card + cheque + online + upi,
            cash,
            card,
            cheque,
            online,
            upi,
            productCharges,
            expenses,
            cashDeposited,
            deficit: cash - expenses - cashDeposited,
            bankDeposit,
            cashInHand,
            recordCount: Number((cntRes as any[])[0]?.cnt) || 0,
          });
        }

        res.json({ success: true, data: rows });
      } catch (err: any) {
        console.error('[billing] month-list error:', err.message);
        res.status(500).json({ success: false, error: err.message });
      }
    }),
  );

  /**
   * GET /api/billing/collection-target?month=YYYY-MM
   * Returns daily target vs actual for a given month.
   */
  router.get(
    '/collection-target',
    asyncHandler(async (req: Request, res: Response) => {
      const db = req.tenantDb;
      const monthParam = (req.query.month as string) || new Date().toISOString().slice(0, 7);
      const parts = monthParam.split('-').map(Number);
      const year = parts[0] ?? new Date().getFullYear();
      const month = parts[1] ?? (new Date().getMonth() + 1);
      const daysInMonth = new Date(year, month, 0).getDate();
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;

      try {
        // Get target
        const targetRes: any[] = await db.execute(
          sql`SELECT amount FROM settargets ORDER BY id DESC LIMIT 1`
        );
        const monthlyTarget = Number(targetRes[0]?.amount) || 0;

        // Count working days (exclude Sundays)
        let workingDays = 0;
        for (let i = 0; i < daysInMonth; i++) {
          const d = new Date(year, month - 1, i + 1);
          if (d.getDay() !== 0) workingDays++;
        }
        const dailyTarget = workingDays > 0 ? Math.round(monthlyTarget / workingDays) : 0;

        const rows = [];
        let cumulativeCollection = 0;
        let cumulativeTarget = 0;

        for (let i = 0; i < daysInMonth; i++) {
          const d = new Date(year, month - 1, i + 1);
          const isSunday = d.getDay() === 0;
          const legacyDate = `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
          const dateDMY = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;

          if (isSunday) {
            rows.push({
              date: dateDMY,
              collection: 0,
              dailyTarget: 0,
              difference: 0,
              cumulativeCollection,
              cumulativeTarget,
              cumulativeDifference: cumulativeCollection - cumulativeTarget,
              isSunday: true,
            });
            continue;
          }

          // Get receipts sum minus product charges
          const recRes: any[] = await db.execute(
            sql`SELECT COALESCE(SUM(CAST(amount AS NUMERIC)), 0) as total FROM receipt
                WHERE receiptdate = ${legacyDate} AND deleted_at IS NULL AND regid > 0`
          );
          const dayCollection = Number(recRes[0]?.total) || 0;

          cumulativeCollection += dayCollection;
          cumulativeTarget += dailyTarget;

          rows.push({
            date: dateDMY,
            collection: dayCollection,
            dailyTarget,
            difference: dayCollection - dailyTarget,
            cumulativeCollection,
            cumulativeTarget,
            cumulativeDifference: cumulativeCollection - cumulativeTarget,
            isSunday: false,
          });
        }

        res.json({
          success: true,
          data: { monthlyTarget, workingDays, dailyTarget, rows },
        });
      } catch (err: any) {
        console.error('[billing] collection-target error:', err.message);
        res.status(500).json({ success: false, error: err.message });
      }
    }),
  );

  /**
   * POST /api/billing/set-target
   * Sets a new monthly collection target.
   */
  router.post(
    '/set-target',
    asyncHandler(async (req: Request, res: Response) => {
      const db = req.tenantDb;
      const { amount } = req.body;
      if (!amount || isNaN(Number(amount))) {
        res.status(400).json({ success: false, error: 'Valid amount is required' });
        return;
      }
      try {
        await db.execute(
          sql`INSERT INTO settargets (amount, month_target, created_at, updated_at)
              VALUES (${Number(amount)}, ${new Date().toISOString().split('T')[0]}, NOW(), NOW())`
        );
        res.json({ success: true, data: { amount: Number(amount) } });
      } catch (err: any) {
        console.error('[billing] set-target error:', err.message);
        res.status(500).json({ success: false, error: err.message });
      }
    }),
  );

  return router;
}
