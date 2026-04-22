import { Router } from 'express';
import type { Router as IRouter, Request, Response, NextFunction } from 'express';
import { createLogger } from '../../../shared/logger.js';

const router = Router();
const logger = createLogger('knowledge-router');

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
    logger.error({ err, query }, 'Knowledge DB Error');
    throw err;
  }
}

async function pgQueryOne(db: any, query: string, params: unknown[] = []): Promise<any | undefined> {
  const rows = await pgQuery(db, query, params);
  return rows[0];
}

// ═══════════════════════════════════════════════════════════════════════════════
// DICTIONARY
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/dictionary', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rows = await pgQuery(req.tenantDb, 'SELECT * FROM dictionary WHERE deleted_at IS NULL ORDER BY title ASC');
    res.json({ success: true, data: rows });
  } catch (error) { next(error); }
});

router.get('/dictionary/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const row = await pgQueryOne(req.tenantDb, 'SELECT * FROM dictionary WHERE id = $1 AND deleted_at IS NULL LIMIT 1', [req.params.id]);
    if (!row) return res.status(404).json({ success: false, message: 'Dictionary entry not found' });
    res.json({ success: true, data: row });
  } catch (error) { next(error); }
});

router.post('/dictionary', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, text, comments, cross_ref } = req.body;
    if (!title) return res.status(400).json({ success: false, message: 'Title is required' });
    const row = await pgQueryOne(req.tenantDb,
      `INSERT INTO dictionary (title, text, comments, cross_ref, created_at, updated_at) 
       VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING *`,
      [title, text ?? '', comments ?? '', cross_ref ?? '']
    );
    res.status(201).json({ success: true, data: row, id: row?.id });
  } catch (error) { next(error); }
});

router.put('/dictionary/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, text, comments, cross_ref } = req.body;
    const row = await pgQueryOne(req.tenantDb,
      `UPDATE dictionary SET title = COALESCE($1, title), text = COALESCE($2, text),
       comments = COALESCE($3, comments), cross_ref = COALESCE($4, cross_ref), updated_at = NOW()
       WHERE id = $5 AND deleted_at IS NULL RETURNING *`,
      [title ?? null, text ?? null, comments ?? null, cross_ref ?? null, req.params.id]
    );
    res.json({ success: true, data: row });
  } catch (error) { next(error); }
});

router.delete('/dictionary/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await pgQuery(req.tenantDb, 'UPDATE dictionary SET deleted_at = NOW() WHERE id = $1', [req.params.id]);
    res.json({ success: true, message: 'Dictionary entry deleted' });
  } catch (error) { next(error); }
});

// ═══════════════════════════════════════════════════════════════════════════════
// BOOKS / REFERENCES
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/books', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rows = await pgQuery(req.tenantDb, 'SELECT * FROM library_resources WHERE deleted_at IS NULL ORDER BY title ASC');
    res.json({ success: true, data: rows });
  } catch (error) { next(error); }
});

router.get('/books/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const row = await pgQueryOne(req.tenantDb, 'SELECT * FROM library_resources WHERE id = $1 AND deleted_at IS NULL LIMIT 1', [req.params.id]);
    if (!row) return res.status(404).json({ success: false, message: 'Resource not found' });
    res.json({ success: true, data: row });
  } catch (error) { next(error); }
});

router.post('/books', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, author, resource_type, category, url, description } = req.body;
    if (!title) return res.status(400).json({ success: false, message: 'Title is required' });
    const row = await pgQueryOne(req.tenantDb,
      `INSERT INTO library_resources (title, author, resource_type, url, description, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW()) RETURNING *`,
      [title, author ?? null, resource_type ?? category ?? 'Book', url ?? null, description ?? null]
    );
    res.status(201).json({ success: true, data: row, id: row?.id });
  } catch (error) { next(error); }
});

router.put('/books/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, author, resource_type, category, url, description } = req.body;
    const row = await pgQueryOne(req.tenantDb,
      `UPDATE library_resources SET title = COALESCE($1, title), author = COALESCE($2, author),
       resource_type = COALESCE($3, resource_type), url = COALESCE($4, url),
       description = COALESCE($5, description), updated_at = NOW()
       WHERE id = $6 AND deleted_at IS NULL RETURNING *`,
      [title ?? null, author ?? null, resource_type ?? category ?? null, url ?? null, description ?? null, req.params.id]
    );
    res.json({ success: true, data: row });
  } catch (error) { next(error); }
});

router.delete('/books/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await pgQuery(req.tenantDb, 'UPDATE library_resources SET deleted_at = NOW() WHERE id = $1', [req.params.id]);
    res.json({ success: true, message: 'Resource deleted' });
  } catch (error) { next(error); }
});

export const knowledgeRouter: IRouter = router;
