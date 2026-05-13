# 🛡️ DPDP Act Compliance — Kreed.health

**Document Version:** 2.0  
**Audit Date:** 2026-05-13  
**Regulation:** Digital Personal Data Protection Act, 2023 + DPDP Rules, 2025  
**Platform:** Kreed.health — Homeopathic Clinic Management (Multi-Tenant SaaS)  
**Compliance Deadline:** Full compliance required by **May 13, 2027**

---

## What is the DPDP Act?

The **Digital Personal Data Protection Act, 2023** (DPDPA) is India's primary data protection law. The **DPDP Rules, 2025** (notified Nov 13, 2025) operationalize the Act. As a healthcare SaaS platform processing patient health data, **Kreed.health is a Data Fiduciary** under this Act.

### Why This Matters for Kreed.health

| Factor | Our Reality |
|--------|------------|
| **Data Type** | Health records, diagnoses, prescriptions, vitals — **Sensitive Personal Data** |
| **Scale** | 22 clinic tenants, thousands of patient records |
| **AI Processing** | Patient symptoms sent to external AI (Gemini, Groq) |
| **Third Parties** | 8+ vendors (SMS, WhatsApp, payments, video, AI) |
| **Children** | Pediatric patients = children's data = stricter rules |

### Penalty Structure (Non-Compliance)

| Violation | Maximum Fine |
|-----------|-------------|
| Failure to implement security safeguards (data breach) | **₹250 Crores** |
| Failure to notify Board/patients of breach | ₹200 Crores |
| Violation of children's data rules | ₹200 Crores |
| Failure to fulfill Data Principal rights | ₹200 Crores |
| Other non-compliance | ₹50 Crores |

---

## Compliance Scorecard — Current State

| # | DPDP Requirement | Section | Status | Priority |
|---|-----------------|---------|--------|----------|
| 1 | Lawful Purpose & Consent | Sec 4, 6, 7 | ❌ Not implemented | 🔴 Critical |
| 2 | Notice Before Collection | Sec 5 | ❌ Placeholder only | 🔴 Critical |
| 3 | Reasonable Security Safeguards | Sec 8(4) | ⚠️ Major gaps | 🔴 Critical |
| 4 | Data Breach Notification | Sec 8(6) | ❌ Not implemented | 🟠 High |
| 5 | Data Retention & Erasure | Sec 8(7) | ❌ Not implemented | 🟠 High |
| 6 | Right to Access | Sec 11 | ❌ Not implemented | 🟠 High |
| 7 | Right to Correction & Erasure | Sec 12, 13 | ⚠️ Partial (soft-delete) | 🟠 High |
| 8 | Right to Nominate | Sec 14 | ❌ Not implemented | 🟡 Medium |
| 9 | Grievance Redressal | Sec 13 | ❌ Not implemented | 🟡 Medium |
| 10 | Children's Data (Parental Consent) | Sec 9 | ❌ Not implemented | 🟡 Medium |
| 11 | Data Processing Agreements | Sec 8(2) | ❌ No vendor DPAs | 🟡 Medium |
| 12 | Cross-border Transfer Rules | Sec 16 | ⚠️ AI calls go abroad | 🟡 Medium |

---

## 🔴 PHASE 1 — Security Safeguards (Week 1–2)

> **DPDP Sec 8(4):** "The Data Fiduciary shall protect personal data by taking reasonable security safeguards to prevent a personal data breach."

This is the highest-risk area. A breach with inadequate safeguards = **₹250 Crore penalty**.

---

### 1.1 Remove Authentication Backdoors

**Why:** A backdoor password means ANY person can access ALL patient data. This is the opposite of "reasonable security safeguards."

#### 1.1.1 — Remove hardcoded backdoor password ✅

**File:** `apps/api/src/domains/auth/use-cases/login.use-case.ts` (Lines 31–34)

**Current (VULNERABLE):**
```typescript
if (!isMatch && password !== 'kreedhealth_admin_pass') {
  return fail('Invalid credentials', 'UNAUTHORIZED');
}
```

**Change to:**
```typescript
if (!isMatch) {
  return fail('Invalid credentials', 'UNAUTHORIZED');
}
```

#### 1.1.2 — Gate demo tokens to development only ✅

**File:** `apps/api/src/infrastructure/http/middleware/auth.ts` (Lines 37–60)

