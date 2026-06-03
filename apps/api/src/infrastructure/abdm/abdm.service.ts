/**
 * ABDM Gateway Service
 * 
 * HTTP client wrapper for communicating with the ABDM (Ayushman Bharat Digital Mission)
 * Gateway APIs. Handles session management (access token), and provides methods for
 * all outbound API calls to the NHA gateway.
 * 
 * Environment Variables Required:
 *   ABDM_CLIENT_ID       - Registered client ID from NHA
 *   ABDM_CLIENT_SECRET   - Registered client secret from NHA
 *   ABDM_GATEWAY_URL     - Gateway base URL (sandbox or production)
 *   ABDM_HIP_ID          - Your Health Information Provider ID
 *   ABDM_HIU_ID          - Your Health Information User ID
 */

import { createLogger } from '../../shared/logger.js';

const logger = createLogger('abdm-gateway');

// ─── Configuration ───────────────────────────────────────────────────────────

function getConfig() {
  return {
    clientId: process.env.ABDM_CLIENT_ID || '',
    clientSecret: process.env.ABDM_CLIENT_SECRET || '',
    gatewayUrl: process.env.ABDM_GATEWAY_URL || 'https://dev.abdm.gov.in/gateway',
    hipId: process.env.ABDM_HIP_ID || '',
    hiuId: process.env.ABDM_HIU_ID || '',
    hprUrl: process.env.ABDM_HPR_URL || 'https://hpr.abdm.gov.in/api/v1',
  };
}

// ─── Token Cache ─────────────────────────────────────────────────────────────

let cachedToken: { accessToken: string; expiresAt: number } | null = null;

// ─── Service Class ───────────────────────────────────────────────────────────

export class AbdmGatewayService {

  /**
   * Obtain a session token from the ABDM Gateway.
   * Tokens are cached until 60s before expiry.
   */
  async getAccessToken(): Promise<string> {
    const config = getConfig();

    if (!config.clientId || !config.clientSecret) {
      logger.warn('ABDM credentials not configured — returning mock token');
      return 'mock_abdm_token_' + Date.now();
    }

    // Return cached token if still valid
    if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
      return cachedToken.accessToken;
    }

