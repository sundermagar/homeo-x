import { Router } from 'express';
import type { Router as IRouter } from 'express';

const router = Router();

// ═══════════════════════════════════════════════════════════════════════════════
// COURIERS
// ═══════════════════════════════════════════════════════════════════════════════

// GET /api/logistics/couriers — list all with package details
router.get('/couriers', async (req: any, res, next) => {
  try {
    const db = req.db;
    const [rows] = await db.execute(`
      SELECT c.*, p.name as package_name, p.color as package_color
      FROM couriers c
      LEFT JOIN packages p ON c.package_id = p.id
      WHERE c.deleted_at IS NULL
      ORDER BY c.id DESC
    `);
    res.json({ success: true, data: rows });
  } catch (error) { next(error); }
});

// GET /api/logistics/couriers/:id
router.get('/couriers/:id', async (req: any, res, next) => {
  try {
    const db = req.db;
    const [[row]] = await db.execute('SELECT * FROM couriers WHERE id = ? LIMIT 1', [req.params.id]);
    if (!row) return res.status(404).json({ success: false, message: 'Courier not found' });
    res.json({ success: true, data: row });
  } catch (error) { next(error); }
});

// POST /api/logistics/couriers
router.post('/couriers', async (req: any, res, next) => {
  try {
    const db = req.db;
    const { package_id, total_no_package } = req.body;
    const [result] = await db.execute(
      'INSERT INTO couriers (package_id, total_no_package, created_at, updated_at) VALUES (?,?,NOW(),NOW())',
      [package_id || null, total_no_package || 1]
    );
    res.status(201).json({ success: true, id: result.insertId });
  } catch (error) { next(error); }
});

// PUT /api/logistics/couriers/:id
router.put('/couriers/:id', async (req: any, res, next) => {
  try {
    const db = req.db;
    const { package_id, total_no_package } = req.body;
    await db.execute(
      'UPDATE couriers SET package_id=?, total_no_package=?, updated_at=NOW() WHERE id=?',
      [package_id || null, total_no_package || 1, req.params.id]
    );
    res.json({ success: true, message: 'Courier updated' });
  } catch (error) { next(error); }
});

// DELETE /api/logistics/couriers/:id
router.delete('/couriers/:id', async (req: any, res, next) => {
  try {
    const db = req.db;
    await db.execute('UPDATE couriers SET deleted_at=NOW() WHERE id=?', [req.params.id]);
    res.json({ success: true, message: 'Courier deleted' });
  } catch (error) { next(error); }
});

// ═══════════════════════════════════════════════════════════════════════════════
// COURIER MEDICINES
// ═══════════════════════════════════════════════════════════════════════════════