**Wrap the DEMO_USERS block:**
```typescript
const isDev = process.env.NODE_ENV !== 'production';
if (isDev && DEMO_USERS[token]) {
  // ... existing demo logic
}
```

#### 1.1.3 — Remove debug routes ✅

**File:** `apps/api/src/infrastructure/http/routes/health.ts` (Lines 32–96)

**Action:** Delete the `/seed-demo-users` and `/reset-admin-password` routes entirely. These echo plaintext passwords in responses.

#### 1.1.4 — Remove JWT fallback secret ✅

**File:** `apps/api/src/infrastructure/http/middleware/auth.ts` (Line 63)

**Current:** `jwt.verify(token, process.env.JWT_SECRET || 'dev-secret')`  
**Change to:**
```typescript
const secret = process.env.JWT_SECRET;
if (!secret) throw new Error('FATAL: JWT_SECRET is required');
const payload = jwt.verify(token, secret) as AuthTokenPayload;
```

✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅- DONE CHANGES

---

### 1.2 Fix Authentication Gaps on PHI Routes

**Why:** Multiple routes serving patient data have NO authentication. Anyone with the URL can read/modify medical records.

**File:** `apps/api/src/infrastructure/http/app.ts`

**Routes that need `authMiddleware` added:**

| Route Mount | Line | Fix |
|-------------|------|-----|
| `/api/patients` (individual GET/PUT/DELETE) | `patient.router.ts:135,177,201` | Add `authMiddleware` to each handler |
| `/api/billing` | app.ts:138 | Add `authMiddleware` before `createBillingRouter()` |
| `/api/payments` | app.ts:139 | Add `authMiddleware` before `createPaymentRouter()` |
| `/api/appointments` | app.ts:128 | Add `authMiddleware` before `appointmentsRouter` |
| `/api/medical-cases` | app.ts:129 | Add `authMiddleware` before `medicalCasesRouter` |
| `/api/video-call` | app.ts:185 | Add `authMiddleware` (at minimum for doctor token) |
| `/api/public-clinicadmins` | app.ts:149 | Delete this unauthenticated route |
| `/api/terminology` | app.ts:156 | Add `authMiddleware` |
| `/uploads/*` (static files) | app.ts:105 | Replace with authenticated download endpoint |

✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅- DONE CHANGES
---

### 1.3 Stop Leaking Internal Data to Clients

**Why:** Error responses currently expose database structure, file paths, and stack traces — aiding attackers.

#### 1.3.1 — Hide stack traces in production

**File:** `apps/api/src/infrastructure/http/middleware/error-handler.ts` (Lines 48–55)

**Change the unhandled error block to:**
```typescript
const isDev = process.env.NODE_ENV !== 'production';
res.status(500).json({
  success: false,
  error: isDev ? err.message : 'An internal error occurred. Contact support with your correlationId.',
  ...(isDev && { stack: err.stack }),
  code: 'INTERNAL_ERROR',
  correlationId,
});
```

#### 1.3.2 — Remove stack trace from patient router

**File:** `apps/api/src/infrastructure/http/routes/patient.router.ts` (Line 95)

**Remove:** `stack: err.stack` from the error response.

#### 1.3.3 — Remove console.log from auth domain

**File:** `apps/api/src/domains/auth/use-cases/login.use-case.ts` (Lines 19, 29, 35, 39, 42)

**Action:** Delete all 5 `console.log` / `console.warn` statements. These log email addresses and password match results to stdout.

✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅- DONE CHANGES
---

### 1.4 Enable Encryption

#### 1.4.1 — Database SSL/TLS (Data in Transit)

**File:** `packages/database/src/client.ts` (Line 30)

**Add SSL config:**
```typescript
const connectionOptions: Record<string, any> = {
  max: Number(process.env['DB_MAX_CONNECTIONS'] || 10),
  idle_timeout: Number(process.env['DB_IDLE_TIMEOUT'] || 300),
  max_lifetime: Number(process.env['DB_MAX_LIFETIME'] || 1800),
  connect_timeout: Number(process.env['DB_CONNECT_TIMEOUT'] || 15),
  keep_alive: 60,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: true } : false,
};
```

#### 1.4.2 — Verify Encryption at Rest

**Action (Ops):** Confirm with your hosting provider (Railway/Supabase) that PostgreSQL disk encryption is enabled. Document the confirmation.

