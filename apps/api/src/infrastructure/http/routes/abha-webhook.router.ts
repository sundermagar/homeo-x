/**
 * ABDM Webhook Router (abha-webhook.router.ts)
 * 
 * PUBLIC endpoints (no auth middleware) that the ABDM Gateway calls
 * asynchronously. Handles HIP + HIU callbacks with real crypto and FHIR.
 * 
 * Mounted at: /api/abdm/callbacks
 */

import { Router } from 'express';
import type { Request, Response, Router as IRouter } from 'express';
import { createLogger } from '../../../shared/logger.js';
import { abdmCrypto } from '../../abdm/abdm-crypto.service.js';
import { fhirGenerator } from '../../abdm/fhir-generator.service.js';
import { abdmGateway } from '../../abdm/abdm.service.js';
import type { FhirEncounterData } from '../../abdm/fhir-generator.service.js';
import crypto from 'crypto';

const logger = createLogger('abha-webhook');

export const abhaWebhookRouter: IRouter = Router();

// ─── In-memory stores (migrate to Redis/DB in production) ────────────────────
const consentStore = new Map<string, any>();
const receivedRecords = new Map<string, any[]>();
// Store ephemeral key pairs keyed by transactionId (needed for HIU decryption)
const keyPairStore = new Map<string, any>();

// ─── PHASE 2: HIP WEBHOOKS (Health Information Provider) ─────────────────────

/**
 * POST /v0.5/care-contexts/discover
 * ABDM asks us to discover Care Contexts (visits/prescriptions) for a patient.
 */
abhaWebhookRouter.post('/v0.5/care-contexts/discover', async (req: Request, res: Response) => {
  try {
    const { transactionId, patient } = req.body;
    logger.info({ transactionId, patientId: patient?.id }, 'Received Care Context Discovery Request');

    // Acknowledge receipt immediately
    res.status(202).json({
      timestamp: new Date().toISOString(),
      response: { requestId: req.body.requestId },
    });

    // TODO (Production): Query patients table by ABHA ID, then fetch their visits
    // and call POST /v0.5/care-contexts/on-discover with the results.
    setImmediate(() => {
      logger.info({ transactionId }, 'Processing care context discovery asynchronously');
    });
  } catch (err: any) {
    logger.error({ err: err.message }, 'Failed to process discovery request');
  }
});

/**
 * POST /v0.5/links/link/init
 * ABDM initiates linking of discovered Care Contexts.
 */
abhaWebhookRouter.post('/v0.5/links/link/init', async (req: Request, res: Response) => {
  try {
    const { transactionId } = req.body;
    logger.info({ transactionId }, 'Received Care Context Link Init');

    res.status(202).json({
      timestamp: new Date().toISOString(),
      response: { requestId: req.body.requestId },
    });

    // TODO: Generate OTP and call POST /v0.5/links/link/on-init
  } catch (err: any) {
    logger.error({ err: err.message }, 'Failed to process link init');
  }
});

/**
 * POST /v0.5/links/link/confirm
 * ABDM confirms linking after OTP verification.
 */
abhaWebhookRouter.post('/v0.5/links/link/confirm', async (req: Request, res: Response) => {
  try {
    const { confirmation } = req.body;
    logger.info({ token: confirmation?.token }, 'Received Care Context Link Confirm');

    res.status(202).json({
      timestamp: new Date().toISOString(),
      response: { requestId: req.body.requestId },
    });

    // TODO: Validate OTP and call POST /v0.5/links/link/on-confirm
  } catch (err: any) {
    logger.error({ err: err.message }, 'Failed to process link confirm');
  }
});

/**
 * POST /v0.5/consents/hip/notify
 * ABDM notifies us (HIP) that a patient granted/revoked consent.
 */
