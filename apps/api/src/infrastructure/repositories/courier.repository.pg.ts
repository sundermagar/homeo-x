import { eq, and, desc, sql, isNull, or } from "drizzle-orm";
import type { DbClient } from "@mmc/database";
import * as schema from "@mmc/database";

export interface CourierMedicineRow {
  id: number;
  caseId: number;  // regid in legacy
  regid: number | null;
  randId: string;
  currentdate: string;
  remedy: string | null;
  potency: string | null;
  frequency: string | null;
  days: string | null;
  pcd: string | null;
  courier: string | null;
  pickup: number;
  postType: string;  // 'Courier' | 'Pickup' | 'Clinic'
  isAssign: number;  // 0 or 1
  readType: string;  // 'read' | 'unread'
  createdAt: Date | null;
  // Joined patient data
  patientName?: string;
  phone?: string;
  // Aliases for compatibility with other dashboards
  tracking_no?: string | null;
  mobile?: string | null;
  courier_name?: string | null;
  status?: string;
  dispatch_date?: Date | null;
}

export interface CreateCourierInput {
  caseId: number;     // regid - the patient regid
  regid?: number;     // internal case ID (legacy caseData.id)
  randId: string;     // unique batch ID (e.g. 20260511 + caseID)
  remedy?: string;
  potency?: string;
  frequency?: string;
  days?: string;
  postType: string;   // 'Courier' | 'Pickup' | 'Clinic'
}

export interface AssignCourierInput {
  id: number;
  pcd?: string;       // POD / tracking number
  courier?: string;   // courier company name
  pickup?: number;    // 1 = picked up
}

export class CourierRepositoryPg {
  constructor(private readonly db: DbClient) {}

  /**
   * Get today's courier queue — all entries for today with post_type = 'Courier' or 'Pickup',
   * filtered by clinic_id (via case_datas join), matching legacy CouriermedicineController::index().
   */
  async getQueue(clinicId: number | null, date?: string): Promise<CourierMedicineRow[]> {
    const targetDate = date || new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    
    const rows = await this.db.execute(sql`
      SELECT 
        cm.id, cm.case_id, cm.regid, cm.rand_id, cm.currentdate,
        cm.remedy, cm.potency, cm.frequency, cm.days,
        cm.pcd, cm.courier, cm.pickup, cm.post_type, cm.is_assign, cm.read_type,
        cm.created_at,
        cd.first_name || ' ' || cd.surname AS patient_name,
        cd.mobile1 AS phone
      FROM courier_medicine cm
      JOIN case_datas cd ON cd.regid = cm.case_id
      WHERE cm.currentdate = ${targetDate}
        AND cm.post_type IN ('Courier', 'Pickup')
        AND (cm.deleted_at IS NULL OR cm.deleted_at = '')
        ${clinicId ? sql`AND cd.clinic_id = ${clinicId}` : sql`AND (cd.clinic_id IS NULL)`}
      ORDER BY cm.created_at DESC
    `);
    
    return (rows as any[]).map(r => this.toRow(r));
  }

  /**
   * Get courier history for a specific patient (regid).
   * Matches legacy CouriermedicineController::getcourierdetails().
   */
  async getByPatient(caseId: number): Promise<CourierMedicineRow[]> {
    const rows = await this.db.execute(sql`
      SELECT 
        cm.id, cm.case_id, cm.regid, cm.rand_id, cm.currentdate,
        cm.remedy, cm.potency, cm.frequency, cm.days,
        cm.pcd, cm.courier, cm.pickup, cm.post_type, cm.is_assign, cm.read_type,
        cm.created_at
      FROM courier_medicine cm
      WHERE cm.case_id = ${caseId}
        AND cm.post_type IN ('Courier', 'Pickup')
        AND (cm.deleted_at IS NULL OR cm.deleted_at = '')
      ORDER BY cm.created_at DESC
    `);

    return (rows as any[]).map(r => this.toRow(r));
  }

  /**
   * Get all shipments for the logistics dashboard.
   */
  async getAllShipments(clinicId: number | null): Promise<CourierMedicineRow[]> {
    const rows = await this.db.execute(sql`
      SELECT 
        cm.id, cm.case_id, cm.regid, cm.rand_id, cm.currentdate,
        cm.remedy, cm.potency, cm.frequency, cm.days,
        cm.pcd, cm.courier, cm.pickup, cm.post_type, cm.is_assign, cm.read_type,
        cm.created_at,
        cd.first_name || ' ' || cd.surname AS patient_name,
        cd.mobile1 AS phone
      FROM courier_medicine cm
      JOIN case_datas cd ON cd.regid = cm.case_id
      WHERE cm.post_type IN ('Courier', 'Pickup')
        AND (cm.deleted_at IS NULL OR cm.deleted_at = '')
        ${clinicId ? sql`AND cd.clinic_id = ${clinicId}` : sql``}
      ORDER BY cm.created_at DESC
      LIMIT 100
    `);
    
    return (rows as any[]).map(r => this.toRow(r));
  }

