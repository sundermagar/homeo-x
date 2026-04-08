# HomeoX

Enterprise-grade Homeopathic Clinic Management Platform with AI-powered consultation, real-time transcription, and multi-tenant architecture.

## Architecture

```
homeo-x/
├── packages/
│   ├── types/          @mmc/types       Shared domain entities, API contracts, events
│   ├── database/       @mmc/database    Drizzle ORM schemas, PostgreSQL, tenant registry
│   └── validation/     @mmc/validation  Zod schemas (shared frontend + backend)
├── apps/
│   ├── api/            @mmc/api         Express backend (DDD, ports/adapters)
│   └── web/            @mmc/web         React frontend (feature-based, TanStack Query)
└── tools/
    └── db-migrate/                      MySQL → PostgreSQL migration scripts
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Language | TypeScript (strict mode) |
| Monorepo | Turborepo + pnpm workspaces |
| Backend | Express.js + Hexagonal Architecture (DDD) |
| Frontend | React 19 + TanStack Query + Zustand |
| Database | PostgreSQL (schema-per-tenant) |
| ORM | Drizzle ORM |
| Validation | Zod (shared across stack) |
| AI Providers | Google Gemini, Groq, Azure OpenAI (failover chain) |
| Transcription | Web Speech API + Deepgram |
| Video Calls | LiveKit |
| Caching | Redis / Upstash |
| Payments | Razorpay |
| Logging | Pino (structured JSON) |
| Testing | Vitest |

### Design Patterns

- **Hexagonal Architecture (Ports & Adapters)**: Domain logic is framework-agnostic. Express, PostgreSQL, and AI providers are swappable adapters.
- **Schema-Per-Tenant**: 22 clinics share one PostgreSQL database. Each gets an isolated schema (`tenant_zirakpur`, `tenant_chd`, etc.).
- **Circuit Breaker**: External services (Gemini, Groq, Deepgram, SMS, Razorpay) have circuit breakers preventing cascade failures.
- **Audit Trail**: Every state-changing operation is logged with who, what, when, and from where. HIPAA-aligned.
- **Shared Contracts**: `@mmc/types` is the single source of truth for all entity shapes. `@mmc/validation` provides Zod schemas used by both frontend forms and backend endpoints.

## Getting Started

### Prerequisites

- Node.js >= 22
- pnpm >= 9
- PostgreSQL >= 16
- Redis (optional — falls back to in-memory)

### Setup

```bash
# Clone
git clone https://github.com/sundermagar/homeo-x.git
cd homeo-x

# Install dependencies
pnpm install

# Configure environment
cp .env.example .env
# Edit .env with your PostgreSQL URL, JWT secret, and AI keys

# Create database
createdb homeo_x
# Create tenant schema
psql homeo_x -c "CREATE SCHEMA tenant_demo;"

# Run migrations
pnpm db:migrate

# Start development
pnpm dev
```

This starts both the API (port 3000) and Web (port 5173) servers.

### Individual commands

```bash
pnpm dev:api          # Start API only
pnpm dev:web          # Start Web only
pnpm build            # Build all packages
pnpm typecheck        # TypeScript check
pnpm lint             # ESLint
pnpm test             # Run all tests
pnpm test:unit        # Domain unit tests only
pnpm test:integration # API contract tests only
pnpm db:generate      # Generate Drizzle migrations
pnpm db:migrate       # Apply migrations
pnpm db:studio        # Open Drizzle Studio (GUI)
```

## Project Structure

### Backend (`apps/api/`)

```
src/
├── main.ts                          Bootstrap + process error handlers
├── shared/
│   ├── config/
│   │   ├── app-config.ts            Centralized env config with validation
│   │   └── ai-config.ts             AI provider keys, health, hot-reload
│   ├── audit/
│   │   └── audit-logger.ts          Audit service + AuditAction enum
│   ├── resilience/
│   │   └── circuit-breaker.ts       Circuit breaker for external services
│   ├── errors.ts                    Error hierarchy (AppError, NotFound, etc.)
│   ├── result.ts                    Functional Result<T, E> type
│   └── logger.ts                    Pino structured logger
├── domains/                         DDD Bounded Contexts
│   ├── patient/
│   │   ├── ports/
│   │   │   └── patient.repository.ts    PORT interface
│   │   └── use-cases/
│   │       ├── get-patient.ts           Use case (domain logic)
│   │       ├── list-patients.ts
│   │       ├── create-patient.ts
│   │       └── update-patient.ts
│   ├── auth/                        Authentication domain
│   ├── consultation/                AI consultation domain
│   ├── appointment/                 Scheduling domain
│   ├── medical-case/                Clinical case domain
│   ├── billing/                     Finance domain
│   ├── communication/               SMS/WhatsApp/Email domain
│   ├── inventory/                   Stock/medicine domain
│   ├── analytics/                   Reporting domain
│   └── settings/                    Configuration domain
└── infrastructure/                  Framework Adapters
    ├── http/
    │   ├── app.ts                   Express config + middleware stack
    │   ├── middleware/
    │   │   ├── auth.ts              JWT Bearer authentication
    │   │   ├── tenant.ts            Schema-per-tenant resolution
    │   │   ├── validate.ts          Zod validation (body, query, params)
    │   │   ├── correlation-id.ts    Request tracing (UUID)
    │   │   ├── error-handler.ts     Global error handler
    │   │   ├── request-logger.ts    Structured request logging
    │   │   ├── audit.ts             Auto-audit state-changing requests
    │   │   └── async-handler.ts     Async/await error wrapper
    │   └── routes/
    │       └── health.ts            Health check + AI status
    ├── repositories/
    │   └── patient.repository.pg.ts ADAPTER: Drizzle → PatientRepository
    └── ai/
        └── index.ts                 AI engine adapters
