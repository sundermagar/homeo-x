import { sql } from "drizzle-orm";
import type { DbClient } from "@mmc/database";

export interface PendingStickerRow {
  caseId: number;
  randId: string;
  dateval: string;
  patientName: string;
  phone: string;
  medicines: {
    id: number;
    remedy: string;
    potency: string;
    frequency: string;
    days: string;
    cost: number;
  }[];
  totalMedicineCost: number;
  postType: string;
  courierCompany?: string;
  podNumber?: string;
}

export class DispensaryRepositoryPg {
  constructor(private readonly db: DbClient) { }

  /**
   * Get today's pending stickers.
   * Matches legacy RefrencedetailsController::dailycollectionsticker()
   */
  async getPendingStickers(clinicId: number | null, date?: string): Promise<PendingStickerRow[]> {
    const targetDate = date || new Date().toISOString().split('T')[0];

    // Note: In Postgres, aggregating JSON arrays needs to be careful with nulls, but we'll use json_agg
    const rows = await this.db.execute(sql`
      SELECT 
        cp.rand_id,
        cp.regid as case_id,
        MAX(cp.dateval) as dateval,
        cd.first_name || ' ' || cd.surname AS patient_name,
        cd.mobile1 AS phone,
        MAX(cm.post_type) AS post_type,
        MAX(cm.courier) AS courier_company,
        MAX(cm.pcd) AS pod_number,
        json_agg(
          json_build_object(
            'id', cp.id,
            'remedy', cp.rxremedy,
            'potency', cp.rxpotency,
            'frequency', cp.rxfrequency,
            'days', cp.rxdays,
            'cost', COALESCE(NULLIF(cp.rxprescription, '')::numeric, 0)
          )
        ) as medicines,
        SUM(COALESCE(NULLIF(cp.rxprescription, '')::numeric, 0)) as total_medicine_cost
      FROM case_potencies cp
      JOIN case_datas cd ON cd.regid = cp.regid
      LEFT JOIN courier_medicine cm ON cm.rand_id = cp.rand_id
      WHERE cp.dateval = ${targetDate}
        AND (cp.lastval = '0' OR cp.lastval IS NULL)
        AND (cp.deleted_at IS NULL)
        ${clinicId ? sql`AND (cd.clinic_id = ${clinicId} OR cd.clinic_id IS NULL)` : sql``}
      GROUP BY cp.rand_id, cp.regid, cd.first_name, cd.surname, cd.mobile1
      ORDER BY MAX(cp.created_at) DESC
    `);

    return (rows as any[]).map(r => ({
      caseId: r.case_id,
      randId: r.rand_id,
      dateval: r.dateval,
      patientName: r.patient_name?.trim(),
      phone: r.phone,
      medicines: r.medicines || [],
      totalMedicineCost: parseFloat(r.total_medicine_cost || 0),
      postType: r.post_type || 'Clinic',
      courierCompany: r.courier_company,
      podNumber: r.pod_number,
    }));
  }

  /**
   * Mark stickers as printed (lastval = 1)
   */
  async markStickersPrinted(randId: string): Promise<void> {
    await this.db.execute(sql`
      UPDATE case_potencies
      SET lastval = '1', updated_at = NOW()
      WHERE rand_id = ${randId}
    `);
  }
}
