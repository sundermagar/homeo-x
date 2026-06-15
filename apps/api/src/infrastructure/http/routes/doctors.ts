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
      limit: 1000,
    });

    // Check users table for is_active flag from PUBLIC schema (not tenant)
    const activeUsersRows = await req.publicDb.execute(sql`SELECT id, email, is_active FROM public.users WHERE LOWER(type) IN ('doctor', 'medical practitioner')`);

    // Create a map that handles both ID and lowercase Email as keys
    const statusMap = new Map<string | number, boolean>();
    (activeUsersRows as any[]).forEach((r: any) => {
      statusMap.set(Number(r.id), r.is_active);
      if (r.email) statusMap.set(r.email.toLowerCase(), r.is_active);
    });

    // Also check local tenant doctors table for overrides
    // Also check local tenant doctors and users tables for overrides
    let tenantStatusMap = new Map<string | number, boolean>();
    
    try {
      const localUsers = await req.tenantDb.execute(sql`SELECT email, name, is_active FROM users WHERE is_active IS NOT NULL`);
      (localUsers as any[]).forEach(u => {
        // Do NOT map by ID here, as users.id != doctors.id for legacy data
        if (u.email) tenantStatusMap.set(u.email.toLowerCase(), u.is_active);
        if (u.name) tenantStatusMap.set(u.name.toLowerCase(), u.is_active);
      });
    } catch (e) {
      console.error('Failed to load local users for is_active override:', e);
    }

    try {
      const localDoctors = await req.tenantDb.execute(sql`SELECT id, name, is_active FROM doctors`);
      (localDoctors as any[]).forEach(d => {
        if (d.is_active !== undefined && d.is_active !== null) {
          // If already false in users table (by name), keep it false
          if (d.name && tenantStatusMap.get(d.name.toLowerCase()) === false) return;
          tenantStatusMap.set(Number(d.id), d.is_active);
          if (d.name) tenantStatusMap.set(d.name.toLowerCase(), d.is_active);
        }
      });
    } catch (e) {
      console.error('Failed to load local doctors for is_active override:', e);
    }

    // Map to a lightweight format expected by the frontend AppointmentForm
    const doctors = result.data.map(d => {
      const doctorId = Number(d.id);
      const email = d.email ? d.email.toLowerCase() : null;
      const name = d.name ? d.name.toLowerCase() : null;

      // Match by ID first from tenant, then by name, then by email
      let isActive = true;
      if (tenantStatusMap.has(doctorId)) {
        isActive = tenantStatusMap.get(doctorId)!;
      } else if (name && tenantStatusMap.has(name)) {
        isActive = tenantStatusMap.get(name)!;
      } else if (email && tenantStatusMap.has(email)) {
        isActive = tenantStatusMap.get(email)!;
      } else if (statusMap.has(doctorId)) {
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

    const result = await req.tenantDb.execute(sql`
      UPDATE users SET is_active = ${isActive}, updated_at = NOW()
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
    const rows = await req.tenantDb.execute(sql`
      SELECT is_active FROM users
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
