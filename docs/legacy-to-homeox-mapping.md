# Legacy MMC -> HomeoX Table Mapping

This document maps legacy MySQL tables (MMC) to current HomeoX PostgreSQL tables and provides a safe migration sequence.

## Scope

- Source: legacy tables loaded into PostgreSQL tenant schema (example: `tenant_demo`)
- Target: HomeoX app tables from `packages/database/src/schema/*.ts`
- Goal: move data from legacy-compatible shape to app-consumable shape

## Current HomeoX Table Names (as implemented)

- `case_datas` (patients)
- `medicalcases`
- `vitals`
- `soap_notes`
- `homeo_details`
- `appointments`
- `bill`
- `users`
- `roles`
- `permissions`
- `role_permissions`
- `scribing_sessions`
- `transcript_segments`
- `lab_orders`
- `lab_order_items`

## Mapping Matrix

| Domain | Legacy tables (MMC) | HomeoX target table | Notes |
|---|---|---|---|
| Patients | `case_datas`, `basic_details` | `case_datas` | Prefer `case_datas` as canonical patient source, use `basic_details` for backfill gaps. |
| Medical Case | `medicalcases`, `case_notes`, `case_examination` | `medicalcases` | Keep core case status/doctor/clinic in `medicalcases`; optional details can stay in legacy tables until modeled. |
| Vitals | `vitals`, `heightweight`, `case_heights` | `vitals` | Normalize to one row per visit (`visit_id`). |
| SOAP | `soap_notes` | `soap_notes` | Direct map where possible; keep AI fields defaulted. |
| Homeopathy details | `homeo_details`, `case_specific` | `homeo_details` | `miasm` and constitutional fields should map directly. |
| Appointments | `appointments`, `pending_appointments`, `token` | `appointments` | Map booking date/time + status; queue/token can remain legacy until queue domain finalized. |
| Billing | `bill`, `receipt`, `charges`, `payments` | `bill` | Map totals/received/balance; detailed receipt split can be phase-2 billing enhancement. |
| Auth/RBAC | `users`, `roles`, `permissions`, `permission_role` | `users`, `roles`, `permissions`, `role_permissions` | `permission_role` -> `role_permissions`. |
| Consultation AI | `scribing_sessions`, `transcript_segments`, `lab_orders`, `lab_order_items` | same names | Mostly direct migration. |

## Recommended Migration Order (per tenant schema)

1. `roles`
2. `permissions`
3. `role_permissions`
4. `users`
5. `case_datas`
6. `medicalcases`
7. `homeo_details`
8. `vitals`
9. `soap_notes`
10. `appointments`
11. `bill`
12. `scribing_sessions`
13. `transcript_segments`
14. `lab_orders`
15. `lab_order_items`

## SQL Templates (run inside one tenant schema)

Set search path first:

```sql
SET search_path TO tenant_demo;
```

Example: RBAC mapping:

```sql
INSERT INTO roles (id, name, created_at)
SELECT id, name, COALESCE(created_at, NOW())
FROM roles
ON CONFLICT (id) DO NOTHING;

INSERT INTO permissions (id, name, slug, module)
SELECT id, name, slug, module
FROM permissions
ON CONFLICT (slug) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT role_id, permission_id
FROM permission_role;
```

Example: Patients:

```sql
INSERT INTO case_datas (
  regid, first_name, surname, gender, dob, age, phone, email, address, city, state, blood_group, reference, created_at, updated_at, deleted_at
)
SELECT
  regid,
  NULLIF(first_name, ''),
  NULLIF(surname, ''),
  NULLIF(gender, ''),
  dob,
  age,
  NULLIF(phone, ''),
  NULLIF(email, ''),
  NULLIF(address, ''),
  NULLIF(city, ''),
  NULLIF(state, ''),
  NULLIF(blood_group, ''),
  NULLIF(reference, ''),
  COALESCE(created_at, NOW()),
  COALESCE(updated_at, NOW()),
  deleted_at
FROM case_datas;
```

Note: For tenant-by-tenant production migration, stage legacy data in `tenant_<slug>_legacy` and insert into app tables in `tenant_<slug>` to avoid same-table source/target confusion.

## Validation Checklist

- Row counts match for each mapped table.
- Distinct key counts match (`regid`, `id`, `slug`).
- Null checks on required columns (`users.email`, `users.password`, `appointments.patient_id`, etc.).
- 20 random patient records match old vs new values.
- 10 random medical case chains verified (`case_datas` -> `medicalcases` -> `vitals`).

## Gaps To Resolve Next

- Add foreign keys in app tables (currently minimal FK constraints).
- Normalize date strings from legacy (`booking_date`, `booking_time`) to strict date/time.
- Reconcile duplicated domains (`heightweight`, `case_heights`, `vitals`) into one canonical source.
- Define queue/token model for app-level appointment workflow.