// GET /api/logistics/couriermedicine — list with patient & package JOINs
router.get('/couriermedicine', async (req: any, res, next) => {
  try {
    const db = req.db;
    const { page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

    const [rows] = await db.execute(
      `SELECT cm.*, c.first_name, c.surname, c.mobile1, c.area, c.city,
              p.name as package_name, p.color as package_color
       FROM couriermedicines cm
       LEFT JOIN case_datas c ON c.regid = cm.regid
       LEFT JOIN couriers cr ON cr.id = cm.courier_id
       LEFT JOIN packages p ON p.id = cr.package_id
       WHERE cm.deleted_at IS NULL
       ORDER BY cm.id DESC
       LIMIT ${parseInt(limit as string)} OFFSET ${offset}`
    );
    const [[{ total }]] = await db.execute(
      'SELECT COUNT(*) as total FROM couriermedicines WHERE deleted_at IS NULL'
    );
    res.json({ success: true, data: rows, total });
  } catch (error) { next(error); }
});

// POST /api/logistics/couriermedicine/savepackages
router.post('/couriermedicine/savepackages', async (req: any, res, next) => {
  try {
    const db = req.db;
    const { courier_id, packages } = req.body;
    if (!courier_id || !packages || !Array.isArray(packages)) {
      return res.status(400).json({ success: false, message: 'courier_id and packages array are required' });
    }
    for (const pkg of packages) {
      await db.execute(
        `INSERT INTO couriermedicines (courier_id, medicine_ids, status, created_at, updated_at)
         VALUES (?, ?, ?, NOW(), NOW())`,
        [courier_id, JSON.stringify([{ medicine_id: pkg.medicine_id, quantity: pkg.quantity }]), 'Packed']
      );
    }
    res.status(201).json({ success: true, message: `Saved ${packages.length} package(s)` });
  } catch (error) { next(error); }
});

// POST /api/logistics/couriermedicine
router.post('/couriermedicine', async (req: any, res, next) => {
  try {
    const db = req.db;
    const { courier_id, regid, medicine_ids, dispatch_date, tracking_no, status } = req.body;
    if (!courier_id || !regid) {
      return res.status(400).json({ success: false, message: 'courier_id and regid are required' });
    }
    const [result] = await db.execute(
      `INSERT INTO couriermedicines (courier_id, regid, medicine_ids, dispatch_date, tracking_no, status, notified, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 0, NOW(), NOW())`,
      [courier_id, regid, JSON.stringify(medicine_ids || []), dispatch_date || null, tracking_no || null, status || 'Pending']
    );
    res.status(201).json({ success: true, id: result.insertId });
  } catch (error) { next(error); }
});

// POST /api/logistics/couriermedicine/:id/notify
router.post('/couriermedicine/:id/notify', async (req: any, res, next) => {
  try {
    const db = req.db;
    const [[record]] = await db.execute(
      `SELECT cm.*, c.first_name, c.surname, c.mobile1,
              p.name as package_name
       FROM couriermedicines cm
       LEFT JOIN case_datas c ON c.regid = cm.regid
       LEFT JOIN couriers cr ON cr.id = cm.courier_id
       LEFT JOIN packages p ON p.id = cr.package_id
       WHERE cm.id = ? AND cm.deleted_at IS NULL`,
      [req.params.id]
    );
    if (!record) return res.status(404).json({ success: false, message: 'Record not found' });
    if (!record.mobile1) return res.status(400).json({ success: false, message: 'Patient phone not available' });

    const patientName = [record.first_name, record.surname].filter(Boolean).join(' ');
    const message = `Dear ${patientName}, your medicine has been dispatched via ${record.package_name || 'Courier'}. Tracking No: ${record.tracking_no || 'N/A'}. Status: ${record.status || 'Dispatched'}. - ManageMyClinic`;

    await db.execute(
      `INSERT INTO smsreport (message, phone, regid, send_date, sms_type, created_at, updated_at) VALUES (?,?,?,NOW(),?,NOW(),NOW())`,
      [message, record.mobile1, record.regid, 'CourierMedicine']
    );
    await db.execute('UPDATE couriermedicines SET notified = 1, updated_at = NOW() WHERE id = ?', [req.params.id]);

    res.json({ success: true, message: 'Notification sent and logged' });
  } catch (error) { next(error); }
});

// PUT /api/logistics/couriermedicine/:id
router.put('/couriermedicine/:id', async (req: any, res, next) => {
  try {
    const db = req.db;
    const { status, tracking_no, dispatch_date } = req.body;
    await db.execute(
      'UPDATE couriermedicines SET status=?, tracking_no=?, dispatch_date=?, updated_at=NOW() WHERE id=? AND deleted_at IS NULL',
      [status || 'Pending', tracking_no || null, dispatch_date || null, req.params.id]
    );
    res.json({ success: true, message: 'Courier medicine updated' });
  } catch (error) { next(error); }
});

// DELETE /api/logistics/couriermedicine/:id
router.delete('/couriermedicine/:id', async (req: any, res, next) => {
  try {
    const db = req.db;
    await db.execute('UPDATE couriermedicines SET deleted_at=NOW() WHERE id=?', [req.params.id]);
    res.json({ success: true, message: 'Courier medicine deleted' });
  } catch (error) { next(error); }
});

export const logisticsRouter: IRouter = router;
