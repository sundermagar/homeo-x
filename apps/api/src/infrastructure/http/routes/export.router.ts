
import { Router, type Router as ExpressRouter } from 'express';
import type { Request, Response } from 'express';
import { sql } from 'drizzle-orm';
import { createLogger } from '../../../shared/logger';

const logger = createLogger('export');
export const exportRouter: ExpressRouter = Router();

exportRouter.get('/:type', async (req: Request, res: Response) => {
  const { type } = req.params;
  const db = req.tenantDb;

  try {
    let data: any[] = [];
    let filename = '';

    switch (type) {
      case 'patients':
        data = await db.execute(sql`
          SELECT regid, first_name, surname, gender, dob, phone, mobile1, email, address, city, state, pin, created_at
          FROM patients
          WHERE deleted_at IS NULL
          ORDER BY regid ASC
        `);
        filename = 'patient_registry.csv';
        break;

      case 'cases':
        data = await db.execute(sql`
          SELECT mc.id, p.first_name || ' ' || p.surname as patient_name, p.regid,
                 mc.complaints, mc.diagnosis, mc.prescription, mc.created_at
          FROM medical_cases mc
          JOIN patients p ON mc.patient_id = p.id
          WHERE mc.deleted_at IS NULL
          ORDER BY mc.id DESC
        `);
        filename = 'case_history.csv';
        break;

      case 'billing':
        // Detect revenue table (singular or plural as fixed earlier)
        const tableRes = await db.execute(sql`
          SELECT table_name FROM information_schema.tables 
          WHERE table_name IN ('receipt', 'bills', 'bill') AND table_schema = CURRENT_SCHEMA() 
          LIMIT 1
        `);
        const tableName = tableRes[0]?.table_name || 'bills';

        data = await db.execute(sql.raw(`
          SELECT b.id, b.regid, p.first_name || ' ' || p.surname as patient_name,
                 b.bill_date, b.charges, b.received, b.balance, b.payment_mode, b.created_at
          FROM ${tableName} b
          LEFT JOIN patients p ON b.regid = p.regid
          WHERE (b.deleted_at IS NULL OR b.deleted_at::text = '')
          ORDER BY b.id DESC
        `));
        filename = 'financial_ledger.csv';
        break;

      case 'appointments':
        data = await db.execute(sql`
          SELECT a.id, p.first_name || ' ' || p.surname as patient_name, a.booking_date, a.booking_time,
                 a.status, a.token_no, a.created_at
          FROM appointments a
          JOIN patients p ON a.patient_id = p.id
          WHERE (a.deleted_at IS NULL OR a.deleted_at::text = '')
          ORDER BY a.id DESC
        `);
        filename = 'scheduling_log.csv';
        break;

      default:
        res.status(400).json({ success: false, message: 'Invalid export type' });
        return;
    }

    if (!data || data.length === 0) {
      // Return empty CSV with header if possible, or just message
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send('No records found');
      return;
    }

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(h => {
          const val = row[h];
          const str = val === null || val === undefined ? '' : String(val);
          return `"${str.replace(/"/g, '""')}"`;
        }).join(',')
      )
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvContent);

  } catch (err: any) {
    logger.error({ err, type }, 'Export failed');
    res.status(500).json({ success: false, message: 'Failed to generate export' });
  }
});