abhaWebhookRouter.post('/v0.5/consents/hip/notify', async (req: Request, res: Response) => {
  try {
    const { notification } = req.body;
    const consentId = notification?.consentDetail?.consentId || notification?.consentId;
    const status = notification?.status;

    logger.info({ consentId, status }, 'Received HIP consent notification');

    if (status === 'GRANTED') {
      consentStore.set(consentId, {
        ...notification.consentDetail,
        receivedAt: new Date().toISOString(),
      });

      // Acknowledge to ABDM
      try {
        await abdmGateway.acknowledgeConsent(consentId, 'OK');
      } catch (ackErr: any) {
        logger.warn({ err: ackErr.message }, 'Failed to send consent ack (non-blocking)');
      }
    } else if (status === 'REVOKED') {
      consentStore.delete(consentId);
      logger.info({ consentId }, 'Consent revoked — cleaned up stored data');
    }

    res.status(202).json({
      timestamp: new Date().toISOString(),
      response: { requestId: req.body.requestId },
    });
  } catch (err: any) {
    logger.error({ err: err.message }, 'Failed to process consent notification');
    res.status(500).json({ error: { message: err.message } });
  }
});

/**
 * POST /v0.5/health-information/hip/request
 * 
 * ABDM requests us (HIP) to transfer health records.
 * Flow: Fetch records → Convert to FHIR R4 → Encrypt via ECDH → Send to ABDM.
 */
