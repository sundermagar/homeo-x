import { Router } from 'express';
import type { Request, Response, NextFunction, Router as ExpressRouter } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { createLogger } from '../../../shared/logger.js';
import { StaffRepositoryPg } from '../../repositories/staff.repository.pg.js';
import { sql } from 'drizzle-orm';

export const doctorsRouter: ExpressRouter = Router();
const logger = createLogger('doctors-router');

/**
 * GET /api/doctors
 * Used by appointment forms to populate the practitioner selection dropdown.
 */
doctorsRouter.get('/', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const repo = new StaffRepositoryPg(req.tenantDb);

    // Fetch physicians, filtered by clinicId if the user is scoped to a clinic
    const clinicId = req.user?.contextId;
    const result = await repo.findAll({
      category: 'doctor',
      page: 1,
      limit: 100,
    });

    // Check users table for is_active flag from PUBLIC schema (not tenant)
    const activeUsersRows = await req.publicDb.execute(sql`SELECT id, email, is_active FROM public.users WHERE LOWER(type) IN ('doctor', 'medical practitioner')`);

    // Create a map that handles both ID and lowercase Email as keys
    const statusMap = new Map<string | number, boolean>();
    (activeUsersRows as any[]).forEach((r: any) => {
      statusMap.set(Number(r.id), r.is_active);
      if (r.email) statusMap.set(r.email.toLowerCase(), r.is_active);
    });

    // Map to a lightweight format expected by the frontend AppointmentForm
    const doctors = result.data.map(d => {
      const doctorId = Number(d.id);
      const email = d.email ? d.email.toLowerCase() : null;

      // Match by ID first, then fallback to Email
      let isActive = true;
      if (statusMap.has(doctorId)) {
        isActive = statusMap.get(doctorId) !== false;
      } else if (email && statusMap.has(email)) {
        isActive = statusMap.get(email) !== false;
      }

      return {
        id: doctorId,
        name: d.name,
        email: d.email,
        mobile: d.mobile,
        consultation_fee: d.consultationFee,
        type: 'doctor',
        isActive
      };
    });

    res.json({ success: true, data: doctors });
  } catch (error) {
    logger.error({ err: error }, 'Failed to fetch doctors list for appointments');
    next(error);
  }
});

/**
 * PATCH /api/doctors/status
 * Toggle doctor active/inactive status
 */
doctorsRouter.patch('/status', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user as any;
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ success: false, message: 'isActive boolean is required' });
    }

    const result = await req.publicDb.execute(sql`
      UPDATE public.users SET is_active = ${isActive}, updated_at = NOW()
      WHERE (id = ${user.id} OR LOWER(email) = LOWER(${user.email || ''}))
    `);

    const io = (req as any).io;
    if (io) {
      io.emit('doctorStatusChanged', { doctorId: user.id, isActive });
    }

    logger.info({ userId: user.id, isActive, rowCount: (result as any).rowCount || (result as any).length }, 'Doctor status updated in public.users');

    res.json({ success: true, isActive });
  } catch (error) {
    logger.error({ err: error, userId: (req.user as any)?.id }, 'Failed to update doctor status');
    next(error);
  }
});

/**
 * GET /api/doctors/status
 * Get the current doctor's active/inactive status
 */
doctorsRouter.get('/status', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user as any;
    const rows = await req.publicDb.execute(sql`
      SELECT is_active FROM public.users
      WHERE id = ${user.id} OR LOWER(email) = LOWER(${user.email || ''})
      LIMIT 1
    `);

    const isActive = (rows as any[])[0]?.is_active ?? true;
    res.json({ success: true, isActive });
  } catch (error) {
    logger.error({ err: error }, 'Failed to get doctor status');
    next(error);
  }
});
