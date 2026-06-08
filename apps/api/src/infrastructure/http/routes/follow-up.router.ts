import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { tenantMiddleware } from '../middleware/tenant.js';
import { authMiddleware } from '../middleware/auth.js';
import { createDbClient } from '@mmc/database';
import * as schema from '@mmc/database/schema';
import { eq, desc, and } from 'drizzle-orm';

export const followUpRouter: Router = Router();

const followUpSchema = z.object({
  patientId: z.number(),
  complaints: z.string(),
  address: z.string().optional(),
});

/**
 * Validates active membership for the patient and processes follow-up requests.
 */
followUpRouter.post(
  '/',
  tenantMiddleware,
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const db = req.tenantDb;
      const parsed = followUpSchema.parse(req.body);

      // Check if patient has an active membership
      const activePackages = await db
        .select()
        .from(schema.patientPackages)
        .where(
          and(
            eq(schema.patientPackages.patientId, parsed.patientId),
            eq(schema.patientPackages.status, 'Active')
          )
        )
        .orderBy(desc(schema.patientPackages.expiryDate))
        .limit(1);

      const isMember = activePackages.length > 0;

      // Save the follow up request to the database
      const [inserted] = await db.insert(schema.followUpRequests).values({
        patientId: parsed.patientId,
        regid: (req.user as any)?.regid,
        complaints: parsed.complaints,
        address: parsed.address,
        status: isMember ? 'PAID' : 'PENDING',
        membershipId: isMember ? activePackages[0]?.id ?? null : null,
      }).returning();

      res.status(200).json({
        success: true,
        data: {
          isMember,
          requestId: inserted?.id,
          membershipId: isMember ? activePackages[0]?.id ?? null : null,
          message: isMember ? 'Membership applied successfully' : 'Proceed to payment',
        },
      });
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ success: false, error: err.errors });
      } else {
        res.status(500).json({ success: false, error: err.message });
      }
    }
  }
);
