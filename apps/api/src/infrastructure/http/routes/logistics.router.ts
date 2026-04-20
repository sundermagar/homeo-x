import { Router } from 'express';
import type { Router as IRouter, Request, Response, NextFunction } from 'express';
import { createLogger } from '../../../shared/logger.js';

const router = Router();
const logger = createLogger('logistics-router');

// ─── PostgreSQL Raw Query Helper ────────────────────────────────────────────
async function pgQuery(db: any, query: string, params: unknown[] = []): Promise<any[]> {
  try {
    const rawClient = db?.session?.client ?? db?.rawClient;
    let rows: any[];
    if (rawClient && typeof rawClient.unsafe === 'function') {
      rows = await rawClient.unsafe(query, params);
    } else {
      const result = await db.execute({ text: query, values: params });
      rows = result.rows ?? result ?? [];
    }
    return Array.from(rows);
  } catch (err: any) {
    logger.error({ err, query }, 'Logistics DB Error');
    throw err;
  }
}

async function pgQueryOne(db: any, query: string, params: unknown[] = []): Promise<any | undefined> {
  const rows = await pgQuery(db, query, params);
  return rows[0];
}

// ═══════════════════════════════════════════════════════════════════════════════
// COURIERS (Dispatch Sessions)
// ═══════════════════════════════════════════════════════════════════════════════

// GET /api/logistics/couriers — list all courier dispatch sessions
router.get('/couriers', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = req.tenantDb;
    const rows = await pgQuery(db, `
      SELECT 
        c.*,
        COUNT(cm.id) AS package_count
      FROM couriermedicines c
      LEFT JOIN couriermedicines cm ON cm.courier_id = c.id AND cm.deleted_at IS NULL
      WHERE c.deleted_at IS NULL
      ORDER BY c.id DESC
    `);
    res.json({ success: true, data: rows });
  } catch (error) { next(error); }
});

// GET /api/logistics/couriers/:id
router.get('/couriers/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = req.tenantDb;
    const row = await pgQueryOne(db, 'SELECT * FROM couriermedicines WHERE id = $1 AND deleted_at IS NULL', [req.params.id]);
    if (!row) return res.status(404).json({ success: false, message: 'Courier not found' });
    res.json({ success: true, data: row });
  } catch (error) { next(error); }
});

// POST /api/logistics/couriers — create a new courier dispatch session
router.post('/couriers', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = req.tenantDb;
    const { courier_id, regid, medicine_ids, dispatch_date, tracking_no, status } = req.body;
    const row = await pgQueryOne(db, `
      INSERT INTO couriermedicines 
        (courier_id, regid, medicine_ids, dispatch_date, tracking_no, status, notified, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, 0, NOW(), NOW()) 
      RETURNING *`,
      [
        courier_id ?? null,
        regid ?? null,
        medicine_ids ? JSON.stringify(medicine_ids) : '[]',
        dispatch_date ?? null,
        tracking_no ?? null,
        status ?? 'Pending'
      ]
    );
    res.status(201).json({ success: true, data: row, id: row?.id });
  } catch (error) { next(error); }
});

// PUT /api/logistics/couriers/:id
router.put('/couriers/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = req.tenantDb;
    const { status, tracking_no, dispatch_date } = req.body;
    const row = await pgQueryOne(db, `
      UPDATE couriermedicines SET 
        status = COALESCE($1, status), 
        tracking_no = COALESCE($2, tracking_no), 
        dispatch_date = COALESCE($3, dispatch_date), 
        updated_at = NOW()
      WHERE id = $4 AND deleted_at IS NULL 
      RETURNING *`,
      [status ?? null, tracking_no ?? null, dispatch_date ?? null, req.params.id]
    );
    res.json({ success: true, data: row });
  } catch (error) { next(error); }
});

// DELETE /api/logistics/couriers/:id
router.delete('/couriers/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = req.tenantDb;
    await pgQuery(db, 'UPDATE couriermedicines SET deleted_at = NOW() WHERE id = $1', [req.params.id]);
    res.json({ success: true, message: 'Courier deleted' });
  } catch (error) { next(error); }
});

// ═══════════════════════════════════════════════════════════════════════════════
// COURIER MEDICINES (Items inside a delivery session)
// ═══════════════════════════════════════════════════════════════════════════════

