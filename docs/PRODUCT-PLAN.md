# HomeoX — Comprehensive Product Plan

## Execution Strategy

**Approach**: Module-by-module vertical slices. Each module delivers Backend → Frontend → DB Migration → Tests as one unit. No half-built modules.

**Priority Tiers**:
- **P0 (Critical)** — System doesn't function without it. Blocks everything else.
- **P1 (High)** — Core clinical workflow. Doctors can't see patients without it.
- **P2 (Medium)** — Business operations. Clinic can't bill/schedule without it.
- **P3 (Low)** — Enhancements. Clinic operates but less efficiently.

**Dependency Chain**:
```
Foundation → Auth → Patients → Medical Cases → Appointments → Consultation (AI)
                                                           → Billing
                                                           → Communications
                                                           → Analytics
                                                           → Remaining
```

---

## Module Breakdown

### MODULE 1: Foundation [P0] — Week 1
> Priority: CRITICAL. Everything depends on this.

| # | Task | Type | Depends On | Est |
|---|------|------|------------|-----|
| 1.1 | pnpm install + fix all dependency resolution errors | infra | — | 2h |
| 1.2 | Verify `pnpm build` compiles all 4 packages (types → validation → database → api/web) | infra | 1.1 | 2h |
| 1.3 | Fix any TypeScript strict-mode errors across packages | infra | 1.2 | 3h |
| 1.4 | Install PostgreSQL, create `homeo_x` database + `tenant_demo` schema | database | — | 1h |
| 1.5 | Run `pnpm db:generate` + `pnpm db:migrate` — all tables in tenant_demo | database | 1.4 | 2h |
| 1.6 | Verify `pnpm dev:api` starts, GET /api/health returns 200 with AI status | backend | 1.2, 1.5 | 2h |
| 1.7 | Verify `pnpm dev:web` starts, login stub renders, proxy to API works | frontend | 1.2 | 1h |
| 1.8 | Configure Vitest in apps/api (vitest.config.ts, sample test) | testing | 1.2 | 2h |
| 1.9 | Configure Vitest in apps/web (vitest.config.ts, sample test) | testing | 1.2 | 1h |
| 1.10 | GitHub Actions workflow: typecheck → lint → test on push to main | ci/cd | 1.8, 1.9 | 3h |

**Deliverable**: Monorepo builds, both apps start, CI passes green.

---

### MODULE 2: Auth & Multi-Tenancy [P0] — Week 2
> Priority: CRITICAL. No feature works without login and tenant isolation.

| # | Task | Type | Depends On | Est |
|---|------|------|------------|-----|
| 2.1 | Define `AuthRepository` port interface (findByEmail, verifyPassword) | backend | 1.6 | 1h |
| 2.2 | Define `TokenService` port interface (sign, verify, blacklist) | backend | 1.6 | 1h |
| 2.3 | Implement `AuthRepositoryPg` adapter (Drizzle queries against users table) | backend | 2.1, 1.5 | 3h |
| 2.4 | Implement `JwtTokenService` adapter (jsonwebtoken sign/verify) | backend | 2.2 | 2h |
| 2.5 | Implement `RedisTokenBlacklist` adapter (ioredis set/check) | backend | 2.2 | 2h |
| 2.6 | Implement `LoginUseCase` (validate credentials → issue JWT) | backend | 2.3, 2.4 | 2h |
| 2.7 | Implement `LogoutUseCase` (blacklist token in Redis) | backend | 2.5 | 1h |
| 2.8 | Implement `GetCurrentUserUseCase` (decode JWT → return user) | backend | 2.4 | 1h |
| 2.9 | Implement `ChangePasswordUseCase` (verify old → hash new → update) | backend | 2.3 | 2h |
| 2.10 | Wire auth routes: POST /login, POST /logout, GET /me, PUT /password | backend | 2.6-2.9 | 2h |
| 2.11 | Wire `authMiddleware` to verify Bearer token on protected routes | backend | 2.4 | 1h |
| 2.12 | Implement RBAC middleware (check user.role against route permissions) | backend | 2.11 | 3h |
| 2.13 | Verify tenant middleware resolves host → schema for all 22 tenants | backend | 1.5 | 2h |
| 2.14 | Frontend: Login page with email/password form + Zod validation | frontend | 2.10 | 4h |
| 2.15 | Frontend: Wire auth store (Zustand persist) — login/logout/token | frontend | 2.14 | 2h |
| 2.16 | Frontend: ProtectedRoute redirects unauthenticated users | frontend | 2.15 | 1h |
| 2.17 | Frontend: API client interceptor attaches Bearer token + 401 redirect | frontend | 2.15 | 1h |
| 2.18 | MySQL→PG migration script: users, roles, permissions, role_permissions | migration | 1.5 | 4h |
| 2.19 | Contract tests: auth endpoints (login success/fail, logout, me, password) | testing | 2.10 | 3h |
| 2.20 | Unit tests: LoginUseCase, ChangePasswordUseCase (6+ tests) | testing | 2.6, 2.9 | 2h |

