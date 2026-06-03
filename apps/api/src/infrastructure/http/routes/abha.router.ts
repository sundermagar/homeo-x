import { Router } from 'express';
import type { Request, Response, Router as IRouter } from 'express';
import { eq } from 'drizzle-orm';
import { patients } from '@mmc/database/schema';
import { authMiddleware } from '../middleware/auth.js';
import { createLogger } from '../../../shared/logger.js';

const logger = createLogger('abha');

export const abhaRouter: IRouter = Router();

// ─── ABHA Sandbox Mock Helpers ───────────────────────────────────────────────
// These generate realistic-looking mock data for the ABDM sandbox flow.
// When real sandbox credentials are available, replace these with actual
// ABDM API calls (https://sandbox.abdm.gov.in).

function generateMockAbhaNumber(): string {
  // ABHA numbers are 14 digits in XX-XXXX-XXXX-XXXX format
  const parts = [
    String(Math.floor(10 + Math.random() * 90)),
    String(Math.floor(1000 + Math.random() * 9000)),
    String(Math.floor(1000 + Math.random() * 9000)),
    String(Math.floor(1000 + Math.random() * 9000)),
  ];
  return parts.join('-');
}

function generateMockAbhaAddress(firstName: string): string {
  const sanitized = firstName.toLowerCase().replace(/[^a-z]/g, '');
  const suffix = Math.floor(10 + Math.random() * 90);
  return `${sanitized}${suffix}@abdm`;
}