  /**
   * Create a courier_medicine entry.
   * Called when a doctor saves a prescription with post_type = 'Courier' or 'Pickup'.
   * Matches legacy MedicalcasesController::store() → Couriermedicine::create().
   */
  async create(input: CreateCourierInput): Promise<CourierMedicineRow> {
    const [row] = await this.db.execute(sql`
      INSERT INTO courier_medicine (case_id, regid, rand_id, currentdate, remedy, potency, frequency, days, post_type, pickup, is_assign, read_type, created_at, updated_at)
      VALUES (
        ${input.caseId},
        ${input.regid || null},
        ${input.randId},
        ${new Date().toISOString().split('T')[0]},
        ${input.remedy || null},
        ${input.potency || null},
        ${input.frequency || null},
        ${input.days || null},
        ${input.postType},
        0,
        0,
        'unread',
        NOW(),
        NOW()
      )
      RETURNING *
    `) as any[];

    return this.toRow(row);
  }

  /**
   * Assign courier details (POD, company) or mark pickup.
   * Matches legacy CouriermedicineController::savepackages().
   */
  async assign(input: AssignCourierInput): Promise<CourierMedicineRow> {
    const [row] = await this.db.execute(sql`
      UPDATE courier_medicine
      SET 
        pcd = COALESCE(${input.pcd || null}, pcd),
        courier = COALESCE(${input.courier || null}, courier),
        pickup = COALESCE(${input.pickup ?? null}, pickup),
        is_assign = 1,
        updated_at = NOW()
      WHERE id = ${input.id}
      RETURNING *
    `) as any[];

    if (!row) throw new Error(`Courier entry ${input.id} not found`);
    return this.toRow(row);
  }

  /**
   * Mark all unread entries as read.
   * Matches legacy CouriermedicineController::updatenotify().
   */
  async markAllRead(): Promise<number> {
    const result = await this.db.execute(sql`
      UPDATE courier_medicine SET read_type = 'read' WHERE read_type = 'unread'
    `);
    return (result as any)?.rowCount || 0;
  }

  /**
   * Get medicine detail for SMS notification.
   * Matches legacy CouriermedicineController::getmedicinedetail().
   */
  async getMedicineDetail(id: number): Promise<{ phone: string; firstName: string; surname: string; pcd: string; courier: string; regid: number; message: string } | null> {
    const [row] = await this.db.execute(sql`
      SELECT 
        cm.pcd, cm.courier, cm.case_id,
        cd.first_name, cd.surname, cd.mobile1, cd.regid
      FROM courier_medicine cm
      JOIN case_datas cd ON cd.regid = cm.case_id
      WHERE cm.id = ${id}
    `) as any[];

    if (!row) return null;

    const name = `${row.first_name || ''} ${row.surname || ''}`.trim();
    const message = `Dear ${name}, your medicines have been dispatched via ${row.courier || 'courier'} and the POD number is ${row.pcd || 'N/A'}. For tracking, please contact the courier company. Regards, Kreed.health`;

    return {
      phone: row.mobile1 || '',
      firstName: row.first_name || '',
      surname: row.surname || '',
      pcd: row.pcd || '',
      courier: row.courier || '',
      regid: row.regid || row.case_id,
      message,
    };
  }

  /**
   * Get count of unread courier entries (for notification badge).
   */
  async getUnreadCount(): Promise<number> {
    const [row] = await this.db.execute(sql`
      SELECT COUNT(*) as count FROM courier_medicine 
      WHERE read_type = 'unread' 
        AND post_type IN ('Courier', 'Pickup')
        AND (deleted_at IS NULL OR deleted_at = '')
    `) as any[];
    return row?.count || 0;
  }

  /**
   * Delete a courier_medicine entry.
   */
  async delete(id: number): Promise<void> {
    await this.db.execute(sql`
      UPDATE courier_medicine 
      SET deleted_at = NOW() 
      WHERE id = ${id}
    `);
  }

  private toRow(r: any): CourierMedicineRow {
    return {
      id: r.id,
      caseId: r.case_id,
      regid: r.regid,
      randId: r.rand_id,
      currentdate: r.currentdate,
      remedy: r.remedy,
      potency: r.potency,
      frequency: r.frequency,
      days: r.days,
      pcd: r.pcd,
      courier: r.courier,
      pickup: r.pickup,
      postType: r.post_type,
      isAssign: r.is_assign,
      readType: r.read_type,
      createdAt: r.created_at,
      patientName: r.patient_name,
      phone: r.phone,
      // Aliases
      tracking_no: r.pcd,
      mobile: r.phone,
      courier_name: r.courier,
      status: r.is_assign === 1 ? (r.pickup === 1 ? 'Delivered' : 'Dispatched') : 'Pending',
      dispatch_date: r.created_at,
    };
  }
}
