import { Router } from 'express';
import type { Router as IRouter } from 'express';

const router = Router();

// ═══════════════════════════════════════════════════════════════════════════════
// RECORDS (Call records / Growth tracking / Instructions)
// ═══════════════════════════════════════════════════════════════════════════════

// GET /api/records?regid=
router.get('/', async (req: any, res, next) => {
  try {
    const db = req.db;
    const regid = req.query.regid;
    let query = 'SELECT * FROM records WHERE deleted_at IS NULL';
    const params: any[] = [];
    if (regid) { query += ' AND regid = ?'; params.push(regid); }
    query += ' ORDER BY id DESC LIMIT 100';
    const [rows] = await db.execute(query, params);
    res.json({ success: true, data: rows });
  } catch (error) { next(error); }
});

// POST /api/records
router.post('/', async (req: any, res, next) => {
  try {
    const db = req.db;
    const data = req.body;
    const [result] = await db.execute(
      `INSERT INTO records (regid, comment, doctorname, mobile, recordtype, recorddate, calltime, instructions, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,NOW(),NOW())`,
      [data.regid || null, data.comment || '', data.doctorname || '', data.mobile || '', data.recordtype || 'Call', data.recorddate || null, data.calltime || null, data.instructions || '']
    );
    res.status(201).json({ success: true, id: result.insertId });
  } catch (error) { next(error); }
});

// PUT /api/records/:id
router.put('/:id', async (req: any, res, next) => {
  try {
    const db = req.db;
    const data = req.body;
    await db.execute(
      'UPDATE records SET comment=?, doctorname=?, mobile=?, recordtype=?, recorddate=?, calltime=?, instructions=?, updated_at=NOW() WHERE id=? AND deleted_at IS NULL',
      [data.comment || '', data.doctorname || '', data.mobile || '', data.recordtype || 'Call', data.recorddate || null, data.calltime || null, data.instructions || '', req.params.id]
    );
    res.json({ success: true, message: 'Record updated' });
  } catch (error) { next(error); }
});

// DELETE /api/records/:id
router.delete('/:id', async (req: any, res, next) => {
  try {
    const db = req.db;
    await db.execute('UPDATE records SET deleted_at=NOW() WHERE id=?', [req.params.id]);
    res.json({ success: true, message: 'Record deleted' });
  } catch (error) { next(error); }
});

export const recordsRouter: IRouter = router;
