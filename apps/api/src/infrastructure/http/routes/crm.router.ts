import { Router } from 'express';
import type { Router as IRouter } from 'express';

const router = Router();

// ═══════════════════════════════════════════════════════════════════════════════
// LEADS
// ═══════════════════════════════════════════════════════════════════════════════

// GET /api/crm/leads?search=&status=&page=&limit=
router.get('/leads', async (req: any, res, next) => {
  try {
    const db = req.db;
    const search = req.query.search as string;
    const status = req.query.status as string;
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 20;
    const offset = (page - 1) * limit;

    let query = 'SELECT * FROM leads WHERE deleted_at IS NULL';
    const params: any[] = [];

    if (search) {
      query += ' AND (name LIKE ? OR mobile LIKE ? OR phone LIKE ? OR email LIKE ?)';
      const like = `%${search}%`;
      params.push(like, like, like, like);
    }
    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) AS total');
    const [[{ total }]] = await db.execute(countQuery, params);

    query += ' ORDER BY id DESC LIMIT ? OFFSET ?';
    params.push(String(limit), String(offset));
    const [rows] = await db.execute(query, params);

    res.json({ success: true, data: rows, total, page, limit });
  } catch (error) { next(error); }
});

// PUT /api/crm/leads/followups/:fid  (must be before /:id)
router.put('/leads/followups/:fid', async (req: any, res, next) => {
  try {
    const db = req.db;
    const data = req.body;
    await db.execute(
      'UPDATE lead_followups SET name=?, task=?, taskstatus=?, updated_at=NOW() WHERE id=?',
      [data.notes || data.name || '', data.task || data.followup_type || '', data.taskstatus || data.status || '', req.params.fid]
    );
    res.json({ success: true, message: 'Followup updated' });
  } catch (error) { next(error); }
});

// DELETE /api/crm/leads/followups/:fid  (must be before /:id)
router.delete('/leads/followups/:fid', async (req: any, res, next) => {
  try {
    const db = req.db;
    await db.execute('UPDATE lead_followups SET deleted_at=NOW() WHERE id=?', [req.params.fid]);
    res.json({ success: true, message: 'Followup deleted' });
  } catch (error) { next(error); }
});

// DELETE /api/crm/leads/:id/followups/:fid  (frontend pattern)
router.delete('/leads/:id/followups/:fid', async (req: any, res, next) => {
  try {
    const db = req.db;
    await db.execute('UPDATE lead_followups SET deleted_at=NOW() WHERE id=?', [req.params.fid]);
    res.json({ success: true, message: 'Followup deleted' });
  } catch (error) { next(error); }
});

// GET /api/crm/leads/:id — single lead with followups
router.get('/leads/:id', async (req: any, res, next) => {
  try {
    const db = req.db;
    const [[lead]] = await db.execute('SELECT * FROM leads WHERE id = ? AND deleted_at IS NULL LIMIT 1', [req.params.id]);
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });

    const [followups] = await db.execute(
      'SELECT * FROM lead_followups WHERE lead_id = ? AND deleted_at IS NULL ORDER BY created_at DESC',
      [req.params.id]
    );
    (lead as any).followups = followups;
    res.json({ success: true, data: lead });
  } catch (error) { next(error); }
});