function generateMockTxnId(): string {
  return `txn-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
}

// In-memory store for pending transactions (mock OTP flow)
// In production, use Redis or DB-backed sessions
const pendingTransactions = new Map<string, {
  identifier: string;
  type: 'aadhaar' | 'mobile';
  createdAt: Date;
  mockOtp: string;
}>();

// Clean up old transactions every 10 minutes
setInterval(() => {
  const cutoff = Date.now() - 10 * 60 * 1000;
  for (const [key, val] of pendingTransactions) {
    if (val.createdAt.getTime() < cutoff) {
      pendingTransactions.delete(key);
    }
  }
}, 10 * 60 * 1000);


// ─── GET /api/abha/patients/:regid ──────────────────────────────────────────
// Returns the ABHA linking status for a patient
abhaRouter.get('/patients/:regid', authMiddleware, async (req: Request, res: Response) => {
  try {
    const regid = Number(req.params.regid);
    if (isNaN(regid)) {
      res.status(400).json({ success: false, message: 'Invalid regid' });
      return;
    }

    const [patient] = await req.tenantDb
      .select({
        regid: patients.regid,
        firstName: patients.firstName,
        surname: patients.surname,
        abhaId: patients.abhaId,
      })
      .from(patients)
      .where(eq(patients.regid, regid))
      .limit(1);

    if (!patient) {
      res.status(404).json({ success: false, message: 'Patient not found' });
      return;
    }

    res.json({
      success: true,
      data: {
        regid: patient.regid,
        patientName: `${patient.firstName || ''} ${patient.surname || ''}`.trim(),
        abhaId: patient.abhaId || null,
        isLinked: !!patient.abhaId,
        // Mock profile data — in production, fetch from ABDM
        profile: patient.abhaId ? {
          healthIdNumber: patient.abhaId,
          healthId: patient.abhaId.includes('@') ? patient.abhaId : `${(patient.firstName || 'user').toLowerCase()}@abdm`,
          name: `${patient.firstName || ''} ${patient.surname || ''}`.trim(),
          status: 'ACTIVE',
        } : null,
      },
    });
  } catch (err: any) {
    logger.error({ err: err.message }, 'Failed to get ABHA status');
    res.status(500).json({ success: false, message: err.message });
  }
});


// ─── POST /api/abha/search ──────────────────────────────────────────────────
// Step 1 of the linking flow: Search/discover ABHA by Aadhaar or Mobile
// In mock mode: accepts any valid-looking identifier and returns a txnId
// In production: calls ABDM /v1/registration/aadhaar/generateOtp
abhaRouter.post('/search', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { identifier, type } = req.body;

    if (!identifier || !type) {
      res.status(400).json({
        success: false,
        message: 'Missing required fields: identifier, type',
      });
      return;
    }

    if (!['aadhaar', 'mobile'].includes(type)) {
      res.status(400).json({
        success: false,
        message: 'type must be "aadhaar" or "mobile"',
      });
      return;
    }

    // Validate format
    const cleanIdentifier = identifier.replace(/[-\s]/g, '');
    if (type === 'aadhaar' && cleanIdentifier.length !== 12) {
      res.status(400).json({ success: false, message: 'Aadhaar must be 12 digits' });
      return;
    }
    if (type === 'mobile' && cleanIdentifier.length !== 10) {
      res.status(400).json({ success: false, message: 'Mobile must be 10 digits' });
      return;
    }

    // ── MOCK MODE ──
    // Generate a transaction ID and store the pending verification
    const txnId = generateMockTxnId();
    const mockOtp = '123456'; // Standard sandbox OTP

    pendingTransactions.set(txnId, {
      identifier: cleanIdentifier,
      type,
      createdAt: new Date(),
      mockOtp,
    });

    logger.info({ txnId, type, identifier: `${cleanIdentifier.slice(0, 4)}****` }, 'ABHA search initiated (mock)');

    res.json({
      success: true,
      data: {
        txnId,
        message: `OTP sent to registered ${type === 'aadhaar' ? 'mobile linked with Aadhaar' : 'mobile number'}`,
        // Hint for sandbox testing
        _sandbox: {
          note: 'Use OTP 123456 for sandbox verification',
          otp: mockOtp,
        },
      },
    });

    // ── REAL ABDM MODE (uncomment when you have sandbox credentials) ──
    // const abdmResponse = await fetch(`${process.env.ABDM_BASE_URL}/v1/registration/aadhaar/generateOtp`, {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //     'Authorization': `Bearer ${await getAbdmAccessToken()}`,
    //   },
    //   body: JSON.stringify({ aadhaar: cleanIdentifier }),
    // });
    // const abdmData = await abdmResponse.json();
    // res.json({ success: true, data: { txnId: abdmData.txnId, message: 'OTP sent' } });

  } catch (err: any) {
    logger.error({ err: err.message }, 'ABHA search failed');
    res.status(500).json({ success: false, message: err.message });
  }
});


// ─── POST /api/abha/patients/:regid/verify ──────────────────────────────────
// Step 2: Verify OTP and fetch the ABHA profile
// In mock mode: accepts OTP "123456" and returns a generated ABHA profile
// In production: calls ABDM /v1/registration/aadhaar/verifyOtp
abhaRouter.post('/patients/:regid/verify', authMiddleware, async (req: Request, res: Response) => {
  try {
    const regid = Number(req.params.regid);
    const { txnId, otp } = req.body;

    if (!txnId || !otp) {
      res.status(400).json({ success: false, message: 'Missing required fields: txnId, otp' });
      return;
    }

    // Look up the pending transaction
    const txn = pendingTransactions.get(txnId);
    if (!txn) {
      res.status(400).json({ success: false, message: 'Invalid or expired transaction. Please start over.' });
      return;
    }

    // Verify OTP
    if (otp !== txn.mockOtp) {
      res.status(400).json({ success: false, message: 'Invalid OTP. For sandbox testing, use: 123456' });
      return;
    }

    // Fetch patient name for mock profile generation
    const [patient] = await req.tenantDb
      .select({
        firstName: patients.firstName,
        surname: patients.surname,
        dob: patients.dob,
        gender: patients.gender,
      })
      .from(patients)
      .where(eq(patients.regid, regid))
      .limit(1);

    if (!patient) {
      res.status(404).json({ success: false, message: 'Patient not found' });
      return;
    }

    // Generate mock ABHA profile
    const mockAbhaNumber = generateMockAbhaNumber();
    const mockAbhaAddress = generateMockAbhaAddress(patient.firstName || 'user');

    // Clean up the transaction
    pendingTransactions.delete(txnId);

    logger.info({ regid, txnId }, 'ABHA OTP verified successfully (mock)');

    res.json({
      success: true,
      data: {
        verified: true,
        profile: {
          healthIdNumber: mockAbhaNumber,
          healthId: mockAbhaAddress,
          name: `${patient.firstName || ''} ${patient.surname || ''}`.trim(),
          firstName: patient.firstName || '',
          lastName: patient.surname || '',
          gender: patient.gender === 'M' ? 'Male' : patient.gender === 'F' ? 'Female' : 'Other',
          dateOfBirth: patient.dob || null,
          status: 'ACTIVE',
          kycVerified: true,
        },
      },
    });
  } catch (err: any) {
    logger.error({ err: err.message }, 'ABHA verification failed');
    res.status(500).json({ success: false, message: err.message });
  }
});


// ─── POST /api/abha/patients/:regid/link ────────────────────────────────────
// Step 3: Link the verified ABHA number to the patient's record
abhaRouter.post('/patients/:regid/link', authMiddleware, async (req: Request, res: Response) => {
  try {
    const regid = Number(req.params.regid);
    const { abhaNumber, abhaAddress } = req.body;

    if (!abhaNumber) {
      res.status(400).json({ success: false, message: 'Missing required field: abhaNumber' });
      return;
    }

    // Update the patient's abha_id in the database
    const [updated] = await req.tenantDb
      .update(patients)
      .set({
        abhaId: abhaNumber,
        updatedAt: new Date(),
      })
      .where(eq(patients.regid, regid))
      .returning({
        regid: patients.regid,
        firstName: patients.firstName,
        surname: patients.surname,
        abhaId: patients.abhaId,
      });

    if (!updated) {
      res.status(404).json({ success: false, message: 'Patient not found' });
      return;
    }

    logger.info({ regid, abhaNumber }, 'ABHA linked to patient');

    res.json({
      success: true,
      data: {
        regid: updated.regid,
        patientName: `${updated.firstName || ''} ${updated.surname || ''}`.trim(),
        abhaId: updated.abhaId,
        abhaAddress: abhaAddress || null,
        linkedAt: new Date().toISOString(),
        message: 'ABHA successfully linked to patient profile',
      },
    });
  } catch (err: any) {
    logger.error({ err: err.message }, 'ABHA linking failed');
    res.status(500).json({ success: false, message: err.message });
  }
});


// ─── POST /api/abha/patients/:regid/unlink ──────────────────────────────────
// Remove the ABHA link from the patient record
abhaRouter.post('/patients/:regid/unlink', authMiddleware, async (req: Request, res: Response) => {
  try {
    const regid = Number(req.params.regid);

    const [updated] = await req.tenantDb
      .update(patients)
      .set({
        abhaId: null,
        updatedAt: new Date(),
      })
      .where(eq(patients.regid, regid))
      .returning({
        regid: patients.regid,
        firstName: patients.firstName,
        surname: patients.surname,
      });

    if (!updated) {
      res.status(404).json({ success: false, message: 'Patient not found' });
      return;
    }

    logger.info({ regid }, 'ABHA unlinked from patient');

    res.json({
      success: true,
      data: {
        regid: updated.regid,
        patientName: `${updated.firstName || ''} ${updated.surname || ''}`.trim(),
        abhaId: null,
        unlinkedAt: new Date().toISOString(),
        message: 'ABHA successfully unlinked from patient profile',
      },
    });
  } catch (err: any) {
    logger.error({ err: err.message }, 'ABHA unlinking failed');
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── PHASE 3: HIU ENDPOINTS (Health Information User) ───────────────────────

// 1. Request Consent to view patient records
abhaRouter.post('/consents/request', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { abhaId, purpose, dateRange } = req.body;
    if (!abhaId) {
      res.status(400).json({ success: false, message: 'ABHA ID is required' });
      return;
    }

    logger.info({ abhaId, purpose }, 'Initiating Consent Request to patient');

    // In a real ABDM integration, you would call `POST /v0.5/consent-requests/init`
    // with the patient's ABHA ID and your HIU ID.
    // For now, we mock the response.
    const mockConsentId = `CON-${Math.floor(100000 + Math.random() * 900000)}`;

    res.json({
      success: true,
      data: {
        consentId: mockConsentId,
        status: 'REQUESTED',
        message: 'Consent request sent to patient app. Waiting for approval.',
      },
    });
  } catch (err: any) {
    logger.error({ err: err.message }, 'Consent request failed');
    res.status(500).json({ success: false, message: err.message });
  }
});

// 2. Poll Consent Status
abhaRouter.get('/consents/:id/status', authMiddleware, async (req: Request, res: Response) => {
  try {
    const consentId = req.params.id;
    
    // In a real integration, we'd check our database (updated by the webhook)
    // or call `POST /v0.5/consents/status`.
    
    // Mocking an approval after a few seconds of polling (usually done via UI polling)
    res.json({
      success: true,
      data: {
        consentId,
        status: 'GRANTED', // Can be REQUESTED, GRANTED, DENIED, REVOKED
        consentArtifactId: `ART-${Math.floor(1000 + Math.random() * 9000)}`,
        message: 'Patient has granted consent.',
      },
    });
  } catch (err: any) {
    logger.error({ err: err.message }, 'Consent status check failed');
    res.status(500).json({ success: false, message: err.message });
  }
});

// 3. Fetch Health Information
abhaRouter.post('/health-information/fetch', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { consentArtifactId } = req.body;
    if (!consentArtifactId) {
      res.status(400).json({ success: false, message: 'consentArtifactId is required' });
      return;
    }

    logger.info({ consentArtifactId }, 'Requesting health information from gateway');

    // In a real integration, we'd call `POST /v0.5/health-information/cm/request`
    // with our ECDH Public Key (generated by our abdm-crypto.service)
    
    const transactionId = `TXN-${Math.floor(100000 + Math.random() * 900000)}`;

    res.json({
      success: true,
      data: {
        transactionId,
        message: 'Health information fetch initiated. Data will arrive via webhook.',
      },
    });
  } catch (err: any) {
    logger.error({ err: err.message }, 'Health information fetch failed');
    res.status(500).json({ success: false, message: err.message });
  }
});

// 4. Retrieve Parsed Records (For UI Demo)
abhaRouter.get('/health-information/records', authMiddleware, async (req: Request, res: Response) => {
  try {
    // In a real app, we would look up the records parsed by the webhook from the database.
    // For now, we return mock data so the UI can be developed.
    res.json({
      success: true,
      data: [
        {
          id: 'rec-1',
          date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          hospitalName: 'Apollo Hospitals, Delhi',
          doctorName: 'Dr. R. Sharma',
          patientName: 'Mock Patient',
          diagnoses: ['Acute Pharyngitis', 'Mild Fever'],
          medications: [
            { name: 'Paracetamol 500mg', dosage: 'SOS' },
            { name: 'Azithromycin 500mg', dosage: '1 tablet daily for 3 days' }
          ]
        },
        {
          id: 'rec-2',
          date: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(),
          hospitalName: 'Max Super Speciality',
          doctorName: 'Dr. K. Verma',
          patientName: 'Mock Patient',
          diagnoses: ['Hypertension'],
          medications: [
            { name: 'Amlodipine 5mg', dosage: '1 tablet daily' }
          ]
        }
      ]
    });
  } catch (err: any) {
    logger.error({ err: err.message }, 'Failed to fetch parsed records');
    res.status(500).json({ success: false, message: err.message });
  }
});