// GET /api/logistics/couriermedicine — list with patient & package JOINs
router.get('/couriermedicine', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = req.tenantDb;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = (page - 1) * limit;

    const rows = await pgQuery(db, `
      SELECT 
        cm.*,
        cd.name       AS patient_name,
        cd.mobile     AS patient_mobile,
        cd.city       AS patient_city
      FROM couriermedicines cm
      LEFT JOIN case_datas cd ON cd.regid = cm.regid
      WHERE cm.deleted_at IS NULL
      ORDER BY cm.id DESC
      LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const countRow = await pgQueryOne(db, 'SELECT COUNT(*) AS total FROM couriermedicines WHERE deleted_at IS NULL');
    const total = parseInt(countRow?.total ?? '0', 10);

    res.json({ success: true, data: rows, total, page, limit });
  } catch (error) { next(error); }
});

// POST /api/logistics/couriermedicine — create a courier medicine record
router.post('/couriermedicine', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = req.tenantDb;
    const { courier_id, regid, medicine_ids, dispatch_date, tracking_no, status } = req.body;
    if (!regid) {
      return res.status(400).json({ success: false, message: 'regid is required' });
    }
    const row = await pgQueryOne(db, `
      INSERT INTO couriermedicines (courier_id, regid, medicine_ids, dispatch_date, tracking_no, status, notified, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, 0, NOW(), NOW()) 
      RETURNING *`,
      [
        courier_id ?? null,
        regid,
        JSON.stringify(medicine_ids || []),
        dispatch_date ?? null,
        tracking_no ?? null,
        status ?? 'Pending'
      ]
    );
    res.status(201).json({ success: true, data: row, id: row?.id });
  } catch (error) { next(error); }
});

// POST /api/logistics/couriermedicine/savepackages — bulk package assignment
router.post('/couriermedicine/savepackages', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = req.tenantDb;
    const { courier_id, packages } = req.body;
    if (!courier_id || !Array.isArray(packages)) {
      return res.status(400).json({ success: false, message: 'courier_id and packages array are required' });
    }
    const inserted = [];
    for (const pkg of packages) {
      const row = await pgQueryOne(db, `
        INSERT INTO couriermedicines (courier_id, medicine_ids, status, created_at, updated_at)
        VALUES ($1, $2, 'Packed', NOW(), NOW()) 
        RETURNING *`,
        [courier_id, JSON.stringify([{ medicine_id: pkg.medicine_id, quantity: pkg.quantity }])]
      );
      inserted.push(row);
    }
    res.status(201).json({ success: true, data: inserted, message: `Saved ${packages.length} package(s)` });
  } catch (error) { next(error); }
});

// POST /api/logistics/couriermedicine/:id/notify — send SMS notification
router.post('/couriermedicine/:id/notify', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = req.tenantDb;
    const record = await pgQueryOne(db, `
      SELECT cm.*, cd.name AS patient_name, cd.mobile AS patient_mobile
      FROM couriermedicines cm
      LEFT JOIN case_datas cd ON cd.regid = cm.regid
      WHERE cm.id = $1 AND cm.deleted_at IS NULL`,
      [req.params.id]
    );
    if (!record) return res.status(404).json({ success: false, message: 'Record not found' });
    if (!record.patient_mobile) return res.status(400).json({ success: false, message: 'Patient phone not available' });

    const message = `Dear ${record.patient_name || 'Patient'}, your medicine has been dispatched. Tracking No: ${record.tracking_no || 'N/A'}. Status: ${record.status || 'Dispatched'}. - Kreed.health`;

    await pgQuery(db, `
      INSERT INTO smsreport (message, phone, regid, send_date, sms_type, created_at, updated_at) 
      VALUES ($1, $2, $3, NOW(), $4, NOW(), NOW())`,
      [message, record.patient_mobile, record.regid, 'CourierMedicine']
    );
    await pgQuery(db, 'UPDATE couriermedicines SET notified = 1, updated_at = NOW() WHERE id = $1', [req.params.id]);

    res.json({ success: true, message: 'Notification sent and logged' });
  } catch (error) { next(error); }
});

// PUT /api/logistics/couriermedicine/:id
router.put('/couriermedicine/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = req.tenantDb;
    const { status, tracking_no, dispatch_date } = req.body;
    const row = await pgQueryOne(db, `
      UPDATE couriermedicines SET 
        status = COALESCE($1, status), 
        tracking_no = COALESCE($2, tracking_no), 
        dispatch_date = COALESCE($3, dispatch_date), 
        updated_at = NOW()
      WHERE id = $4 AND deleted_at IS NULL 
      RETURNING *`,
      [status ?? null, tracking_no ?? null, dispatch_date ?? null, req.params.id]
    );
    res.json({ success: true, data: row });
  } catch (error) { next(error); }
});

// DELETE /api/logistics/couriermedicine/:id
router.delete('/couriermedicine/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = req.tenantDb;
    await pgQuery(db, 'UPDATE couriermedicines SET deleted_at = NOW() WHERE id = $1', [req.params.id]);
    res.json({ success: true, message: 'Courier medicine deleted' });
  } catch (error) { next(error); }
});

// ═══════════════════════════════════════════════════════════════════════════════
// COURIER MASTERS (The courier companies / dispatch names)
// ═══════════════════════════════════════════════════════════════════════════════

// GET /api/logistics/courier-masters
router.get('/courier-masters', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = req.tenantDb;
    const rows = await pgQuery(db, 'SELECT * FROM courier_masters WHERE is_active = true ORDER BY name ASC');
    res.json({ success: true, data: rows });
  } catch (error) { next(error); }
});

// POST /api/logistics/courier-masters
router.post('/courier-masters', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = req.tenantDb;
    const { name, contact_person, phone, tracking_url } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Name is required' });
    const row = await pgQueryOne(db, `
      INSERT INTO courier_masters (name, contact_person, phone, tracking_url, is_active, created_at, updated_at)
      VALUES ($1, $2, $3, $4, true, NOW(), NOW()) 
      RETURNING *`,
      [name, contact_person ?? null, phone ?? null, tracking_url ?? null]
    );
    res.status(201).json({ success: true, data: row });
  } catch (error) { next(error); }
});

export const logisticsRouter: IRouter = router;
