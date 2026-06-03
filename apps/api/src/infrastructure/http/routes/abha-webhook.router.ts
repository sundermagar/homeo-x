import { Router } from 'express';
import type { Request, Response, Router as IRouter } from 'express';
import { createLogger } from '../../../shared/logger.js';
import { FhirTransformerService } from '../../../domains/abha/services/fhir-transformer.service.js';
import { AbdmCryptoService } from '../../../domains/abha/services/abdm-crypto.service.js';
import { eq, or, ilike } from 'drizzle-orm';
import { patients, medicalCases } from '@mmc/database/schema';

const logger = createLogger('abha-webhook');

export const abhaWebhookRouter: IRouter = Router();

const fhirTransformer = new FhirTransformerService();
const cryptoService = new AbdmCryptoService();

// ─── PHASE 2: HIP WEBHOOKS (Health Information Provider) ─────────────────────

// 1. ABDM Gateway asks to discover Care Contexts (Prescriptions/Visits) for a patient
abhaWebhookRouter.post('/v0.5/care-contexts/discover', async (req: Request, res: Response) => {
  try {
    const { transactionId, patient } = req.body;
    logger.info({ transactionId, patient }, 'Received Care Context Discovery Request');

    // Acknowledge receipt
    res.status(202).json({
      timestamp: new Date().toISOString(),
      response: { requestId: req.body.requestId },
    });

    // Mock asynchronous discovery process
    // In a real app, you would query the `patients` table by patient.id (ABHA) or demographics,
    // then query `medicalCases` or `prescriptions` for that patient.
    setTimeout(() => {
      logger.info({ transactionId }, 'Mock Discovery: Found 2 care contexts for patient');
      // Then you would call POST /v0.5/care-contexts/on-discover to push the results back.
    }, 1000);

  } catch (err: any) {
    logger.error({ err: err.message }, 'Failed to process discovery request');
  }
});

// 2. ABDM Gateway initiates linking of discovered Care Contexts
abhaWebhookRouter.post('/v0.5/links/link/init', async (req: Request, res: Response) => {
  try {
    const { transactionId, patient } = req.body;
    logger.info({ transactionId }, 'Received Care Context Link Init Request');

    res.status(202).json({
      timestamp: new Date().toISOString(),
      response: { requestId: req.body.requestId },
    });

    setTimeout(() => {
      logger.info({ transactionId }, 'Mock Link Init: Generated OTP 123456');
      // Then call POST /v0.5/links/link/on-init with the communicationHint
    }, 1000);
  } catch (err: any) {
    logger.error({ err: err.message }, 'Failed to process link init request');
  }
});

// 3. ABDM Gateway confirms linking with OTP
abhaWebhookRouter.post('/v0.5/links/link/confirm', async (req: Request, res: Response) => {
  try {
    const { confirmation } = req.body;
    logger.info({ token: confirmation?.token }, 'Received Care Context Link Confirm Request');

    res.status(202).json({
      timestamp: new Date().toISOString(),
      response: { requestId: req.body.requestId },
    });

    setTimeout(() => {
      logger.info('Mock Link Confirm: Successfully linked care contexts to ABHA ID');
      // Then call POST /v0.5/links/link/on-confirm
    }, 1000);
  } catch (err: any) {
    logger.error({ err: err.message }, 'Failed to process link confirm request');
  }
});

// ─── POST /v0.5/consents/hip/notify ──────────────────────────────────────────
// ABDM Gateway calls this when a patient grants or revokes consent
abhaWebhookRouter.post('/v0.5/consents/hip/notify', async (req: Request, res: Response) => {
  try {
    const { notification } = req.body;
    logger.info({ consentId: notification?.consentDetail?.consentId }, 'Received HIP consent notification');

    // In a real application, you would store this consent artifact in the database
    // so you know you are authorized to share data for this patient.

    // Acknowledge receipt
    res.status(202).json({
      timestamp: new Date().toISOString(),
      response: {
        requestId: req.body.requestId,
      },
    });

    // Note: ABDM expects asynchronous processing. We should ideally dispatch a job
    // here to call `/v0.5/consents/hip/on-notify` with the status.

  } catch (err: any) {
    logger.error({ err: err.message }, 'Failed to process consent notification');
    res.status(500).json({ error: { message: err.message } });
  }
});