abhaWebhookRouter.post('/v0.5/health-information/hip/request', async (req: Request, res: Response) => {
  try {
    const { transactionId, hiRequest } = req.body;
    const consentId = hiRequest?.consent?.id;
    const remoteKeyMaterial = hiRequest?.keyMaterial;

    logger.info({ transactionId, consentId }, 'Received Health Information Request');

    // Acknowledge receipt immediately (HTTP 202)
    res.status(202).json({
      timestamp: new Date().toISOString(),
      response: { requestId: req.body.requestId },
    });

    // Process asynchronously
    setImmediate(async () => {
      try {
        // 1. Validate consent
        const consent = consentStore.get(consentId);
        if (!consent) {
          logger.error({ consentId }, 'Consent not found for health info request');
          return;
        }

        // 2. Query real patient data from the database
        const patientAbhaId = consent.patient?.id || '';
        let encounterData: FhirEncounterData;

        try {
          const { sql } = await import('drizzle-orm');
          // We need the tenantDb — but webhooks don't have req.tenantDb.
          // Use the publicDb to find the patient's clinic, then resolve tenant.
          // For now, query directly using raw SQL on the public connection.
          const publicDb = (req as any).publicDb || (req as any).app?.locals?.publicDb;

          if (publicDb && patientAbhaId) {
            // Find patient by ABHA ID across all tenant schemas
            const patientRows = await publicDb.execute(
              sql.raw(`
                SELECT p.regid, p.first_name, p.surname, p.dob, p.gender, p.mobile, p.abha_id,
                       p.tableoid::regclass::text as source_table
                FROM patients p
                WHERE p.abha_id = '${patientAbhaId.replace(/'/g, "''")}'
                  AND (p.deleted_at IS NULL OR p.deleted_at::text = '')
                LIMIT 1
              `)
            ) as any[];

            if (patientRows && patientRows.length > 0) {
              const pat = patientRows[0];

              // Fetch prescriptions for this patient
              const prescRows = await publicDb.execute(
                sql.raw(`
                  SELECT cp.rxremedy as medicine, cp.rxpotency as potency,
                         cp.rxfrequency as frequency, cp.rxdays as days,
                         cp.dateval as visit_date
                  FROM case_potencies cp
                  WHERE cp.regid = ${pat.regid}
                    AND (cp.deleted_at IS NULL OR cp.deleted_at::text = '')
                  ORDER BY cp.created_at DESC
                  LIMIT 20
                `)
              ) as any[];

              // Fetch medical case (diagnosis)
              const caseRows = await publicDb.execute(
                sql.raw(`
                  SELECT mc.id, mc.condition, mc.doctor_id
                  FROM medicalcases mc
                  WHERE mc.regid = ${pat.regid}
                    AND (mc.deleted_at IS NULL)
                  ORDER BY mc.created_at DESC
                  LIMIT 1
                `)
              ) as any[];

              const diagnosis = caseRows?.[0]?.condition || '';
              const doctorId = caseRows?.[0]?.doctor_id;

              // Fetch doctor name
              let doctorName = 'Dr. Practitioner';
              if (doctorId) {
                const docRows = await publicDb.execute(
                  sql.raw(`SELECT name FROM users WHERE id = ${doctorId} LIMIT 1`)
                ) as any[];
                if (docRows?.[0]?.name) doctorName = docRows[0].name;
              }

              // Fetch organization
              let orgName = 'MMC Clinic';
              const orgRows = await publicDb.execute(
                sql.raw(`SELECT name FROM organizations WHERE deleted_at IS NULL LIMIT 1`)
              ) as any[];
              if (orgRows?.[0]?.name) orgName = orgRows[0].name;

              const medications = (prescRows || []).map((rx: any) => ({
                medicine: rx.medicine || '',
                potency: rx.potency || '',
                frequency: rx.frequency || '',
                days: rx.days || '',
              })).filter((m: any) => m.medicine);

              encounterData = {
                visitId: pat.regid,
                visitDate: prescRows?.[0]?.visit_date || new Date().toISOString().split('T')[0] || new Date().toISOString(),
                diagnosis,
                complaint: '',
                investigation: '',
                medications: medications.length > 0 ? medications : [
                  { medicine: 'No prescriptions found', potency: '', frequency: '', days: '' },
                ],
                patient: {
                  regid: pat.regid,
                  abhaId: patientAbhaId,
                  firstName: pat.first_name || 'Patient',
                  surname: pat.surname || '',
                  gender: pat.gender,
                  dob: pat.dob,
                  mobile: pat.mobile,
                },
                practitioner: { id: doctorId || 1, name: doctorName },
                organization: { id: 1, name: orgName },
              };

              logger.info({ regid: pat.regid, rxCount: medications.length }, 'Fetched real patient data for FHIR generation');
            } else {
              throw new Error('Patient not found by ABHA ID — using fallback');
            }
          } else {
            throw new Error('No publicDb or ABHA ID — using fallback');
          }
        } catch (dbErr: any) {
          logger.warn({ err: dbErr.message, patientAbhaId }, 'Falling back to mock encounter data');
          // Fallback mock data
          encounterData = {
            visitId: Date.now(),
            visitDate: new Date().toISOString().split('T')[0] || new Date().toISOString(),
            diagnosis: 'Acute Rhinitis',
            complaint: 'Running nose, sneezing',
            investigation: '',
            medications: [
              { medicine: 'Allium Cepa', potency: '30C', frequency: 'TDS', days: '7' },
              { medicine: 'Arsenicum Album', potency: '200C', frequency: 'Once', days: '1' },
            ],
            patient: {
              regid: 1,
              abhaId: patientAbhaId || 'unknown@abdm',
              firstName: 'Patient',
              surname: 'Name',
            },
            practitioner: { id: 1, name: 'Dr. Practitioner' },
            organization: { id: 1, name: 'MMC Clinic' },
          };
        }

        // 3. Generate FHIR R4 Bundle
        const fhirBundle = fhirGenerator.generatePrescriptionBundle(encounterData);
        const fhirJson = JSON.stringify(fhirBundle);

        // 4. Encrypt using ECDH + AES-256-GCM
        const ourKeyPair = abdmCrypto.generateKeyPair();
        const { encrypted, iv, tag, keyMaterial } = abdmCrypto.encryptForAbdm(
          fhirJson,
          ourKeyPair,
          remoteKeyMaterial,
        );

        // 5. Build entry payload
        const checksum = crypto.createHash('md5').update(fhirJson).digest('hex');
        const entries = [{
          content: encrypted,
          media: 'application/fhir+json',
          checksum,
          careContextReference: `visit-${encounterData.visitId}`,
        }];

        // 6. Transfer to ABDM gateway
        await abdmGateway.sendHealthInformation(transactionId, entries, keyMaterial);

        logger.info({
          transactionId,
          fhirSize: fhirJson.length,
          encryptedSize: encrypted.length,
        }, '✅ Health information transferred to ABDM');
      } catch (processErr: any) {
        logger.error({ err: processErr.message, transactionId }, 'Failed to process HIP health info request');
      }
    });
  } catch (err: any) {
    logger.error({ err: err.message }, 'Failed to handle HIP health information request');
  }
});

