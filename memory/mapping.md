# Legacy MMC → HomeoX Mapping (Memory)

## Key Entity Mapping
| Domain | Legacy (MySQL) | HomeoX (PostgreSQL) |
|---|---|---|
| Users | `users`, `roles`, `permissions` | `users`, `roles`, `permissions`, `permission_role` |
| Patients | `case_datas`, `basic_details` | `case_datas` |
| Medical Case | `medicalcases`, `case_notes` | `medicalcases` |
| Vitals | `vitals`, `heightweight` | `vitals` |
| Appointments | `appointments`, `pending_appointments` | `appointments`, `tokens`, `waitlist` |
| Billing | `bill`, `receipt`, `charges` | `bill` |

## Migration Logic
- **Schema Separation**: Run migration scripts per tenant schema (e.g., `tenant_demo`).
- **Data Cleanup**: Normalize date strings to standard ISO formats.
- **Constraints**: Apply foreign keys after initial data load to handle legacy inconsistencies.

## Validation Checklist
- Row counts must match exactly.
- Random 20-record audit for data integrity.
- Verify relationship chains (Patient → Case → Consultant).
