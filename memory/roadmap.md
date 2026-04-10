# HomeoX Product Roadmap (Memory)

## Execution Strategy
- **Vertical Slices**: Backend → Frontend → Migration → Tests per module.
- **Priority**: P0 (Auth/Infra) → P1 (Clinical/AI) → P2 (Business) → P3 (Operational).

## Module Breakdown
### Module 4: Medical Cases (Next Focus)
- ports for Vitals, Exam, SOAP, Investigations.
- 12-tab Detail Page.
- MySQL to PG Migration for cases/vitals.

### Module 6: AI Consultation (Crown Jewel)
- Pluggable AI Adapters (Gemini/Groq).
- 8-phase Pipeline: Translate → Extract → Rubrics → Score → SOAP → Prescription.
- Real-time WebSockets for transcription.

## Roadmap Timeline (12 Weeks)
- Week 1-2: Foundations & Auth.
- Week 3: Patients.
- Week 4: Medical Cases.
- Week 5: Appointments (Complete).
- Week 6-7: AI Consultation Workspace.
- Week 8-10: Billing, Comms, Dashboards.
- Week 11-12: Hardening & Launch.