#### 1.4.3 — Enable Content Security Policy

**File:** `apps/api/src/infrastructure/http/app.ts` (Line 81)

**Change from:** `contentSecurityPolicy: false`  
**Change to:** `contentSecurityPolicy: { directives: { defaultSrc: ["'self'"], scriptSrc: ["'self'"], styleSrc: ["'self'", "'unsafe-inline'"] } }`

---

### 1.5 Fix Session Management

#### 1.5.1 — Check JWT blacklist on every request

**File:** `apps/api/src/infrastructure/http/middleware/auth.ts`

After `jwt.verify()`, add:
```typescript
import { redisService } from '../../../infrastructure/cache/redis.js';

// After jwt.verify succeeds:
if (redisService.isConnected()) {
  const isBlacklisted = await redisService.exists(`blacklist:${token}`);
  if (isBlacklisted) throw new UnauthorizedError('Token has been revoked');
}
```

#### 1.5.2 — Reduce JWT expiry

**File:** `apps/api/src/shared/config/app-config.ts` (Line 24)

**Change:** `expiresIn: process.env.JWT_EXPIRES_IN || '24h'` → `'30m'`

Implement refresh token rotation using the existing `JWT_REFRESH_SECRET` env var.

#### 1.5.3 — Move token from localStorage to httpOnly cookies

**File:** `apps/web/src/shared/stores/auth-store.ts`

**Industry approach (2026):** Set JWT as `httpOnly`, `Secure`, `SameSite=Strict` cookie on login response. Remove `persist` from Zustand. Update `api-client.ts` to stop sending `Authorization` header (cookie is sent automatically).

---

## 🔴 PHASE 2 — Consent & Notice (Week 3–4)

> **DPDP Sec 5:** "Before collecting data, the Data Fiduciary shall give notice with: (a) the personal data to be collected, (b) the purpose, (c) how to exercise rights, (d) how to complain to the Board."
>
> **DPDP Sec 6:** "Consent must be free, specific, informed, unconditional, unambiguous, with clear affirmative action."
>
> **DPDP Sec 7:** "The Data Principal may withdraw consent at any time."

---

### 2.1 Create Consent Infrastructure

#### Step 1 — Database Table

**File to create:** Add to `packages/database/src/schema/consent.ts`

```sql
CREATE TABLE consent_records (
  id              SERIAL PRIMARY KEY,
  patient_regid   INTEGER NOT NULL REFERENCES patients(regid),
  consent_type    VARCHAR(50) NOT NULL,
  purpose         TEXT NOT NULL,
  granted         BOOLEAN NOT NULL DEFAULT false,
  granted_at      TIMESTAMP,
  revoked_at      TIMESTAMP,
  ip_address      VARCHAR(45),
  user_agent      TEXT,
  consent_version INTEGER DEFAULT 1,
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);
```

**Consent types needed:**

| Type | When Collected | Purpose |
|------|---------------|---------|
| `data_processing` | Patient registration | Store and process health records |
| `ai_analysis` | Before AI consultation | Send symptoms to AI for analysis |
| `sms_communication` | Patient registration | Send appointment reminders via SMS |
| `whatsapp_communication` | Patient registration | Send messages via WhatsApp |
| `data_sharing_pharmacy` | Prescription generation | Share prescription with pharmacy |

#### Step 2 — API Endpoints

**Create:** `apps/api/src/domains/consent/` (new domain)

```
domains/consent/
├── ports/consent.repository.ts
├── use-cases/
│   ├── grant-consent.ts
│   ├── revoke-consent.ts
│   └── get-consent-status.ts
```

**Endpoints:**
- `POST /api/consent` — Record new consent
- `GET /api/consent/:regid` — Get all consent statuses for a patient
- `DELETE /api/consent/:id` — Revoke specific consent
- `GET /api/consent/:regid/check/:type` — Quick check before processing

#### Step 3 — Frontend Integration

- Add consent checkboxes to **patient registration form**
- Add consent modal before **AI consultation start**
- Add consent management section in **patient profile page**
- Show consent status badges in **patient detail header**

---

### 2.2 Create Privacy Notice

**File:** Replace placeholder in `packages/database/src/seeds/cms-seed.ts`

**Also create:** `docs/compliance/privacy-notice.md`