**Deliverable**: Doctor logs in → routed to correct tenant → sees protected dashboard stub.

---

### MODULE 3: Patient Management [P1] — Week 3
> Priority: HIGH. Doctors interact with patients every day.

| # | Task | Type | Depends On | Est |
|---|------|------|------------|-----|
| 3.1 | Wire `PatientRepositoryPg` adapter (already scaffolded) to Express routes | backend | 2.11 | 3h |
| 3.2 | Implement patient route controller: GET /patients (list, paginate, search) | backend | 3.1 | 2h |
| 3.3 | Implement: POST /patients (create with Zod validation) | backend | 3.1 | 2h |
| 3.4 | Implement: GET /patients/:regid (detail with summary) | backend | 3.1 | 1h |
| 3.5 | Implement: PUT /patients/:regid (update with Zod) | backend | 3.1 | 2h |
| 3.6 | Implement: DELETE /patients/:regid (soft delete) | backend | 3.1 | 1h |
| 3.7 | Implement: GET /patients/lookup (typeahead search, top 10) | backend | 3.1 | 1h |
| 3.8 | Frontend: Patient list page (grid/list toggle, search, pagination) | frontend | 3.2 | 6h |
| 3.9 | Frontend: Create patient form with Zod validation | frontend | 3.3 | 4h |
| 3.10 | Frontend: Edit patient (pre-fill form from API) | frontend | 3.5 | 2h |
| 3.11 | Frontend: Patient lookup typeahead component (reusable) | frontend | 3.7 | 3h |
| 3.12 | MySQL→PG migration: case_datas → patients (22 tenants) | migration | 1.5 | 4h |
| 3.13 | Contract tests: patient endpoints (7 endpoints × request + response) | testing | 3.2-3.7 | 3h |
| 3.14 | Unit tests: CreatePatientUseCase, UpdatePatientUseCase (4+ tests) | testing | 3.1 | 2h |

**Deliverable**: Receptionist searches patients, creates new patients, edits existing.

---

### MODULE 4: Medical Cases & Vitals [P1] — Week 4
> Priority: HIGH. The clinical data core.