// POST /api/crm/leads
router.post('/leads', async (req: any, res, next) => {
  try {
    const db = req.db;
    const data = req.body;
    const [result] = await db.execute(
      `INSERT INTO leads (name, mobile, phone, email, address, source, status, notes, assigned_to, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [data.name, data.mobile || data.phone || '', data.phone || '', data.email || '', data.address || '', data.source || '', data.status || '', data.notes || '', data.assigned_to || null]
    );
    res.status(201).json({ success: true, id: result.insertId });
  } catch (error) { next(error); }
});

// PUT /api/crm/leads/:id
router.put('/leads/:id', async (req: any, res, next) => {
  try {
    const db = req.db;
    const data = req.body;
    await db.execute(
      `UPDATE leads SET name=?, mobile=?, phone=?, email=?, address=?, source=?, status=?, notes=?, assigned_to=?, updated_at=NOW() WHERE id=?`,
      [data.name, data.mobile || data.phone || '', data.phone || '', data.email || '', data.address || '', data.source || '', data.status || '', data.notes || '', data.assigned_to || null, req.params.id]
    );
    res.json({ success: true, message: 'Lead updated' });
  } catch (error) { next(error); }
});

// DELETE /api/crm/leads/:id
router.delete('/leads/:id', async (req: any, res, next) => {
  try {
    const db = req.db;
    await db.execute('UPDATE leads SET deleted_at=NOW() WHERE id=?', [req.params.id]);
    res.json({ success: true, message: 'Lead deleted' });
  } catch (error) { next(error); }
});

// GET /api/crm/leads/:id/followups
router.get('/leads/:id/followups', async (req: any, res, next) => {
  try {
    const db = req.db;
    const [rows] = await db.execute(
      'SELECT * FROM lead_followups WHERE lead_id = ? AND deleted_at IS NULL ORDER BY created_at DESC',
      [req.params.id]
    );
    res.json({ success: true, data: rows });
  } catch (error) { next(error); }
});

// POST /api/crm/leads/:id/followups
router.post('/leads/:id/followups', async (req: any, res, next) => {
  try {
    const db = req.db;
    const data = req.body;
    const [result] = await db.execute(
      `INSERT INTO lead_followups (lead_id, name, task, taskstatus, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())`,
      [req.params.id, data.notes || data.name || '', data.task || data.followup_type || '', data.taskstatus || data.status || '']
    );
    res.status(201).json({ success: true, id: result.insertId });
  } catch (error) { next(error); }
});

// ═══════════════════════════════════════════════════════════════════════════════
// REFERRALS
// ═══════════════════════════════════════════════════════════════════════════════

// GET /api/crm/referrals/summary
router.get('/referrals/summary', async (req: any, res, next) => {
  try {
    const db = req.db;
    const [rows] = await db.execute(`
      SELECT 
        SUM(CAST(NULLIF(r.total_amount, '') AS DECIMAL(10,2))) as total_amount, 
        SUM(CAST(NULLIF(r.used_amount, '') AS DECIMAL(10,2))) as used_amount, 
        r.referral_id, 
        c.first_name, 
        c.surname
      FROM referral r
      LEFT JOIN case_datas c ON c.regid = r.referral_id
      WHERE r.deleted_at IS NULL
      GROUP BY r.referral_id, c.first_name, c.surname
    `);
    res.json({ success: true, data: rows });
  } catch (error) { next(error); }
});

// GET /api/crm/referrals/details/:referralId
router.get('/referrals/details/:referralId', async (req: any, res, next) => {
  try {
    const db = req.db;
    const [rows] = await db.execute(
      'SELECT * FROM referral WHERE referral_id = ? AND deleted_at IS NULL ORDER BY created_at DESC',
      [req.params.referralId]
    );
    res.json({ success: true, data: rows });
  } catch (error) { next(error); }
});

// POST /api/crm/referrals
router.post('/referrals', async (req: any, res, next) => {
  try {
    const db = req.db;
    const { regid, referral_id, total_amount, used_amount } = req.body;
    const [result] = await db.execute(
      'INSERT INTO referral (regid, referral_id, total_amount, used_amount, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())',
      [regid, referral_id, total_amount || 0, used_amount || 0]
    );
    res.status(201).json({ success: true, id: result.insertId });
  } catch (error) { next(error); }
});

// DELETE /api/crm/referrals/:id
router.delete('/referrals/:id', async (req: any, res, next) => {
  try {
    const db = req.db;
    await db.execute('UPDATE referral SET deleted_at = NOW() WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Referral deleted' });
  } catch (error) { next(error); }
});

// ═══════════════════════════════════════════════════════════════════════════════
// REMINDERS
// ═══════════════════════════════════════════════════════════════════════════════

// GET /api/crm/reminders?status=&page=&limit=
router.get('/reminders', async (req: any, res, next) => {
  try {
    const db = req.db;
    const status = req.query.status as string;
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 20;
    const offset = (page - 1) * limit;

    let where = 'cr.deleted_at IS NULL';
    const params: any[] = [];
    if (status) { where += ' AND cr.status = ?'; params.push(status); }

    const [[{ total }]] = await db.execute(`SELECT COUNT(*) AS total FROM case_reminder cr WHERE ${where}`, [...params]);
    const [rows] = await db.execute(
      `SELECT cr.*, CONCAT(cd.first_name, ' ', cd.surname) AS patient_name, cd.mobile1 AS patient_mobile
       FROM case_reminder cr
       LEFT JOIN case_datas cd ON cr.patient_id = cd.id
       WHERE ${where}
       ORDER BY cr.id DESC LIMIT ? OFFSET ?`,
      [...params, String(limit), String(offset)]
    );
    res.json({ success: true, data: rows, total, page, limit });
  } catch (error) { next(error); }
});

// GET /api/crm/reminders/:id
router.get('/reminders/:id', async (req: any, res, next) => {
  try {
    const db = req.db;
    const [[row]] = await db.execute(
      `SELECT cr.*, CONCAT(cd.first_name, ' ', cd.surname) AS patient_name, cd.mobile1 AS patient_mobile
       FROM case_reminder cr LEFT JOIN case_datas cd ON cr.patient_id = cd.id
       WHERE cr.id = ? AND cr.deleted_at IS NULL LIMIT 1`,
      [req.params.id]
    );
    if (!row) return res.status(404).json({ success: false, message: 'Reminder not found' });
    res.json({ success: true, data: row });
  } catch (error) { next(error); }
});

// POST /api/crm/reminders
router.post('/reminders', async (req: any, res, next) => {
  try {
    const db = req.db;
    const data = req.body;
    const [result] = await db.execute(
      `INSERT INTO case_reminder (regid, start_date, remind_time, comments, heading, status, created_at, updated_at) VALUES (?,?,?,?,?,?,NOW(),NOW())`,
      [data.regid, data.start_date || data.followup_date, data.remind_time || '09:00', data.comments || data.notes || '', data.heading || data.reminder_type || '', data.status || 'pending']
    );
    res.status(201).json({ success: true, id: result.insertId });
  } catch (error) { next(error); }
});

// PUT /api/crm/reminders/:id
router.put('/reminders/:id', async (req: any, res, next) => {
  try {
    const db = req.db;
    const data = req.body;
    await db.execute(
      `UPDATE case_reminder SET regid=?, start_date=?, remind_time=?, comments=?, heading=?, status=?, updated_at=NOW() WHERE id=?`,
      [data.regid, data.start_date || data.followup_date, data.remind_time || '09:00', data.comments || data.notes || '', data.heading || data.reminder_type || '', data.status || 'pending', req.params.id]
    );
    res.json({ success: true, message: 'Reminder updated' });
  } catch (error) { next(error); }
});

// POST /api/crm/reminders/:id/done
router.post('/reminders/:id/done', async (req: any, res, next) => {
  try {
    const db = req.db;
    await db.execute("UPDATE case_reminder SET status='done', updated_at=NOW() WHERE id=?", [req.params.id]);
    res.json({ success: true, message: 'Reminder marked as done' });
  } catch (error) { next(error); }
});

// DELETE /api/crm/reminders/:id
router.delete('/reminders/:id', async (req: any, res, next) => {
  try {
    const db = req.db;
    await db.execute('UPDATE case_reminder SET deleted_at=NOW() WHERE id=?', [req.params.id]);
    res.json({ success: true, message: 'Reminder deleted' });
  } catch (error) { next(error); }
});

export const crmRouter: IRouter = router;