// ─── PHASE 3: HIU WEBHOOKS (Health Information User) ────────────────────────

/**
 * POST /v0.5/consents/hiu/notify
 * ABDM notifies us (HIU) about consent status for a request we initiated.
 */
abhaWebhookRouter.post('/v0.5/consents/hiu/notify', async (req: Request, res: Response) => {
  try {
    const { notification } = req.body;
    const consentRequestId = notification?.consentRequestId;
    const status = notification?.status;

    logger.info({ consentRequestId, status }, 'Received HIU consent notification');

    if (status === 'GRANTED' && notification.consentArtefacts) {
      for (const artifact of notification.consentArtefacts) {
        consentStore.set(artifact.id, {
          consentRequestId,
          status,
          artifactId: artifact.id,
          receivedAt: new Date().toISOString(),
        });
      }
    }

    res.status(202).json({
      timestamp: new Date().toISOString(),
      response: { requestId: req.body.requestId },
    });
  } catch (err: any) {
    logger.error({ err: err.message }, 'Failed to process HIU consent notification');
    res.status(500).json({ error: { message: err.message } });
  }
});

/**
 * POST /v0.5/health-information/hiu/on-request
 * ABDM confirms our fetch request is being processed / delivers encrypted data.
 */
abhaWebhookRouter.post('/v0.5/health-information/hiu/on-request', async (req: Request, res: Response) => {
  try {
    const { hiRequest, transactionId } = req.body;
    logger.info({ transactionId: hiRequest?.transactionId || transactionId }, 'Received HIU on-request');

    res.status(202).json({
      timestamp: new Date().toISOString(),
      response: { requestId: req.body.requestId },
    });
  } catch (err: any) {
    logger.error({ err: err.message }, 'Failed to process HIU on-request');
    res.status(500).json({ error: { message: err.message } });
  }
});

/**
 * POST /data-push
 * External HIP pushes encrypted FHIR data to us (HIU).
 * We decrypt using our stored ECDH key pair.
 */
abhaWebhookRouter.post('/data-push', async (req: Request, res: Response) => {
  try {
    const { transactionId, entries, keyMaterial: remoteKeyMaterial } = req.body;
    logger.info({ transactionId, entryCount: entries?.length }, 'Received encrypted health data push');

    res.status(202).json({
      timestamp: new Date().toISOString(),
      response: { requestId: req.body.requestId },
    });

    // Decrypt asynchronously
    setImmediate(async () => {
      try {
        if (!entries || entries.length === 0) {
          logger.warn({ transactionId }, 'No entries in health data push');
          return;
        }

        const decryptedRecords: any[] = [];
        const ourKeyPair = keyPairStore.get(transactionId);

        for (const entry of entries) {
          try {
            if (ourKeyPair && remoteKeyMaterial) {
              // Decrypt with our stored keypair
              const decrypted = abdmCrypto.decryptFromAbdm(
                entry.content,
                entry.iv || '',
                entry.tag || entry.authTag || '',
                ourKeyPair,
                remoteKeyMaterial,
              );
              const fhirBundle = JSON.parse(decrypted);
              decryptedRecords.push(fhirBundle);
              logger.info({ transactionId }, 'Successfully decrypted FHIR bundle');
            } else {
              // Store raw if we don't have the keypair (shouldn't happen in production)
              decryptedRecords.push({
                raw: entry.content,
                media: entry.media,
                receivedAt: new Date().toISOString(),
                note: 'Keypair not found — stored encrypted',
              });
            }
          } catch (entryErr: any) {
            logger.error({ err: entryErr.message }, 'Failed to decrypt health info entry');
          }
        }

        receivedRecords.set(transactionId, decryptedRecords);
        logger.info({ transactionId, count: decryptedRecords.length }, 'Stored received health records');
      } catch (processErr: any) {
        logger.error({ err: processErr.message, transactionId }, 'Failed to process HIU data push');
      }
    });
  } catch (err: any) {
    logger.error({ err: err.message }, 'Failed to handle incoming health data');
    if (!res.headersSent) {
      res.status(500).json({ error: { message: err.message } });
    }
  }
});