| # | Task | Type | Depends On | Est |
|---|------|------|------------|-----|
| 4.1 | Define ports: MedicalCaseRepository, VitalsRepository, SoapNoteRepository, HomeoDetailRepository | backend | 2.11 | 3h |
| 4.2 | Implement `MedicalCaseRepositoryPg` (CRUD + sub-table joins) | backend | 4.1 | 6h |
| 4.3 | Implement `VitalsRepositoryPg` (record/update vitals with regid→visitId resolution) | backend | 4.1 | 3h |
| 4.4 | Implement `HomeoDetailRepositoryPg` (thermal, constitutional, miasm) | backend | 4.1 | 2h |
| 4.5 | Implement use cases: CreateCase, GetCaseWithSubtables, UpdateCase | backend | 4.2 | 4h |
| 4.6 | Implement use cases: CompleteCase, FinalizeCase (with DB transaction) | backend | 4.2 | 4h |
| 4.7 | Wire 15+ medicalcases routes (/medicalcases/:regid/*, notes, images, examination, etc.) | backend | 4.5, 4.6 | 6h |
| 4.8 | Wire vitals routes: GET/POST /vitals/:visit_id | backend | 4.3 | 2h |
| 4.9 | Wire homeo-details routes: GET/POST/PUT/DELETE | backend | 4.4 | 2h |
| 4.10 | Frontend: Medical case list page (search, status filter, pagination) | frontend | 4.7 | 4h |
| 4.11 | Frontend: Case detail page shell with tab navigation (12 tabs) | frontend | 4.7 | 4h |
| 4.12 | Frontend: HomeoDetail tab (thermal, miasm, constitutional) | frontend | 4.9 | 3h |
| 4.13 | Frontend: Vitals tab (BP, pulse, temp, SpO2, BMI) | frontend | 4.8 | 3h |
| 4.14 | Frontend: Notes tab (CRUD notes with type selector) | frontend | 4.7 | 3h |
| 4.15 | Frontend: Examination tab | frontend | 4.7 | 3h |
| 4.16 | Frontend: Investigations tab with schema-driven forms | frontend | 4.7 | 4h |
| 4.17 | Frontend: Images tab (upload/view case photos) | frontend | 4.7 | 3h |
| 4.18 | Frontend: Prescription tab (view/add prescriptions) | frontend | 4.7 | 4h |
| 4.19 | Frontend: Communication tab, Billing tab, Follow-up tab | frontend | 4.7 | 4h |
| 4.20 | MySQL→PG migration: medicalcases + 15 sub-tables | migration | 1.5 | 6h |
| 4.21 | Contract tests: medicalcases endpoints | testing | 4.7 | 4h |
| 4.22 | Unit tests: FinalizeCase transaction integrity | testing | 4.6 | 3h |

**Deliverable**: Doctor opens case → sees all 12 tabs → edits vitals, notes, prescriptions.

---

### MODULE 5: Appointments & Queue [P1] — Week 5
> Priority: HIGH. Daily workflow for receptionists and doctors.

| # | Task | Type | Depends On | Est |
|---|------|------|------------|-----|
| 5.1 | Define ports: AppointmentRepository, QueueRepository | backend | 2.11 | 2h |
| 5.2 | Implement `AppointmentRepositoryPg` (CRUD + date range + doctor filter) | backend | 5.1 | 4h |
| 5.3 | Implement `QueueRepositoryPg` (today's list + token generation) | backend | 5.1 | 3h |
| 5.4 | Implement use cases: BookAppointment (double-booking prevention) | backend | 5.2 | 3h |
| 5.5 | Implement use cases: UpdateStatus, GetDailyQueue, CallNextPatient | backend | 5.2, 5.3 | 4h |
| 5.6 | Wire routes: /appointments/*, /todayslist, /token | backend | 5.4, 5.5 | 4h |
| 5.7 | Frontend: Appointment list page (date filter, status filter, doctor filter) | frontend | 5.6 | 4h |
| 5.8 | Frontend: Appointment calendar view (month/week/day) | frontend | 5.6 | 6h |
| 5.9 | Frontend: Book appointment form (patient lookup + doctor + date/time) | frontend | 5.6 | 4h |
| 5.10 | Frontend: Today's queue page (token list, call next, status updates) | frontend | 5.6 | 4h |
| 5.11 | Frontend: Waitlist manager | frontend | 5.6 | 3h |
| 5.12 | MySQL→PG migration: appointments, token tables | migration | 1.5 | 3h |
| 5.13 | Contract tests: appointment endpoints | testing | 5.6 | 3h |
| 5.14 | Unit tests: BookAppointment double-booking logic | testing | 5.4 | 2h |

**Deliverable**: Receptionist books appointment → doctor sees queue → calls next patient.

---

### MODULE 6: AI Consultation Pipeline [P1] — Week 6-7
> Priority: HIGH. The product differentiator. 2-week module.

| # | Task | Type | Depends On | Est |
|---|------|------|------------|-----|
| **6A: AI Engine Layer (Week 6)** | | | | |
| 6.1 | Define `AiProviderPort` interface (complete(messages) → response) | backend | 2.11 | 1h |
| 6.2 | Implement `GeminiAdapter` (with circuit breaker + key rotation) | backend | 6.1 | 4h |
| 6.3 | Implement `GroqAdapter` (with circuit breaker + key rotation) | backend | 6.1 | 3h |
| 6.4 | Implement `AiProviderChain` (failover: Gemini → Groq → Azure) | backend | 6.2, 6.3 | 3h |
| 6.5 | Define + implement `TranslationEngine` port/adapter | backend | 6.4 | 3h |
| 6.6 | Define + implement `ClinicalExtractionEngine` port/adapter | backend | 6.4 | 4h |
| 6.7 | Define + implement `RepertorizationEngine` port/adapter | backend | 6.4 | 4h |
| 6.8 | Define + implement `HomeopathyPrescriptionEngine` port/adapter | backend | 6.4 | 3h |
| 6.9 | Define + implement `SoapStructuringEngine` port/adapter | backend | 6.4 | 3h |
| 6.10 | Define + implement `CaseSummaryEngine` port/adapter | backend | 6.4 | 2h |
| 6.11 | Define + implement `LabAnalyzerEngine` port/adapter | backend | 6.4 | 2h |
| 6.12 | Implement `ConsultationPipeline` orchestrator (8-phase with timeout) | backend | 6.5-6.11 | 6h |
| 6.13 | Implement `AiAuditAdapter` (log provider, model, tokens, latency) | backend | 6.4 | 2h |
| **6B: Consultation Domain (Week 6)** | | | | |
| 6.14 | Define ports: ScribingRepository | backend | 2.11 | 1h |
| 6.15 | Implement `ScribingRepositoryPg` (session lifecycle + segment storage) | backend | 6.14 | 4h |
| 6.16 | Implement use cases: StartConsultation, CompleteConsultation | backend | 6.15 | 4h |
| 6.17 | Implement use case: RunAiPipeline (call pipeline, handle short-circuit) | backend | 6.12, 6.16 | 3h |
| 6.18 | Wire routes: /consultations/start, /consultations/complete | backend | 6.16 | 2h |
| 6.19 | Wire route: POST /ai/consult-homeopathy (90s timeout) | backend | 6.17 | 2h |
| 6.20 | Wire routes: /scribing/:visitId (session CRUD + segments) | backend | 6.15 | 3h |
| 6.21 | Wire routes: POST /ai/live-questions, POST /ai/live-translate | backend | 6.4 | 2h |
| 6.22 | Implement WebSocket gateway (Socket.io: join, transcript relay, pause) | backend | 6.15 | 4h |
| **6C: Frontend Consultation (Week 7)** | | | | |
| 6.23 | Build useCallTranscriber hook (Web Speech API, auto-heal, segments) | frontend | — | 4h |
| 6.24 | Build useDeepgramTranscriber hook (Socket.io proxy, MediaRecorder) | frontend | 6.22 | 4h |
| 6.25 | Build useConsultationApi hooks (TanStack Query: start, complete, AI draft) | frontend | 6.18, 6.19 | 3h |
| 6.26 | Build useAiQuestionSuggestions hook (debounced, retry on failure) | frontend | 6.21 | 2h |
| 6.27 | Build ConsultationPage — 4-stage workspace (Zustand store) | frontend | 6.25 | 6h |
| 6.28 | Build AmbientScribe component (live transcript, speaker labels) | frontend | 6.23, 6.24 | 4h |
| 6.29 | Build GNM Conflict Map panel | frontend | 6.27 | 3h |
| 6.30 | Build Emotional Intensity panel | frontend | 6.27 | 2h |
| 6.31 | Build Symptom Totality panel (priority ranked) | frontend | 6.27 | 3h |
| 6.32 | Build Remedy Analysis panel + Repertory Grid | frontend | 6.27 | 4h |
| 6.33 | Build NextQuestionsGrid (AI suggestions, click-to-inject) | frontend | 6.26 | 3h |
| 6.34 | Build Case Narrative + NEVER WELL SINCE timeline | frontend | 6.27 | 3h |
| 6.35 | Build PrescriptionWorkarea + SummaryModal + Finalize flow | frontend | 6.27 | 6h |
| 6.36 | Build SessionControlBar (start/stop/AV mode toggle) | frontend | 6.27 | 2h |
| 6.37 | Build TeleconsultationPanel (video/audio call via LiveKit) | frontend | 6.22 | 4h |
| 6.38 | MySQL→PG migration: scribing_sessions, transcript_segments, lab_orders | migration | 1.5 | 3h |
| 6.39 | Unit tests: ConsultationPipeline, AiProviderChain failover | testing | 6.12, 6.4 | 4h |
| 6.40 | Contract tests: consultation endpoints | testing | 6.18-6.21 | 3h |

**Deliverable**: Doctor starts consultation → speaks → live transcript → AI analyzes → GNM/symptoms/remedies populate → prescribe → finalize.

---

### MODULE 7: Billing & Finance [P2] — Week 8
> Priority: MEDIUM. Clinic needs revenue tracking.

| # | Task | Type | Depends On | Est |
|---|------|------|------------|-----|
| 7.1 | Define ports: BillRepository, PaymentRepository, ExpenseRepository | backend | 2.11 | 2h |
| 7.2 | Implement repository adapters (Drizzle) | backend | 7.1 | 6h |
| 7.3 | Implement use cases: CreateBill, RecordPayment, DailyCollection, TrackExpense | backend | 7.2 | 6h |
| 7.4 | Implement Razorpay adapter (create order, verify payment) | backend | 7.1 | 4h |
| 7.5 | Wire routes: /billing/*, /payments/*, /collection/*, /expenses/* | backend | 7.3, 7.4 | 4h |
| 7.6 | Frontend: Billing list page (search, date filter, summary stats) | frontend | 7.5 | 4h |
| 7.7 | Frontend: Create bill form | frontend | 7.5 | 3h |
| 7.8 | Frontend: Daily collection report | frontend | 7.5 | 3h |
| 7.9 | Frontend: Expense tracking (list + create + edit) | frontend | 7.5 | 4h |
| 7.10 | Frontend: Balance sheet, deposits, additional charges | frontend | 7.5 | 4h |
| 7.11 | MySQL→PG migration: bill, receipt, expenses tables | migration | 1.5 | 3h |
| 7.12 | Contract tests + unit tests | testing | 7.5 | 4h |

**Deliverable**: Receptionist creates bill → records payment → admin views daily collection.

---

### MODULE 8: Communications & Settings [P2] — Week 9
> Priority: MEDIUM. Operational needs.

| # | Task | Type | Depends On | Est |
|---|------|------|------------|-----|
| 8.1 | Define ports: SmsProvider, WhatsAppProvider, EmailProvider | backend | 2.11 | 2h |
| 8.2 | Implement SMS adapter (with circuit breaker) | backend | 8.1 | 3h |
| 8.3 | Implement WhatsApp adapter (with circuit breaker) | backend | 8.1 | 3h |
| 8.4 | Implement Email adapter (nodemailer) | backend | 8.1 | 2h |
| 8.5 | Wire communication routes: /sms/*, /whatsapp/*, /otp/* | backend | 8.2-8.4 | 4h |
| 8.6 | Implement Settings domain: clinic config, medicines, potencies, frequencies | backend | 2.11 | 6h |
| 8.7 | Implement Roles & Permissions CRUD | backend | 2.12 | 4h |
| 8.8 | Wire settings routes: /settings/*, /settings/medicines, /roles, /permissions | backend | 8.6, 8.7 | 4h |
| 8.9 | Frontend: SMS templates + group messaging + reports | frontend | 8.5 | 6h |
| 8.10 | Frontend: WhatsApp messaging | frontend | 8.5 | 3h |
| 8.11 | Frontend: Settings pages (15+ pages: medicines, potencies, departments, etc.) | frontend | 8.8 | 8h |
| 8.12 | Frontend: Roles & Permissions admin page | frontend | 8.7 | 4h |
| 8.13 | MySQL→PG migration: settings, stocks, sms tables | migration | 1.5 | 4h |
| 8.14 | Contract tests | testing | 8.5, 8.8 | 3h |

**Deliverable**: Admin manages settings + medicines. Staff sends SMS/WhatsApp to patients.

---

### MODULE 9: Analytics & Dashboard [P2] — Week 10
> Priority: MEDIUM. Management visibility.

| # | Task | Type | Depends On | Est |
|---|------|------|------------|-----|
| 9.1 | Implement Analytics domain: DashboardKPIs, CaseMonthwise, MonthlyDue, ReferralAnalytics | backend | 2.11 | 6h |
| 9.2 | Wire routes: /dashboard, /analytics/* | backend | 9.1 | 3h |
| 9.3 | Frontend: Admin dashboard (stats cards, revenue chart, pending actions) | frontend | 9.2 | 6h |
| 9.4 | Frontend: Doctor dashboard (today's patients, consults, next appointment) | frontend | 9.2 | 4h |
| 9.5 | Frontend: Receptionist dashboard (queue, appointments, walk-ins) | frontend | 9.2 | 4h |
| 9.6 | Frontend: ClinicAdmin + General dashboards | frontend | 9.2 | 4h |
| 9.7 | Frontend: Analytics pages (5 pages: case trends, monthly dues, birthdays, referrals, package expiry) | frontend | 9.2 | 6h |
| 9.8 | Contract tests | testing | 9.2 | 2h |

**Deliverable**: Role-based dashboards with KPIs. Admin sees revenue trends. Doctor sees daily queue.

---

### MODULE 10: Remaining Features [P3] — Week 11
> Priority: LOW. Operational but not critical for launch.

| # | Task | Type | Depends On | Est |
|---|------|------|------------|-----|
| 10.1 | Leads & referrals domain (CRUD + follow-ups) | backend + frontend | 2.11 | 8h |
| 10.2 | Couriers & logistics domain (courier medicine delivery) | backend + frontend | 2.11 | 6h |
| 10.3 | Packages & subscriptions domain | backend + frontend | 2.11 | 6h |
| 10.4 | CMS: FAQs, PDF content, static pages, help | backend + frontend | 2.11 | 6h |
| 10.5 | Platform admin dashboard (cross-tenant analytics) | backend + frontend | 9.1 | 6h |
| 10.6 | PDF generation (prescription print, reports) | backend | 4.6 | 6h |
| 10.7 | File upload management (/uploads) | backend | 2.11 | 3h |
| 10.8 | Family groups, referrals, dictionary, reminders | backend + frontend | 2.11 | 6h |
| 10.9 | MySQL→PG migration: remaining tables (20+ tables) | migration | 1.5 | 6h |

**Deliverable**: All long-tail features migrated.

---

### MODULE 11: Testing & Hardening [P0] — Week 12
> Priority: CRITICAL for production launch.

| # | Task | Type | Depends On | Est |
|---|------|------|------------|-----|
| 11.1 | Domain unit tests for all use cases (~200 tests total) | testing | All modules | 16h |
| 11.2 | API contract tests for all endpoints (~300 tests total) | testing | All modules | 16h |
| 11.3 | Database transaction support for FinalizeCase, CompleteConsultation | backend | 4.6, 6.16 | 4h |
| 11.4 | WebSocket authentication (verify JWT on Socket.io connection) | backend | 6.22 | 3h |
| 11.5 | React Error Boundary components (catch UI crashes gracefully) | frontend | All frontend | 3h |
| 11.6 | Implement AuditRepositoryPg (persist audit_logs + ai_audit_logs to DB) | backend | All modules | 4h |
| 11.7 | MySQL→PG full data migration validation (22 tenants, row count checks) | migration | All migrations | 6h |
| 11.8 | Performance testing: 22 schemas, concurrent requests, P95 < 200ms | testing | 11.7 | 4h |
| 11.9 | Production Railway deployment (API + Web + PostgreSQL + Redis) | ci/cd | All modules | 6h |
| 11.10 | Parallel run validation: old MMC + new HomeoX, 1 week read-only sync | infra | 11.9 | 8h |

**Deliverable**: 500+ tests passing, production deployed, validated against live data.

---

## Timeline Summary

| Week | Module | Priority | Key Deliverable |
|------|--------|----------|-----------------|
| 1 | Foundation | P0 | Monorepo builds, CI green |
| 2 | Auth & Multi-Tenancy | P0 | Login works, tenant routing works |
| 3 | Patient Management | P1 | Patient CRUD functional |
| 4 | Medical Cases | P1 | Case detail with 12 tabs |
| 5 | Appointments | P1 | Booking + queue management |
| 6 | AI Consultation (backend) | P1 | 8-phase pipeline operational |
| 7 | AI Consultation (frontend) | P1 | Full consultation workspace |
| 8 | Billing & Finance | P2 | Billing + payments |
| 9 | Communications & Settings | P2 | SMS/WhatsApp + settings |
| 10 | Analytics & Dashboard | P2 | Role-based dashboards |
| 11 | Remaining Features | P3 | All features migrated |
| 12 | Testing & Hardening | P0 | Production ready |

**Total estimated tasks**: ~160
**Total estimated hours**: ~540h (~14 developer-weeks)
