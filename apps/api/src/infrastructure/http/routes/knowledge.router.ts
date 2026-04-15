import { Router } from 'express';
import type { Router as IRouter } from 'express';

const router = Router();

// ═══════════════════════════════════════════════════════════════════════════════
// DICTIONARY
// ═══════════════════════════════════════════════════════════════════════════════

// GET /api/knowledge/dictionary
router.get('/dictionary', async (req: any, res, next) => {
  try {
    const db = req.db;
    const [rows] = await db.execute('SELECT * FROM dictionary WHERE deleted_at IS NULL ORDER BY title ASC');
    res.json({ success: true, data: rows });
  } catch (error) { next(error); }
});

// GET /api/knowledge/dictionary/:id
router.get('/dictionary/:id', async (req: any, res, next) => {
  try {
    const db = req.db;
    const [[row]] = await db.execute('SELECT * FROM dictionary WHERE id = ? LIMIT 1', [req.params.id]);
    if (!row) return res.status(404).json({ success: false, message: 'Dictionary entry not found' });
    res.json({ success: true, data: row });
  } catch (error) { next(error); }
});

// POST /api/knowledge/dictionary
router.post('/dictionary', async (req: any, res, next) => {
  try {
    const db = req.db;
    const data = req.body;
    const [result] = await db.execute(
      'INSERT INTO dictionary (title, text, comments, cross_ref, created_at, updated_at) VALUES (?,?,?,?,NOW(),NOW())',
      [data.title, data.text || '', data.comments || '', data.cross_ref || '']
    );
    res.status(201).json({ success: true, id: result.insertId });
  } catch (error) { next(error); }
});

// PUT /api/knowledge/dictionary/:id
router.put('/dictionary/:id', async (req: any, res, next) => {
  try {
    const db = req.db;
    const data = req.body;
    await db.execute(
      'UPDATE dictionary SET title=?, text=?, comments=?, cross_ref=?, updated_at=NOW() WHERE id=?',
      [data.title, data.text || '', data.comments || '', data.cross_ref || '', req.params.id]
    );
    res.json({ success: true, message: 'Dictionary entry updated' });
  } catch (error) { next(error); }
});

// DELETE /api/knowledge/dictionary/:id
router.delete('/dictionary/:id', async (req: any, res, next) => {
  try {
    const db = req.db;
    await db.execute('UPDATE dictionary SET deleted_at=NOW() WHERE id=?', [req.params.id]);
    res.json({ success: true, message: 'Dictionary entry deleted' });
  } catch (error) { next(error); }
});

export const knowledgeRouter: IRouter = router;
