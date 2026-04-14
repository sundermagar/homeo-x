# MMC → HomeoX Migration PRD (Memory)

## Project Overview
Goal: Migrate `ManageMyClinic` (MMC-javascript) to `HomeoX` (Enterprise Clinical Platform).
- **Stack**: Turborepo, TypeScript, PostgreSQL (Drizzle), Express (Hexagonal/DDD).
- **Multi-tenancy**: Schema-per-tenant (22 clinics).

## Infrastructure Foundations
- **AI Config**: Centralized singleton with failover (Gemini → Groq → Azure).
- **Error Handling**: Global `AppError` hierarchy + Correlation IDs.
- **Audit Logger**: Dual-write (Logs + DB) for HIPAA alignment.
- **Circuit Breakers**: Applied to all external AI/SMS services.

## Migration Phases
1. **Phase 1: Auth & Multi-Tenancy** (P0) - Completed.
2. **Phase 2: Patient Management** (P1) - Core CRUD.
3. **Phase 3: Medical Cases & Vitals** (P1) - 12-tab Workspace.
4. **Phase 4: Appointments & Queue** (P1) - INTEGRATED.
5. **Phase 5: AI Consultation Pipeline** (P1) - Live Transcription + 8-phase AI analysis.
6. **Phase 6: Billing & Finance** (P2).
7. **Remaining**: CRM, Logistics, Analytics, Testing.

## Success Criteria
- 500+ Automated tests.
- 0 Data loss during cutover.
- Production deployment on Railway.