```

### Frontend (`apps/web/`)

```
src/
├── main.tsx                         React entry
├── App.tsx                          Providers (QueryClient, Router, Theme, Auth)
├── infrastructure/
│   ├── router.tsx                   Lazy-loaded route config
│   └── api-client.ts               Axios + JWT + tenant header
├── shared/
│   ├── stores/
│   │   ├── auth-store.ts            Zustand: token, user, login/logout
│   │   └── ui-store.ts              Zustand: dark mode, sidebar
│   ├── providers/                   React context providers
│   ├── components/                  Shared UI components
│   └── layouts/                     Page layout shells
└── features/                        Feature Modules
    ├── auth/pages/                  Login page
    ├── dashboard/pages/             Role-based dashboards
    ├── patients/
    │   ├── pages/                   Patient list, detail
    │   └── hooks/use-patients.ts    TanStack Query hooks
    └── consultation/
        ├── pages/                   Consultation workspace
        └── stores/                  Zustand: consultation state
```

## Enterprise Infrastructure

### AI Configuration

AI keys are managed centrally via `AiConfigService`:
- Validated on startup with warnings for missing providers
- Multi-key support with comma separation (`GEMINI_API_KEY=key1,key2,key3`)
- Health check at `GET /api/health` shows per-provider status
- Hot-reload: `aiConfig.reload()` re-reads env vars without restart

### Error Handling

| Layer | Mechanism |
|-------|-----------|
| Route handlers | `asyncHandler()` wraps async functions |
| Validation | Zod errors → 400 with field details |
| Domain errors | `AppError` subclasses → appropriate HTTP status |
| Unhandled | `process.on('uncaughtException')` → log fatal + exit |
| Promise rejections | `process.on('unhandledRejection')` → log error + continue |
| Every response | Includes `correlationId` for tracing |

### Audit Trail

Every state-changing API call is automatically logged:

```json
{
  "audit": true,
  "action": "patient.create",
  "tenant": "zirakpur",
  "user": 7,
  "resource": "patient:1002205",
  "correlationId": "a1b2c3d4-..."
}
```

Persisted to `audit_logs` table (JSONB old_data/new_data for diffs).
AI calls logged separately in `ai_audit_logs` with provider, model, tokens, latency.

### Circuit Breakers

External services have automatic circuit breakers:

| Service | Failure Threshold | Reset Timeout |
|---------|-------------------|---------------|
| Gemini | 5 failures | 60s |
| Groq | 5 failures | 60s |
| Deepgram | 3 failures | 30s |
| SMS | 3 failures | 120s |
| WhatsApp | 3 failures | 120s |
| Razorpay | 3 failures | 60s |

Health endpoint reports circuit state: `CLOSED` (healthy), `OPEN` (failing), `HALF_OPEN` (testing recovery).

## Migration from MMC

See [PRD-migration.md](docs/PRD-migration.md) for the full 12-week phased migration plan.

| Phase | Scope | Timeline |
|-------|-------|----------|
| 0 | Foundation (build, DB, CI) | Week 1 |
| 1 | Auth & Multi-Tenancy | Week 2 |
| 2 | Patient Management | Week 3 |
| 3 | Medical Cases & Vitals | Week 4 |
| 4 | Appointments & Queue | Week 5 |
| 5 | AI Consultation Pipeline | Week 6-7 |
| 6 | Billing & Finance | Week 8 |
| 7 | Communications & Settings | Week 9 |
| 8 | Analytics & Dashboard | Week 10 |
| 9 | Remaining Features | Week 11 |
| 10 | Testing & Hardening | Week 12 |

## Multi-Tenancy

Each clinic (tenant) gets its own PostgreSQL schema within a single database:

```
homeo_x (database)
├── public           System tables (tenant registry, shared config)
├── tenant_zirakpur  Zirakpur Clinic data
├── tenant_chd       Chandigarh Clinic data
├── tenant_demo      Demo/development data
├── tenant_sofat     Sofat Clinic data
└── ... (22 schemas total)
```

Tenant resolution: `Host: zirakpur.managemyclinic.in` → `SET search_path TO tenant_zirakpur`

## License

Private. All rights reserved.
