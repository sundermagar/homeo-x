import { Router } from 'express';
import type { Router as ExpressRouter, Request, Response, NextFunction } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { createLogger } from '../../../shared/logger.js';

export const doctorsRouter: ExpressRouter = Router();
const logger = createLogger('doctors-router');

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
    logger.error({ err }, 'Doctors DB error');
    throw err;
  }
}

// GET /api/doctors — used by appointments form to populate doctor dropdown
// Queries BOTH the legacy `doctors` table AND the `users` table for full coverage
doctorsRouter.get('/', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = req.tenantDb;

    // Primary: query the legacy `doctors` table (where staff module stores them)
    let rows: any[] = [];
    try {
      rows = await pgQuery(db, `
        SELECT 
          id,
          COALESCE(name, CONCAT(first_name, ' ', COALESCE(last_name, ''))) AS name,
          email,
          mobile,
          specialization,
          consultation_fee AS "consultationFee",
          'doctor' AS type
        FROM doctors
        WHERE deleted_at IS NULL
        ORDER BY name ASC
      `);
    } catch (e) {
      logger.warn('doctors table query failed, falling back');
    }

    // Fallback: also look in users table
    if (rows.length === 0) {
      try {
        const usersRows = await pgQuery(db, `
          SELECT id, name, email, mobile, 'doctor' AS type
          FROM users
          WHERE LOWER(type) = 'doctor' AND is_active = true
          ORDER BY name ASC
        `);
        rows = [...rows, ...usersRows];
      } catch (e) {
        logger.warn('users table fallback also failed');
      }
    }

    // Deduplicate by id
    const seen = new Set();
    const unique = rows.filter(r => {
      if (seen.has(r.id)) return false;
      seen.add(r.id);
      return true;
    });

    res.json({ success: true, data: unique });
  } catch (error) { next(error); }
});