// ─── POST /v0.5/health-information/hip/request ─────────────────────────────
// ABDM Gateway calls this to request the actual health records
abhaWebhookRouter.post('/v0.5/health-information/hip/request', async (req: Request, res: Response) => {
  try {
    const { transactionId, hiRequest } = req.body;
    logger.info({ transactionId }, 'Received Health Information Request');

    // Acknowledge receipt immediately (HTTP 202)
    res.status(202).json({
      timestamp: new Date().toISOString(),
      response: {
        requestId: req.body.requestId,
      },
    });

    // The rest should happen asynchronously.
    // 1. Fetch patient data and prescriptions based on hiRequest.consent.id
    // 2. Generate FHIR bundle
    // 3. Encrypt data using provided receiver public key (hiRequest.keyMaterial)
    // 4. Push to ABDM `/v0.5/health-information/notify`
    
    // Asynchronous processing (Mocked Push)
    setTimeout(() => {
      try {
        const mockPrescription = {
          date: new Date(),
          medicines: [{ name: 'Arnica Montana', potency: '30CH', frequency: 'TDS', duration: '5 days' }]
        };
        
        const fhirBundle = fhirTransformer.generatePrescriptionBundle(
          { abhaId: 'mock-abha-id', name: 'Test Patient', gender: 'M' },
          { id: 'mock-doc-id', name: 'Dr. Hahnemann' },
          mockPrescription
        );

        const encryptedData = cryptoService.encrypt(
          JSON.stringify(fhirBundle),
          'my-private-key-base64', // from HIP config
          hiRequest.keyMaterial.dhPublicKey.keyValue,
          hiRequest.keyMaterial.nonce
        );

        logger.info({ 
          transactionId, 
          fhirBundleSize: JSON.stringify(fhirBundle).length,
          encryptedSize: encryptedData.encryptedData.length 
        }, '✅ Mock Data Push: Successfully generated FHIR and encrypted payload. Ready to push to ABDM!');
      } catch (e: any) {
        logger.error({ err: e.message }, 'Mock Data Push Failed');
      }
    }, 1500);

    logger.info('Asynchronous processing started for HI Request');

  } catch (err: any) {
    logger.error({ err: err.message }, 'Failed to process health info request');
  }
});

// ─── PHASE 3: HIU WEBHOOKS (Health Information User) ───────────────────────

// 1. ABDM Gateway notifies us that the patient granted/denied consent
abhaWebhookRouter.post('/v0.5/consents/hiu/notify', async (req: Request, res: Response) => {
  try {
    const { notification } = req.body;
    logger.info({ consentId: notification?.consentRequestId, status: notification?.status }, 'Received HIU consent notification');

    // Acknowledge receipt
    res.status(202).json({
      timestamp: new Date().toISOString(),
      response: {
        requestId: req.body.requestId,
      },
    });

    // We should update our database to mark the consent request as GRANTED or DENIED.
    
  } catch (err: any) {
    logger.error({ err: err.message }, 'Failed to process HIU consent notification');
    res.status(500).json({ error: { message: err.message } });
  }
});

// 2. ABDM Gateway confirms our fetch request is being processed
abhaWebhookRouter.post('/v0.5/health-information/hiu/on-request', async (req: Request, res: Response) => {
  try {
    const { hiRequest } = req.body;
    logger.info({ transactionId: hiRequest?.transactionId }, 'Received HIU on-request acknowledgment');

    res.status(202).json({
      timestamp: new Date().toISOString(),
      response: {
        requestId: req.body.requestId,
      },
    });
  } catch (err: any) {
    logger.error({ err: err.message }, 'Failed to process HIU on-request');
    res.status(500).json({ error: { message: err.message } });
  }
});

// 3. Data Push Endpoint: The external hospital pushes encrypted FHIR data here!
abhaWebhookRouter.post('/data-push', async (req: Request, res: Response) => {
  try {
    const { transactionId, entries, keyMaterial } = req.body;
    logger.info({ transactionId, entryCount: entries?.length }, 'Received Encrypted Health Data Push');

    res.status(202).json({
      timestamp: new Date().toISOString(),
      response: {
        requestId: req.body.requestId,
      },
    });

    // Asynchronous processing:
    // 1. Loop through entries (each entry is an encrypted FHIR bundle string)
    // 2. cryptoService.decrypt(entry.content, myPrivateKey, keyMaterial.dhPublicKey.keyValue, keyMaterial.nonce)
    // 3. fhirParser.parseBundle(decryptedJson)
    // 4. Save to temporary storage for the doctor to view, or broadcast via socket.io

  } catch (err: any) {
    logger.error({ err: err.message }, 'Failed to process incoming health data');
    res.status(500).json({ error: { message: err.message } });
  }
});
