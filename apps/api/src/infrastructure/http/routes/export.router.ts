
import { Router, type Router as ExpressRouter } from 'express';
import type { Request, Response } from 'express';
import { createLogger } from '../../../shared/logger';

const logger = createLogger('export');
export const exportRouter: ExpressRouter = Router();

// ─── Helper: execute raw SQL and return plain rows array ─────────────────────
async function pgExport(db: any, query: string, params: unknown[] = []): Promise<any[]> {
  try {
    const rawClient = db?.session?.client ?? db?.rawClient;
    if (rawClient && typeof rawClient.unsafe === 'function') {
      return Array.from(await rawClient.unsafe(query, params));
    }
    const result = await db.execute({ text: query, values: params });
    const rows = result.rows ?? result ?? [];
    return Array.from(rows);
  } catch (err: any) {
    logger.error({ err, query }, 'Export query failed');
    throw err;
  }
}

// ─── Helper: detect which table name exists ───────────────────────────────────
async function detectTable(db: any, candidates: string[]): Promise<string | null> {
  for (const t of candidates) {
    try {
      const rows = await pgExport(db,
        `SELECT table_name FROM information_schema.tables WHERE table_name = $1 AND table_schema = CURRENT_SCHEMA() LIMIT 1`,
        [t]
      );
      if (rows.length > 0) return t;
    } catch { /* skip */ }
  }
  return null;
}

// ─── CSV generator ─────────────────────────────────────────────────────────────
function toCSV(data: any[]): string {
  if (!data || data.length === 0) return 'No records found\n';
  const headers = Object.keys(data[0]);
  return [
    headers.join(','),
    ...data.map(row =>
      headers.map(h => {
        const val = row[h];
        const str = val === null || val === undefined ? '' : String(val);
        return `"${str.replace(/"/g, '""')}"`;
      }).join(',')
    )
  ].join('\n');
}

// GET /api/export/:type
exportRouter.get('/:type', async (req: Request, res: Response) => {
  const { type } = req.params;
  const db = req.tenantDb;

  try {
    let data: any[] = [];
    let filename = 'export.csv';

    switch (type) {
      case 'patients': {
        // Try patients table (new schema) or case_datas (legacy)
        const tbl = await detectTable(db, ['patients', 'case_datas']);
        if (!tbl) { res.status(404).json({ success: false, message: 'Patients table not found' }); return; }
        const isLegacy = tbl === 'case_datas';
        data = await pgExport(db, isLegacy
          ? `SELECT regid, CONCAT(first_name, ' ', COALESCE(surname, '')) AS name, mobile1 AS mobile, gender, dob, city, created_at FROM case_datas ORDER BY regid ASC`
          : `SELECT regid, first_name, surname, gender, dob, phone, mobile1, email, address, city, state, created_at FROM patients WHERE deleted_at IS NULL ORDER BY regid ASC`
        );
        filename = 'patient_registry.csv';
        break;
      }

      case 'cases': {
        const tbl = await detectTable(db, ['case_datas', 'patients']);
        if (!tbl) { res.status(404).json({ success: false, message: 'Cases table not found' }); return; }
        data = await pgExport(db, `
          SELECT cd.regid, CONCAT(cd.first_name, ' ', COALESCE(cd.surname, '')) AS patient_name,
                 cd.mobile1 AS mobile, cd.city, cd.created_at
          FROM case_datas cd
          ORDER BY cd.regid DESC
          LIMIT 5000
        `);
        filename = 'case_history.csv';
        break;
      }

      case 'billing': {
        const tbl = await detectTable(db, ['receipt', 'bill', 'bills']);
        if (!tbl) { res.status(404).json({ success: false, message: 'Billing table not found' }); return; }
        data = await pgExport(db, `
          SELECT b.id, b.regid, b.bill_date, b.charges, b.received, b.balance, b.payment_mode, b.created_at
          FROM "${tbl}" b
          WHERE b.deleted_at IS NULL OR b.deleted_at::text = ''
          ORDER BY b.id DESC
          LIMIT 5000
        `);
        filename = 'financial_ledger.csv';
        break;
      }

      case 'appointments': {
        data = await pgExport(db, `
          SELECT a.id, a.patient_name, a.phone, a.booking_date, a.booking_time,
                 a.status, a.token_no, a.visit_type, a.consultation_fee, a.created_at
          FROM appointments a
          WHERE a.deleted_at IS NULL OR a.deleted_at::text = ''
          ORDER BY a.id DESC
          LIMIT 5000
        `);
        filename = 'scheduling_log.csv';
        break;
      }

      default:
        res.status(400).json({ success: false, message: `Invalid export type: ${type}. Valid types: patients, cases, billing, appointments` });
        return;
    }

    const csv = toCSV(data);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-cache');
    res.send(csv);

  } catch (err: any) {
    logger.error({ err, type }, 'Export failed');
    res.status(500).json({ success: false, message: `Failed to generate export: ${err.message}` });
  }
});
