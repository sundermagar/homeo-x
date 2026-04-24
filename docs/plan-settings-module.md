# Settings & Configuration Module Implementation

This plan outlines the architecture and execution strategy for migrating and implementing the Settings & Configuration module. It includes departments, medicines, potencies, frequencies, referral sources, stickers, dispensaries, CMS (static pages, FAQs, PDF), organization settings, and RBAC (roles & permissions).

## User Review Required

> [!IMPORTANT]
> - Are "stocks" and "medicines" synonymous in your workflow, or do we need a separate `medicines` table aside from `stocks` in `inventory.ts`? The legacy codebase has standard `medicines` table. My plan assumes creating a distinct `medicines` table to match the legacy structure.
> - `rbac.ts` already exists with roles/permissions. We will build the CRUD API and UI around it.
> - Do you want the CMS elements (Static pages, FAQs) segregated into a separate domain, or kept within a universal "Settings" domain? I have proposed placing them in a unified `Settings` domain for administrative simplicity.

## Proposed Changes

---

### 1. Database Schema (`packages/database`)

We will introduce a new `settings.ts` schema and update existing ones to support the configuration entities.

#### [NEW] [settings.ts](file:///c:/Users/inset/Desktop/Github/kreed-health/packages/database/src/schema/settings.ts)
Contains schema definitions for:
- `departments` (id, name, status)
- `dispensaries` (id, name, location)
- `referral_sources` (id, name, type)
- `stickers` (id, title, content)
- `static_pages` (id, slug, title, content)
- `faqs` (id, question, answer, order)
- `pdf_settings` (id, template_name, header, footer)

#### [MODIFY] [inventory.ts](file:///c:/Users/inset/Desktop/Github/kreed-health/packages/database/src/schema/inventory.ts)
- Add `medicines` table (id, name, potency, type, etc) to complement the `stocks` table.

#### [MODIFY] [platform.ts](file:///c:/Users/inset/Desktop/Github/kreed-health/packages/database/src/schema/platform.ts)
- Already contains `organizations` and `accounts`. We will ensure tenant-specific organization settings capability if needed.

#### [MODIFY] [app-schema.ts](file:///c:/Users/inset/Desktop/Github/kreed-health/packages/database/src/schema/app-schema.ts)
- Export the newly created `settings.ts`.

---

### 2. Validation (`packages/validation`)

Create Zod schemas to ensure frontend and backend type-safety.

#### [NEW] [settings.ts](file:///c:/Users/inset/Desktop/Github/kreed-health/packages/validation/src/settings.ts)
- Zod schemas for all new tables (`createDepartmentSchema`, `updateDepartmentSchema`, `faqSchema`, etc.).

#### [MODIFY] [inventory.ts](file:///c:/Users/inset/Desktop/Github/kreed-health/packages/validation/src/inventory.ts)
- Add Zod schemas for `medicines`, `potencies`, `frequencies`.

---

### 3. Backend (API)

Build the domain logic following Hexagonal Architecture (Ports and Adapters).

#### [NEW] [apps/api/src/domains/settings/ports/settings.repository.ts](file:///c:/Users/inset/Desktop/Github/kreed-health/apps/api/src/domains/settings/ports/settings.repository.ts)
- Define standard interfaces for fetching/updating settings metadata (Departments, Dispensaries, Referral Sources, etc.).

#### [NEW] [apps/api/src/domains/settings/use-cases/*](file:///c:/Users/inset/Desktop/Github/kreed-health/apps/api/src/domains/settings/use-cases/)
- Scaffold `manage-departments.ts`, `manage-cms.ts`, `manage-dispensaries.ts` etc.

#### [NEW] [apps/api/src/infrastructure/repositories/settings.repository.pg.ts](file:///c:/Users/inset/Desktop/Github/kreed-health/apps/api/src/infrastructure/repositories/settings.repository.pg.ts)
- Drizzle ORM implementation of the settings repository.

#### [NEW] [apps/api/src/infrastructure/http/routes/settings.ts](file:///c:/Users/inset/Desktop/Github/kreed-health/apps/api/src/infrastructure/http/routes/settings.ts)
- Express router defining the sub-routes (`/settings/departments`, `/settings/cms/faqs`, `/settings/stickers`).
- Will also add `/inventory/medicines` inside existing inventory routes.

---

### 4. Frontend (Web)

Build out the UI for administrators to manage configurations.

#### [NEW] [apps/web/src/features/settings/pages/*](file:///c:/Users/inset/Desktop/Github/kreed-health/apps/web/src/features/settings/pages)
Create standard grid/list + form pages for each module:
1. `DepartmentsPage`
2. `MedicinesPage` (Under Inventory feature)
3. `DispensariesPage`
4. `ReferralsPage`
5. `StickersPage`
6. `CmsManagePage` (Static Pages + FAQs)
7. `PdfSettingsPage`
8. `RolesPermissionsPage`
9. `OrganizationSettingsPage`

#### [MODIFY] [apps/web/src/infrastructure/router.tsx](file:///c:/Users/inset/Desktop/Github/kreed-health/apps/web/src/infrastructure/router.tsx)
- Mount the new routes under `/settings/*`.

## Verification Plan

### Automated Tests
- Scaffold `pnpm test:unit` for the new Use Cases confirming logic such as uniqueness checks.
- Scaffold API contract tests confirming 200 OK responses on the new routes.

### Manual Verification
- Access the Settings dashboard via Web UI.
- Perform a complete CRUD loop on Departments, Dispensaries, Medicines, and CMS entities.
- Verify Drizzle schema migrations run properly on a fresh DB drop.
