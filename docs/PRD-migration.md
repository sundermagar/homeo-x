# PRD: MMC → Kreed.health Migration

## Overview

Migrate ManageMyClinic (MMC-javascript) to Kreed.health — an enterprise-grade, modular clinical management platform built on TypeScript, PostgreSQL, and DDD with adapter pattern.

**Source**: [MMC-javascript](https://github.com/insteptech/MMC-javascript) (Express + MySQL + React JS)
**Target**: [kreed-health](https://github.com/sundermagar/kreed-health) (Turborepo + Drizzle + PostgreSQL + React TS)

## Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Monorepo | Turborepo + pnpm | Task orchestration, caching, parallel builds |
| Language | Full TypeScript (strict) | Type safety at every boundary |
| Backend | Express + DDD Hexagonal | Keep Express, add ports/adapters structure |
| Frontend | React + TanStack Query + Zustand | Server state + client state separation |
| Database | PostgreSQL + Drizzle ORM | Schema-per-tenant, type-safe queries |
| Multi-tenancy | Schema-per-tenant | 22 clinics, single DB, isolated schemas |
| Validation | Zod (shared package) | Same schemas on frontend + backend |
| Testing | Domain unit tests + API contract tests | 0 → 500 tests |

## Enterprise Infrastructure (Cross-Cutting)

These capabilities are built into the architecture foundation and apply to ALL phases:

### 1. Centralized AI Configuration (`shared/config/ai-config.ts`)
- **Singleton service** validates all AI provider keys on startup
- Supports **multi-key rotation** (comma-separated GEMINI_API_KEY=key1,key2,key3)
- **Health check** exposes per-provider status at GET /api/health
- **Hot-reload** via `aiConfig.reload()` — change keys without restart
- Provider priority chain: Gemini → Groq → Azure (failover order)
- Per-provider rate limit tracking (15 req/min/key for Gemini, 30 for Groq)
- Startup validation logs warnings for missing providers (non-blocking)

### 2. Global Error & Exception Handling
- **Error hierarchy**: `AppError` → `NotFoundError`, `UnauthorizedError`, `ForbiddenError`, `ValidationError`, `ConflictError`
- **Async handler wrapper**: `asyncHandler()` catches async/await errors in Express routes
- **Zod integration**: ZodError automatically returns 400 with field-level details
- **Process handlers**: `uncaughtException` → log fatal + exit; `unhandledRejection` → log error + continue
- **Correlation ID**: Every request gets a UUID (from X-Request-ID or generated), included in all error responses
- **Production safety**: Stack traces hidden in production, exposed in development

### 3. Structured Logging & Observability
- **Pino logger** with child contexts (e.g., `createLogger('ai-pipeline')`)
- **Request logger** captures: correlationId, method, path, status, duration, tenant, userId, IP
- **Log levels by status**: 5xx → error, 4xx → warn, 2xx → info
- **Structured JSON** in production for log aggregation (Datadog, CloudWatch, etc.)
- **Pretty-print** in development for readability

### 4. Audit Trail (`shared/audit/audit-logger.ts`)
- **Dual-write**: structured log (stdout) + database persistence (fire-and-forget)
- **Auto-audit middleware**: matches HTTP method + path to AuditAction enum
- **22 audit actions** covering: auth, patient, case, consultation, prescription, billing, appointment, settings
- **Immutable records**: audit_logs table with JSONB for old_data/new_data diffs
- **AI-specific audit**: ai_audit_logs table tracks provider, model, tokens, latency, confidence per AI call
- **Queryable**: filter by tenant, user, resource, date range
- **HIPAA-aligned**: who changed what, when, from what IP

### 5. Rate Limiting
- **Global**: 200 requests/min per IP
- **Auth**: 5 login attempts per 15 minutes
- Standard headers (RateLimit-Limit, RateLimit-Remaining, RateLimit-Reset)

### 6. Circuit Breaker Pattern (`shared/resilience/circuit-breaker.ts`)
- **Per-service breakers**: Gemini, Groq, Deepgram, SMS, WhatsApp, Razorpay
- **States**: CLOSED → OPEN (after N failures) → HALF_OPEN (test) → CLOSED (recovered)
- **Configurable thresholds**: AI providers (5 failures, 60s reset), external services (3 failures, 120s reset)
- **Health endpoint** reports circuit breaker state per service
- **Prevents cascade failures**: if Gemini is down, requests fail fast instead of hanging

### 7. Centralized Application Config (`shared/config/app-config.ts`)
- **Single source** for all environment variables (JWT, DB, Redis, CORS, rate limits)
- **Startup validation**: missing critical vars (JWT_SECRET, DATABASE_URL) logged as errors; production throws
- **Type-safe**: `appConfig.jwt.secret` instead of `process.env.JWT_SECRET` scattered across codebase

## Migration Phases

### Phase 0: Foundation (Week 1)
> Get the monorepo building and running end-to-end with zero features

- [ ] Install dependencies, verify Turborepo pipeline builds all packages
- [ ] Set up PostgreSQL locally, create database with public schema
- [ ] Run Drizzle migrations to create initial tables
- [ ] Verify API starts with health check endpoint
- [ ] Verify Web dev server starts with login page stub
- [ ] Set up Vitest for both apps
- [ ] CI pipeline (GitHub Actions): typecheck + lint + test

### Phase 1: Auth & Multi-Tenancy (Week 2)
> Users can log in and the system routes to the correct tenant schema

- [ ] **Backend: Auth domain** — login, logout, me, password change
  - Port: `AuthRepository` (find user by email, verify password)
  - Port: `TokenService` (sign JWT, verify JWT, blacklist in Redis)
  - Use cases: LoginUseCase, LogoutUseCase, GetCurrentUserUseCase
  - Adapter: `AuthRepositoryPg`, `JwtTokenService`, `RedisTokenBlacklist`
  - Routes: POST /auth/login, POST /auth/logout, GET /auth/me, PUT /auth/password
- [ ] **Backend: Tenant middleware** — resolve host → schema, create Drizzle client
- [ ] **Backend: RBAC middleware** — roles + permissions guard
- [ ] **Frontend: Auth feature** — login page, auth store, protected route
- [ ] **DB Migration tool** — MySQL→PostgreSQL schema converter for users table
- [ ] **Contract tests** — auth endpoints request/response shape validation

### Phase 2: Patient Management (Week 3)
> Core patient CRUD — the most used feature across all roles

- [ ] **Backend: Patient domain** — full ports/adapters (already scaffolded)
  - Routes: GET/POST /patients, GET/PUT/DELETE /patients/:regid, GET /patients/lookup
- [ ] **Frontend: Patients feature** — list page (grid/list toggle), create/edit form, patient lookup
  - Hooks: usePatients, usePatient, useCreatePatient, useUpdatePatient (TanStack Query)
- [ ] **DB Migration** — case_datas table from MySQL → patients in PostgreSQL
- [ ] **Validation** — createPatientSchema, updatePatientSchema (already in @mmc/validation)
- [ ] **Contract tests** — patient endpoints

### Phase 3: Medical Cases & Vitals (Week 4)
> Case lifecycle — the clinical core

- [ ] **Backend: MedicalCase domain**
  - Ports: MedicalCaseRepository, VitalsRepository, HomeoDetailRepository
  - Use cases: CreateCase, GetCaseWithSubtables, UpdateCase, CompleteCase, FinalizeCase
  - Routes: 15+ endpoints from /medicalcases/*
- [ ] **Frontend: Medical Cases feature** — list, detail page with tabs
  - 12 tabs: Homeo, Vitals, Examination, Investigations, Notes, Images, Billing, Prescription, Communication, Follow-up
- [ ] **DB Migration** — medicalcases, vitals, soap_notes, homeo_details, case_notes, case_images, case_examination tables

### Phase 4: Appointments & Queue (Week 5)
> Scheduling and daily queue management

- [ ] **Backend: Appointment domain**
  - Ports: AppointmentRepository, QueueRepository
  - Use cases: BookAppointment, UpdateStatus, GetDailyQueue, CallNextPatient
  - Business rules: double-booking prevention, waitlist management
  - Routes: /appointments/*, /todayslist, /token
- [ ] **Frontend: Appointments feature** — calendar view, list view, booking form, queue management
- [ ] **DB Migration** — appointments, token tables

### Phase 5: AI Consultation Pipeline (Week 6-7)
> The crown jewel — live transcription + 8-phase AI analysis

- [ ] **Backend: Consultation domain**
  - Ports: `ScribingRepository`, `AiProvider`, `TranslationEngine`, `ClinicalExtractionEngine`, `RepertorizationEngine`, `PrescriptionEngine`
  - Use cases: StartConsultation, ProcessTranscript, RunAiPipeline, CompleteConsultation
  - Adapter: Each AI engine implements its port interface
  - Pipeline: Translate → Extract → Filter → Rubrics → Score → Prescribe → SOAP → Summary
  - Routes: /consultation/start, /consultation/complete, /ai/consult-homeopathy, /scribing/*, /ai/live-questions, /ai/live-translate
- [ ] **Backend: WebSocket gateway** — Socket.io for real-time transcription relay
- [ ] **Frontend: Consultation feature**
  - Consultation workspace with 4 stages: CONSULTATION → TOTALITY → REPERTORY → PRESCRIPTION
  - AmbientScribe (Web Speech API + Deepgram adapter)
  - AI panels: GNM conflict map, emotion intensity, symptom totality, remedy analysis
  - Question prediction (live AI suggestions)
  - Prescription builder + finalize flow
  - Store: useConsultationStore (Zustand) — replaces window.dispatchEvent pattern
- [ ] **DB Migration** — scribing_sessions, transcript_segments, lab_orders, lab_order_items

### Phase 6: Billing & Finance (Week 8)
> Revenue tracking, payments, and expense management

- [ ] **Backend: Billing domain**
  - Ports: BillRepository, PaymentRepository, ExpenseRepository
  - Use cases: CreateBill, RecordPayment, TrackExpense, DailyCollectionReport
  - Razorpay adapter for online payments
  - Routes: /billing/*, /payments/*, /collection/*, /expenses/*
- [ ] **Frontend: Billing feature** — billing list, create bill, collection reports, expense tracking
- [ ] **DB Migration** — bill, receipt, expenses tables

### Phase 7: Communications & Settings (Week 9)
> SMS, WhatsApp, settings, and admin features

- [ ] **Backend: Communication domain**
  - Ports: SmsProvider, WhatsAppProvider, EmailProvider
  - Adapters: pluggable SMS/WhatsApp/email services
  - Routes: /sms/*, /whatsapp/*, /otp/*
- [ ] **Backend: Settings domain** — clinic settings, medicines, potencies, frequencies, roles/permissions
- [ ] **Frontend: Settings feature** — all settings pages migrated
- [ ] **Frontend: Communication feature** — SMS templates, group messaging, WhatsApp

### Phase 8: Analytics & Dashboard (Week 10)
> Role-based dashboards and reporting

- [ ] **Backend: Analytics domain**
  - Use cases: DashboardKPIs, CaseMonthwise, MonthlyDue, ReferralAnalytics
  - Routes: /dashboard, /analytics/*
- [ ] **Frontend: Dashboard feature** — 5 role-specific dashboards (Admin, ClinicAdmin, Doctor, Receptionist, General)
- [ ] **Frontend: Analytics feature** — charts, reports, export

### Phase 9: Remaining Features (Week 11)
> Long-tail features: CRM, logistics, platform admin

- [ ] Leads & referrals domain
- [ ] Couriers & logistics domain
- [ ] Packages & subscriptions domain
- [ ] CMS (FAQs, PDF content, static pages)
- [ ] Platform admin dashboard (cross-tenant)
- [ ] PDF generation (prescriptions, reports)
- [ ] File upload management

### Phase 10: Testing & Hardening (Week 12)
> Quality gate before production cutover

- [ ] Domain unit tests for all use cases (~200 tests)
- [ ] API contract tests for all endpoints (~300 tests)
- [ ] Error boundary components in React
- [ ] WebSocket authentication
- [ ] Database transaction support for critical flows (finalize, complete)
- [ ] Audit trail for medical record changes
- [ ] Performance testing with 22 tenant schemas
- [ ] Production environment setup on Railway

## Database Migration Strategy

### Approach: Parallel Run
1. **Export** MySQL data per tenant using custom migration scripts
2. **Transform** column names (snake_case), data types (MySQL→PG), and relationships
3. **Load** into PostgreSQL under tenant-specific schemas (tenant_zirakpur, tenant_chd, etc.)
4. **Validate** row counts, data integrity, foreign key consistency
5. **Run both** systems in parallel for 1 week with read-only sync
6. **Cutover** once validated

### Key Transformations
| MySQL | PostgreSQL |
|-------|-----------|
| `INT AUTO_INCREMENT` | `SERIAL` |
| `TINYINT(1)` | `BOOLEAN` |
| `DATETIME` | `TIMESTAMP` |
| `TEXT/LONGTEXT` | `TEXT` |
| `JSON` | `JSONB` |
| `ENUM(...)` | `VARCHAR` + CHECK constraint |
| Per-database isolation | Per-schema isolation |

## Success Criteria

- [ ] All 200+ API endpoints migrated and tested
- [ ] All 95+ frontend pages migrated
- [ ] 22 tenants operational on PostgreSQL
- [ ] Zero data loss during migration
- [ ] AI consultation pipeline fully functional
- [ ] Real-time transcription working (WebSpeech + Deepgram)
- [ ] 500+ automated tests passing
- [ ] Sub-200ms API response times (P95)
- [ ] Production deployment on Railway