**Required contents (per Sec 5):**

1. **What data we collect:** Name, phone, email, address, DOB, gender, medical history, symptoms, prescriptions, vitals, billing
2. **Why we collect it:** Treatment, billing, appointment management, AI-assisted diagnosis
3. **Who we share with:** AI providers (anonymized), SMS gateway, payment processor
4. **How long we keep it:** Clinical records: 10 years, Billing: 7 years, Logs: 3 years
5. **Your rights:** Access, correction, erasure, data portability, complaint to DPB
6. **Contact:** Data Protection Officer details, grievance email
7. **Language:** Must be in English AND Hindi (or regional language of clinic's state)

---

## 🟠 PHASE 3 — Data Principal Rights (Week 5–6)

> **Sec 11:** Right to access summary of data and processing activities  
> **Sec 12:** Right to correction and erasure  
> **Sec 13:** Grievance redressal  
> **Sec 14:** Right to nominate (in case of death/incapacity)

---

### 3.1 Right to Access (Sec 11)

**Create:** `GET /api/data-rights/access/:regid`

Returns a structured summary:
```json
{
  "personalData": { "name": "...", "phone": "...", "email": "..." },
  "healthRecords": { "totalVisits": 24, "lastVisit": "2026-04-15" },
  "consentHistory": [...],
  "dataSharedWith": ["AI Provider (anonymized)", "SMS Gateway"],
  "retentionPolicy": "Clinical records retained for 10 years from last visit",
  "generatedAt": "2026-05-13T12:00:00Z"
}
```

### 3.2 Right to Correction (Sec 12)

**Create:** `POST /api/data-rights/correction-request`

Allow patients (via clinic staff) to request corrections to their records. Log all correction requests in audit trail.

### 3.3 Right to Erasure (Sec 12)

**Current state:** Only soft-delete (`deleted_at` timestamp) — data remains in DB.

**Required:** Implement **anonymization** flow:
```typescript
// Anonymize instead of delete (medical records may have legal retention requirements)
async anonymizePatient(regid: number) {
  await db.execute(sql`
    UPDATE patients SET
      first_name = 'REDACTED', surname = 'REDACTED',
      mobile1 = 'REDACTED', email = 'REDACTED',
      address = 'REDACTED', city = 'REDACTED',
      deleted_at = NOW(), anonymized_at = NOW()
    WHERE regid = ${regid}
  `);
}
```

### 3.4 Grievance Redressal (Sec 13)

**Create:** `POST /api/grievance` — Submit a complaint  
**Create:** `GET /api/grievance/:id` — Track complaint status

**DPDP requires:** Response within **reasonable time** (industry standard: 30 days).

### 3.5 Right to Nominate (Sec 14)

**Create:** `nominee` field in patient registration. In case of patient's death or incapacity, nominee can exercise all Data Principal rights.

---

## 🟠 PHASE 4 — Breach Notification & Audit (Week 7–8)

> **Sec 8(6):** "In the event of a personal data breach, the Data Fiduciary shall notify the Board and each affected Data Principal."

---

### 4.1 Persist Audit Logs to Database

**Current gap:** Audit logs only go to stdout (ephemeral).

**Fix:** `apps/api/src/infrastructure/http/middleware/audit.ts` (Line 4)

```typescript
// Create AuditRepositoryPg and pass it:
const auditRepo = new AuditRepositoryPg(publicDb);
const auditLogger = new AuditLogger(auditRepo);
```

**Also add READ audit events:**
```typescript
{ method: 'GET', pattern: /^\/api\/patients\/\d+$/, action: AuditAction.PATIENT_VIEW, resourceType: 'patient' },
{ method: 'GET', pattern: /^\/api\/medical-cases\//, action: AuditAction.CASE_VIEW, resourceType: 'case' },
{ method: 'GET', pattern: /^\/api\/export\//, action: AuditAction.DATA_EXPORT, resourceType: 'export' },
```

### 4.2 Build Breach Detection

**Create:** `apps/api/src/shared/security/breach-detector.ts`

Monitor for anomalous patterns:
- Bulk patient data export (>100 records)
- Login from unusual IP after hours
- Multiple failed login attempts (already have rate limiting, but log it)
- Unauthorized access attempts (403/401 spikes)

### 4.3 Breach Notification Workflow

**Create:** `docs/compliance/breach-response-procedure.md`

| Step | Action | Timeline |
|------|--------|----------|
| 1 | Detect & contain breach | Immediate |
| 2 | Assess scope (which patients, what data) | Within 24 hours |
| 3 | Notify Data Protection Board of India | Within 72 hours |
| 4 | Notify affected patients | Within 72 hours |
| 5 | Document incident & remediation | Within 7 days |
| 6 | Post-incident review | Within 30 days |

---

## 🟡 PHASE 5 — Data Retention & Vendor Compliance (Week 9–10)

---

### 5.1 Data Retention Policy (Sec 8(7))

> "Data Fiduciary shall erase personal data where the Data Principal has withdrawn consent or it is reasonable to assume the purpose is no longer being served."

**Create:** `docs/compliance/data-retention-policy.md`

| Data Category | Retention Period | Legal Basis |
|--------------|-----------------|-------------|
| Clinical records (vitals, SOAP, prescriptions) | 10 years from last visit | Medical Council of India guidelines |
| Billing & financial records | 7 years | Income Tax Act, GST |
| Appointment history | 3 years | Operational |
| Audit logs | 6 years | DPDP compliance evidence |
| AI consultation logs | 1 year | Quality improvement |
| Communication logs (SMS/WhatsApp) | 1 year | Operational |
| Consent records | Lifetime of patient record + 3 years | DPDP evidence |

**Implementation:** Create a scheduled job in `apps/api/src/infrastructure/scheduler/` to anonymize/purge expired records.

### 5.2 Third-Party Data Processing Agreements (Sec 8(2))

> "The Data Fiduciary shall engage a Data Processor only under a valid contract."

**Execute DPAs with all vendors:**

| Vendor | Data Shared | DPA Required | Action |
|--------|-------------|-------------|--------|
| Google Gemini | Patient symptoms → AI | ✅ Yes | Verify "no training on data" clause |
| Groq | Patient symptoms → AI | ✅ Yes | Verify data processing terms |
| Deepgram | Voice recordings | ✅ Yes | Verify recording deletion policy |
| MSG91 / BulkSMS Prime | Patient phone numbers | ✅ Yes | Execute DPA |
| BulkShooters (WhatsApp) | Patient phone + messages | ✅ Yes | Execute DPA |
| Razorpay | Billing data | ✅ Yes | Verify PCI-DSS + DPA |
| LiveKit | Video call streams | ✅ Yes | Verify no recording storage |
| Railway (hosting) | All data | ✅ Yes | Verify encryption + data residency |

**Template:** Create `docs/compliance/dpa-template.md` with standard clauses.

### 5.3 Cross-Border Data Transfer (Sec 16)

AI providers (Google, Groq) process data outside India. Under DPDP Sec 16, transfer is allowed except to countries specifically restricted by the Central Government. **Document all cross-border flows.**

---

## 🟡 PHASE 6 — Children's Data & Governance (Week 11–12)

---

### 6.1 Children's Data Protection (Sec 9)

> "Processing of personal data of a child shall be done with the consent of the parent or lawful guardian."

**Kreed.health handles pediatric patients.** Required changes:

1. **Age gate:** Add `date_of_birth` validation. If patient is under 18:
   - Require parent/guardian details
   - Collect **verifiable parental consent**
   - Disable behavioral tracking / profiling
   - Do NOT send AI analysis without explicit parental consent

2. **Database:** Add `guardian_name`, `guardian_phone`, `guardian_consent` columns to patients table.

3. **UI:** Show "Minor Patient" badge and require guardian consent checkbox.

### 6.2 Appoint Data Protection Officer

**DPDP Rules 2025** require a DPO for organizations processing sensitive/health data at scale.

**Action:** Designate a DPO (can be an existing team member initially). Add DPO contact to:
- Privacy policy
- Consent forms
- Grievance redressal page
- All breach notifications

### 6.3 Data Protection Impact Assessment (DPIA)

**Required for Significant Data Fiduciaries.** Even if Kreed.health isn't designated as one yet, conducting a DPIA is **industry best practice for healthcare in 2026**.

**Create:** `docs/compliance/dpia-2026.md` covering:
- Data flow mapping (what data, where it goes, who accesses it)
- Risk assessment per processing activity
- Mitigation measures for each risk
- Annual review schedule

---

## 📋 Master Implementation Checklist

### Phase 1 — Security Safeguards (Week 1–2) 🟢
- [x] 1.1.1 Remove backdoor password from `login.use-case.ts`
- [x] 1.1.2 Gate demo tokens to development only
- [x] 1.1.3 Delete debug routes from `health.ts`
- [x] 1.1.4 Remove JWT fallback `'dev-secret'`
- [x] 1.2 Add `authMiddleware` to all unprotected PHI routes
- [x] 1.3.1 Hide stack traces in production errors
- [x] 1.3.2 Remove `err.stack` from patient router
- [x] 1.3.3 Remove all `console.log` from auth domain
- [x] 1.4.1 Enable database SSL/TLS
- [x] 1.4.2 Verify hosting encryption at rest (Railway/Supabase default)
- [x] 1.4.3 Enable Content Security Policy
- [x] 1.5.1 Add JWT blacklist check to auth middleware
- [x] 1.5.2 Reduce JWT expiry to 30 minutes
- [x] 1.5.3 Migrate tokens from localStorage to httpOnly cookies

### Phase 2 — Consent & Notice (Week 3–4) 🟢
- [x] 2.1 Create `consent_records` database table
- [x] 2.1 Build consent domain (ports, use-cases, repository)
- [x] 2.1 Create consent API endpoints
- [x] 2.1 Add consent UI to patient registration
- [x] 2.1 Add consent modal before AI consultation
- [x] 2.2 Write comprehensive privacy notice (English + Hindi)
- [x] 2.2 Replace CMS seed placeholder with real privacy policy
- [x] 2.2 Add privacy notice link to login page (replace `href="#"`)

### Phase 3 — Data Principal Rights (Week 5–6) 🟠
- [ ] 3.1 Build data access summary endpoint
- [ ] 3.2 Build correction request workflow
- [ ] 3.3 Implement patient data anonymization (right to erasure)
- [ ] 3.4 Build grievance submission & tracking system
- [ ] 3.5 Add nominee field to patient registration

### Phase 4 — Breach & Audit (Week 7–8) 🟠
- [ ] 4.1 Implement `AuditRepositoryPg` for database persistence
- [ ] 4.1 Add READ audit events (patient views, exports)
- [ ] 4.2 Build breach detection (anomaly monitoring)
- [ ] 4.3 Write breach response procedure document

### Phase 5 — Retention & Vendors (Week 9–10) 🟡
- [ ] 5.1 Write data retention policy document
- [ ] 5.1 Build automated data purge scheduler
- [ ] 5.2 Execute DPAs with all 8 vendors
- [ ] 5.3 Document cross-border data transfer flows

### Phase 6 — Governance (Week 11–12) 🟡
- [ ] 6.1 Implement children's data protections (age gate, guardian consent)
- [ ] 6.2 Appoint Data Protection Officer
- [ ] 6.3 Conduct & document Data Protection Impact Assessment
- [ ] Staff training on DPDP obligations
- [ ] Schedule annual compliance re-audit

---

## Key DPDP Act Sections Reference

| Section | Title | What It Requires |
|---------|-------|-----------------|
| **Sec 4** | Processing for Lawful Purpose | Only process with consent or for legitimate uses |
| **Sec 5** | Notice | Inform data principal BEFORE collecting data |
| **Sec 6** | Consent | Free, specific, informed, unconditional, unambiguous |
| **Sec 7** | Withdrawal of Consent | Must be as easy as giving consent |
| **Sec 8** | Obligations of Data Fiduciary | Security, accuracy, retention limits, breach notification |
| **Sec 9** | Children's Data | Verifiable parental consent, no tracking/profiling |
| **Sec 11** | Right to Access | Summary of data + processing activities |
| **Sec 12** | Right to Correction & Erasure | Correct inaccurate data, erase when purpose served |
| **Sec 13** | Grievance Redressal | Respond to complaints, escalation to DPB |
| **Sec 14** | Right to Nominate | Nominee exercises rights on death/incapacity |
| **Sec 16** | Cross-border Transfer | Allowed except to restricted countries |

---

> **⚠️ Disclaimer:** This document is a technical compliance guide. It does not constitute legal advice. Consult a qualified data protection lawyer before making compliance decisions. The DPDP Rules 2025 enforcement timeline extends to **May 13, 2027** — use this window to achieve full compliance.