    try {
      const response = await fetch(`${config.gatewayUrl}/v0.5/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: config.clientId,
          clientSecret: config.clientSecret,
          grantType: 'client_credentials',
        }),
        signal: AbortSignal.timeout(15000), // 15s timeout
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(`ABDM session failed (${response.status}): ${body}`);
      }

      const data = await response.json() as any;

      cachedToken = {
        accessToken: data.accessToken,
        expiresAt: Date.now() + (data.expiresIn || 1800) * 1000,
      };

      logger.info('Obtained ABDM access token');
      return cachedToken.accessToken;
    } catch (err: any) {
      if (err.name === 'TimeoutError' || err.code === 'ETIMEDOUT') {
        logger.error('ABDM session request timed out');
      } else {
        logger.error({ err: err.message }, 'Failed to get ABDM access token');
      }
      throw err;
    }
  }

  /**
   * Helper to make authenticated requests to the ABDM Gateway.
   */
  private async gatewayRequest(path: string, body: object, requestId?: string): Promise<any> {
    const config = getConfig();
    const token = await this.getAccessToken();
    const reqId = requestId || crypto.randomUUID();

    try {
      const response = await fetch(`${config.gatewayUrl}${path}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-CM-ID': 'sbx', // 'sbx' for sandbox, 'abdm' for production
        },
        body: JSON.stringify({
          requestId: reqId,
          timestamp: new Date().toISOString(),
          ...body,
        }),
        signal: AbortSignal.timeout(15000), // 15s timeout
      });

      if (!response.ok) {
        const errorBody = await response.text();
        logger.error({ status: response.status, body: errorBody, path }, 'ABDM Gateway request failed');
        throw new Error(`ABDM Gateway error (${response.status}): ${errorBody}`);
      }

      // Many ABDM APIs return 202 Accepted with empty body (async webhook pattern)
      const text = await response.text();
      return text ? JSON.parse(text) : { status: 'accepted' };
    } catch (err: any) {
      if (err.name === 'TimeoutError' || err.code === 'ETIMEDOUT') {
        logger.error({ path }, 'ABDM Gateway request timed out');
      }
      throw err;
    }
  }

  // ─── M1: ABHA Management ────────────────────────────────────────────────

  /**
   * Step 1a: Generate OTP for ABHA creation via Aadhaar
   */
  async generateAadhaarOtp(aadhaarNumber: string): Promise<any> {
    return this.gatewayRequest('/v1/registration/aadhaar/generateOtp', {
      aadhaar: aadhaarNumber,
    });
  }

  /**
   * Step 1b: Verify OTP for ABHA creation via Aadhaar
   */
  async verifyAadhaarOtp(txnId: string, otp: string): Promise<any> {
    return this.gatewayRequest('/v1/registration/aadhaar/verifyOtp', {
      txnId,
      otp,
    });
  }

  /**
   * Step 2: Create ABHA Health ID after OTP verification
   */
  async createHealthId(txnId: string): Promise<any> {
    return this.gatewayRequest('/v1/registration/aadhaar/createHealthIdByAdhaar', {
      txnId,
    });
  }

  /**
   * Verify an existing ABHA ID / Health ID
   */
  async verifyAbha(healthId: string): Promise<any> {
    return this.gatewayRequest('/v1/search/searchByHealthId', {
      healthId,
    });
  }

  // ─── M1: Care Context Linking ───────────────────────────────────────────

  /**
   * Add a new care context (visit/consultation) to a patient's ABHA profile.
   * This tells ABDM: "Patient X had a visit at our facility."
   */
  async addCareContext(patientAbhaId: string, careContexts: Array<{ referenceNumber: string; display: string }>): Promise<any> {
    const config = getConfig();
    return this.gatewayRequest('/v0.5/links/link/add-contexts', {
      link: {
        accessToken: await this.getAccessToken(),
        patient: {
          referenceNumber: patientAbhaId,
          display: patientAbhaId,
          careContexts: careContexts.map(ctx => ({
            referenceNumber: ctx.referenceNumber,
            display: ctx.display,
          })),
        },
      },
    });
  }

  // ─── M2: HIP - Respond to Data Requests ────────────────────────────────

  /**
   * Acknowledge a consent notification from ABDM (HIP on-notify).
   * Called when ABDM informs us that a patient granted consent.
   */
  async acknowledgeConsent(consentId: string, status: 'OK' | 'ERROR'): Promise<any> {
    return this.gatewayRequest('/v0.5/consents/hip/on-notify', {
      acknowledgement: {
        status,
        consentId,
      },
    });
  }

  /**
   * Send encrypted health information to the ABDM gateway.
   * Called in response to a /health-information/hip/request webhook.
   */
  async sendHealthInformation(
    transactionId: string,
    entries: Array<{ content: string; media: string; checksum: string; careContextReference: string }>,
    keyMaterial: object,
  ): Promise<any> {
    return this.gatewayRequest('/v0.5/health-information/transfer', {
      transactionId,
      entries,
      keyMaterial,
    });
  }

  // ─── M3: HIU - Request Patient Records ─────────────────────────────────

  /**
   * Initiate a consent request to view a patient's health records.
   */
  async initConsentRequest(
    patientAbhaId: string,
    purpose: string,
    hiTypes: string[],
    dateRange: { from: string; to: string },
  ): Promise<any> {
    const config = getConfig();
    return this.gatewayRequest('/v0.5/consent-requests/init', {
      consent: {
        purpose: {
          text: purpose,
          code: 'CAREMGT', // Care Management
        },
        patient: { id: patientAbhaId },
        hiu: { id: config.hiuId },
        requester: {
          name: 'MMC HomeoX',
          identifier: {
            type: 'REGNO',
            value: config.hiuId,
            system: 'https://mmc.homeox.in',
          },
        },
        hiTypes,
        permission: {
          accessMode: 'VIEW',
          dateRange,
          dataEraseAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
          frequency: { unit: 'HOUR', value: 1, repeats: 0 },
        },
      },
    });
  }

  /**
   * Request health information transfer after consent is granted.
   */
  async requestHealthInformation(
    consentId: string,
    keyMaterial: object,
    dateRange: { from: string; to: string },
  ): Promise<any> {
    return this.gatewayRequest('/v0.5/health-information/cm/request', {
      hiRequest: {
        consent: { id: consentId },
        dateRange,
        dataPushUrl: `${process.env.API_BASE_URL || 'https://api.yourdomain.com'}/v0.5/health-information/hiu/on-request`,
        keyMaterial,
      },
    });
  }

  // ─── HPR: Doctor Verification ───────────────────────────────────────────

  /**
   * Verify a Healthcare Professional's registration via HPR Registry.
   */
  async verifyHprId(hprId: string): Promise<any> {
    const config = getConfig();
    const token = await this.getAccessToken();

    const response = await fetch(`${config.hprUrl}/search/searchByHprId`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ hprId }),
    });

    if (!response.ok) {
      throw new Error(`HPR verification failed (${response.status})`);
    }

    return response.json();
  }
}

// Singleton
export const abdmGateway = new AbdmGatewayService();
