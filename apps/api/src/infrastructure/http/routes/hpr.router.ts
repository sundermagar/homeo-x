import { Router, Request, Response, NextFunction } from 'express';
import type { Router as IRouter } from 'express';
import { users } from '@mmc/database/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

export const hprRouter: IRouter = Router();

const verifyHprSchema = z.object({
  doctorId: z.number(),
  hpid: z.string().min(3),
});

/**
 * POST /api/hpr/verify
 * Simulates verification of a doctor's Healthcare Professional ID (HPID)
 * via the ABDM Gateway and links it to the Homeo-X profile.
 */
hprRouter.post('/verify', async (req, res) => {
  try {
    const data = verifyHprSchema.parse(req.body);

    // TODO: In production, call actual ABDM Gateway:
    // fetch('https://dev.abdm.gov.in/gateway/v1/hpr/id/verify', ...)

    // Simulate successful API call delay
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Update the database to link the HPID
    // @ts-ignore - req.db is attached by middleware
    await req.db
      .update(users)
      .set({
        hprId: data.hpid,
        hprToken: 'mock_hpr_token_' + Date.now(),
      })
      .where(eq(users.id, data.doctorId));

    return res.status(200).json({
      success: true,
      message: 'ABDM HPR Profile verified successfully',
      data: { hprId: data.hpid },
    });
  } catch (error: any) {
    console.error('[HPR Verify Error]:', error);
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to verify HPID',
    });
  }
});
