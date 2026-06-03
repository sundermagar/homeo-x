import { Router } from 'express';
import type { Router as IRouter } from 'express';
import { organizations } from '@mmc/database/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

export const hfrRouter: IRouter = Router();

const verifyHfrSchema = z.object({
  clinicId: z.number(),
  hfrId: z.string().min(3),
});

/**
 * POST /api/hfr/verify
 * Simulates verification of a clinic's Health Facility Registry ID (HFR ID)
 * via the ABDM Gateway and links it to the Organization profile.
 */
hfrRouter.post('/verify', async (req, res) => {
  try {
    const data = verifyHfrSchema.parse(req.body);

    // TODO: In production, call actual ABDM Gateway:
    // fetch('https://dev.abdm.gov.in/gateway/v1/hfr/verify', ...)

    // Simulate successful API call delay
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Update the database to link the HFR ID
    // @ts-ignore - req.db is attached by middleware
    await req.db
      .update(organizations)
      .set({
        hfrId: data.hfrId,
        hfrToken: 'mock_hfr_token_' + Date.now(),
        updatedAt: new Date(),
      })
      .where(eq(organizations.id, data.clinicId));

    return res.status(200).json({
      success: true,
      message: 'ABDM HFR Facility verified successfully',
      data: { hfrId: data.hfrId },
    });
  } catch (error: any) {
    console.error('[HFR Verify Error]:', error);
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to verify HFR ID',
    });
  }
});
