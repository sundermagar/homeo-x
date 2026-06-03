import { sql } from 'drizzle-orm';

// ─── DTOs ────────────────────────────────────────────────────────────────────

export interface RemedyTreeNode {
  id: number;
  parentId: number;
  label: string;
  description: string | null;
  nodeType: string;
  sortOrder: number;
  hindiLabel?: string;
  gujratiLabel?: string;
  marathiLabel?: string;
  children?: RemedyTreeNode[];
}

export interface AlphabetGroup {
  letter: string;
  nodes: RemedyTreeNode[];
}

export interface RemedyLookups {
  medicines: { id: number; name: string }[];
  potencies: { id: number; name: string }[];
  frequencies: { id: number; name: string; instruction: string }[];
}

export interface SavePrescriptionDto {
  id?: number;
  regid: number;
  visitId?: number;
  clinicId?: number;
  dateval?: string;
  medicineId?: number;
  remedyName?: string;    // free-text override
  potencyId?: number;
  potencyName?: string;    // free-text override
  frequencyId?: number;
  frequencyName?: string;
  days?: number;
  instructions?: string;
  notes?: string;
  deliveryMode?: string;  // 'clinic', 'courier', 'pickup'
  medicineCharge?: number;
}

// ─── Use Case ────────────────────────────────────────────────────────────────

import type { BillingRepository } from '../../billing/ports/billing.repository.js';

export class RemedyChartUseCase {
  constructor(
    private readonly db: any,
    private readonly billingRepo?: BillingRepository
  ) { }

  private async _executeWithFallback(primary: () => Promise<any>, backup: () => Promise<any>) {
    try {
      return await primary();
    } catch (err) {
      console.warn('Primary query failed, falling back to legacy:', err);
      try {
        return await backup();
      } catch (backupErr) {
        console.error('Backup query failed too:', backupErr);
        return [];
      }
    }
  }

  // ── 1. Full hierarchical tree (optionally filtered by label) ──
  async getRemedyTree(parentId: number = 0, label?: string): Promise<RemedyTreeNode[]> {
    const rows = await this._executeWithFallback(
      () => this.db.execute(sql`
        SELECT id, parent_id, label, description, node_type, sort_order,
               hindi_label, gujrati_label, marathi_label
        FROM remedy_tree_nodes
        WHERE is_active = true
          ${label ? sql`AND label ILIKE ${'%' + label + '%'}` : sql`AND parent_id = ${parentId}`}
        ORDER BY label ASC
      `),
      () => this.db.execute(sql`
        SELECT id, parent_id, label, description,
               'RUBRIC' AS node_type, 0 AS sort_order,
               hindi_label, gujrati_label, marathi_label
        FROM managetreedatas
        WHERE 1=1
          ${label ? sql`AND label ILIKE ${'%' + label + '%'}` : sql`AND parent_id = ${parentId}`}
        ORDER BY label ASC
      `)
    );

    const flat: RemedyTreeNode[] = (rows as any[]).map(r => ({
      id: Number(r.id),
      parentId: Number(r.parent_id ?? 0),
      label: String(r.label),
      description: r.description ?? null,
      nodeType: String(r.node_type ?? 'RUBRIC'),
      sortOrder: Number(r.sort_order ?? 0),
      hindiLabel: r.hindi_label,
      gujratiLabel: r.gujrati_label,
      marathiLabel: r.marathi_label,
    }));

    // For lazy loading, we don't build the tree deeply, 
    // unless it's a search result (but for now we keep it simple)
    return flat;
  }

  // ── 2. A-Z grouped index of root-level nodes ──
  async getTreeByAlphabet(): Promise<AlphabetGroup[]> {
    const rows = await this._executeWithFallback(
      () => this.db.execute(sql`
        SELECT id, parent_id, label, description, node_type, sort_order,
               hindi_label, gujrati_label, marathi_label
        FROM remedy_tree_nodes
        WHERE parent_id = 0 AND is_active = true
        ORDER BY label ASC
      `),
      () => this.db.execute(sql`
        SELECT id, parent_id, label, description,
               'RUBRIC' AS node_type, 0 AS sort_order,
               hindi_label, gujrati_label, marathi_label
        FROM managetreedatas
        WHERE parent_id = 0
        ORDER BY label ASC
      `)
    );

    const grouped: Record<string, RemedyTreeNode[]> = {};
    for (const r of rows as any[]) {
      const first = String(r.label).charAt(0).toUpperCase();
      if (!grouped[first]) grouped[first] = [];
      grouped[first].push({
        id: Number(r.id),
        parentId: Number(r.parent_id ?? 0),
        label: String(r.label),
        description: r.description ?? null,
        nodeType: String(r.node_type ?? 'RUBRIC'),
        sortOrder: Number(r.sort_order ?? 0),
        hindiLabel: r.hindi_label,
        gujratiLabel: r.gujrati_label,
        marathiLabel: r.marathi_label,
      });
    }

    return Object.keys(grouped).sort().map(letter => ({
      letter,
      nodes: grouped[letter] ?? [],
    }));
  }

  // ── 3. Filter root nodes by first letter ──
  async filterTreeByLetter(letter: string): Promise<AlphabetGroup[]> {
    const safeLetter = letter.charAt(0).toUpperCase();
    const rows = await this._executeWithFallback(
      () => this.db.execute(sql`
        SELECT id, parent_id, label, description, node_type, sort_order
        FROM remedy_tree_nodes
        WHERE label ILIKE ${safeLetter + '%'} AND parent_id = 0 AND is_active = true
        ORDER BY label ASC
      `),
      () => this.db.execute(sql`
        SELECT id, parent_id, label, description,
               'RUBRIC' AS node_type, 0 AS sort_order
        FROM managetreedatas
        WHERE label ILIKE ${safeLetter + '%'} AND parent_id = 0
        ORDER BY label ASC
      `)
    );

    const nodes: RemedyTreeNode[] = (rows as any[]).map(r => ({
      id: Number(r.id),
      parentId: Number(r.parent_id ?? 0),
      label: String(r.label),
      description: r.description ?? null,
      nodeType: String(r.node_type ?? 'RUBRIC'),
      sortOrder: Number(r.sort_order ?? 0),
    }));

    return [{ letter: safeLetter, nodes }];
  }

  // ── 4. Alternative medicines for a tree node ──
  async getAlternatives(treeNodeId: number) {
    const rows = await this._executeWithFallback(
      () => this.db.execute(sql`
        SELECT id, tree_id, remedy, potency, notes, sort_order
        FROM remedy_alternatives
        WHERE tree_id = ${treeNodeId}
        ORDER BY remedy ASC
      `),
      () => this.db.execute(sql`
        SELECT id, tree_id, remedy, potency, notes, 0 AS sort_order
        FROM medicine_others
        WHERE tree_id = ${treeNodeId}
        ORDER BY remedy ASC
      `)
    );
    return rows;
  }

  // ── 5. Lookup tables (medicines + potencies + frequencies) ──
  async getRemedyLookups(): Promise<RemedyLookups> {
    const [medRows, potRows, freqRows] = await Promise.all([
      this.db.execute(sql`
        SELECT id, name FROM stocks WHERE deleted_at IS NULL ORDER BY name ASC
      `),
      this._executeWithFallback(
        () => this.db.execute(sql`
          SELECT id, name FROM potencies WHERE deleted_at IS NULL ORDER BY id ASC
        `),
        () => this.db.execute(sql`SELECT id, name FROM potencies1 WHERE deleted_at IS NULL ORDER BY id ASC`)
      ),
      this._executeWithFallback(
        () => this.db.execute(sql`
          SELECT id, title, frequency
          FROM case_frequency
          ORDER BY id ASC
        `),
        () => this.db.execute(sql`
          SELECT id, title, frequency
          FROM case_frequency
          WHERE deleted_at IS NULL
          ORDER BY id ASC
        `)
      ).catch(() => []),
    ]);

    return {
      medicines: (medRows as any[]).map(r => ({ id: Number(r.id), name: String(r.name) })),
      potencies: (potRows as any[]).map(r => ({ id: Number(r.id), name: String(r.name) })),
      frequencies: (freqRows as any[]).map(r => ({
        id: Number(r.id),
        name: String(r.title || r.name || ''),
        instruction: String(r.frequency || r.instruction || '')
      })),
    };
  }

  // ── 6. Get all prescription rows for a patient ──
  async getPrescriptionsForPatient(regid: number) {
    const rows = await this.db.execute(sql`
      SELECT
        cp.id,
        cp.regid,
        cp.dateval,
        cp.todate,
        COALESCE(cp.rxremedy, '') AS remedy_name,
        COALESCE(cp.rxpotency, '') AS potency_name,
        COALESCE(cp.rxfrequency, '') AS frequency_name,
        COALESCE(cp.rxdays, '0') AS days,
        COALESCE(cp.rxprescription, '') AS notes,
        COALESCE(cp.rxprescription, '') AS prescription,
        cp.created_at,
        LOWER(COALESCE(cm.post_type, 'clinic')) AS delivery_mode
      FROM case_potencies cp
      LEFT JOIN courier_medicine cm ON (cm.rand_id = cp.id::text OR cm.rand_id = cp.rand_id)
      WHERE cp.regid = ${regid}
        AND (cp.deleted_at IS NULL OR cp.deleted_at = '')
      ORDER BY cp.id DESC
    `);
    // Normalize: DB drivers may return column as delivery_mode, deliverymode, or deliveryMode.
    // Ensure every row has a consistent `deliveryMode` property for the frontend.
    return (rows as any[]).map(row => ({
      ...row,
      deliveryMode: row.deliveryMode || row.deliverymode || row.delivery_mode || 'clinic',
    }));
  }

  // ── 7. Upsert a prescription row ──
  async savePrescription(dto: SavePrescriptionDto): Promise<{ id: number }> {
    const remedyName = dto.remedyName ?? '';
    const potencyName = dto.potencyName ?? '';
    const frequencyName = dto.frequencyName ?? '';
    const days = dto.days ?? 0;
    const prescription = dto.instructions ?? '';
    const dateNow = new Date().toISOString().split('T')[0]!;
    const regid = dto.regid;
    const deliveryMode = dto.deliveryMode;
    const visitId = dto.visitId || 0;

    let prescriptionId: number;
    let randId: string;

    if (dto.id) {
      const existing = await this.db.execute(sql`SELECT rand_id FROM case_potencies WHERE id = ${dto.id}`);
      randId = (existing as any[])[0]?.rand_id;

      await this.db.execute(sql`
        UPDATE case_potencies SET
          rxremedy      = ${remedyName},
          rxpotency     = ${potencyName},
          rxfrequency   = ${frequencyName},
          rxdays        = ${String(days)},
          rxprescription = ${prescription},
          updated_at    = NOW()
        WHERE id = ${dto.id}
      `);
      prescriptionId = dto.id;
    } else {
      randId = `${dateNow.replace(/-/g, '')}${regid}`;
      const result = await this.db.execute(sql`
        INSERT INTO case_potencies (
          rand_id, regid,
          rxremedy, rxpotency, rxfrequency, rxdays,
          rxprescription,
          dateval, todate, sdate, created_at, updated_at
        ) VALUES (
          ${randId}, ${regid},
          ${remedyName}, ${potencyName}, ${frequencyName}, ${String(days)},
          ${prescription},
          ${dateNow}, ${dateNow}, ${dateNow}, NOW(), NOW()
        )
        RETURNING id
      `);
      prescriptionId = (result as any[])[0]?.id;
    }

    if (this.billingRepo && dto.medicineCharge !== undefined && dto.medicineCharge > 0) {
      // Create or update Consultation bill for this day
      try {
        const [existing] = await this.db.execute(sql`
          SELECT id, received FROM bills 
          WHERE regid = ${regid} 
          AND bill_date = ${dateNow}
          AND bill_type = 'Consultation'
          AND custom_title = 'Medicine Days Charge'
          AND deleted_at IS NULL
          LIMIT 1
        `) as any[];

        if (existing) {
          const received = existing.received ?? 0;
          const newBalance = dto.medicineCharge - received;
          await this.db.execute(sql`
            UPDATE bills SET 
              charges = ${dto.medicineCharge},
              balance = ${newBalance},
              updated_at = NOW()
            WHERE id = ${existing.id}
          `);
        } else {
          const [billNoRes] = await this.db.execute(sql`SELECT nextval('bill_no_seq') as nextval`) as any[];
          const billNo = billNoRes?.nextval ?? 0;
          
          await this.db.execute(sql`
            INSERT INTO bills (regid, bill_no, bill_date, charges, received, balance, payment_mode, bill_type, custom_title, created_at, updated_at)
            VALUES (${regid}, ${billNo}, ${dateNow}, ${dto.medicineCharge}, 0, ${dto.medicineCharge}, 'Cash', 'Consultation', 'Medicine Days Charge', NOW(), NOW())
          `);
        }
      } catch (err) {
        console.error('Failed to create/update medicine charge bill:', err);
      }
    }

    // Upsert Delivery Mode if provided
    // We use the unique prescriptionId (casted to string) as the rand_id for the courier entry.
    // This ensures every medicine row gets its own independent entry in the courier queue.
    const syncRandId = String(prescriptionId);

    if (deliveryMode && syncRandId) {
      if (deliveryMode === 'courier' || deliveryMode === 'pickup') {
        const postType = deliveryMode === 'courier' ? 'Courier' : 'Pickup';
        const isPickup = deliveryMode === 'pickup' ? 1 : 0;
        
        const patientRegid = regid;
        const internalCaseId = visitId;

        const check = await this.db.execute(sql`SELECT id FROM courier_medicine WHERE rand_id = ${syncRandId}`);
        if ((check as any[]) && (check as any[]).length > 0) {
          await this.db.execute(sql`
             UPDATE courier_medicine 
             SET 
               post_type = ${postType}, 
               pickup = ${isPickup}, 
               read_type = 'unread', 
               remedy = ${remedyName},
               potency = ${potencyName},
               frequency = ${frequencyName},
               days = ${String(days)},
               updated_at = NOW() 
             WHERE rand_id = ${syncRandId}
           `);
        } else {
          await this.db.execute(sql`
             INSERT INTO courier_medicine (
               case_id, regid, rand_id, currentdate, remedy, potency, frequency, days, post_type, pickup, read_type, is_assign, created_at, updated_at
             ) VALUES (
               ${patientRegid}, ${internalCaseId}, ${syncRandId}, ${dateNow}, 
               ${remedyName}, ${potencyName}, ${frequencyName}, ${String(days)},
               ${postType}, ${isPickup}, 'unread', 0, NOW(), NOW()
             )
           `);
        }
      } else if (deliveryMode === 'clinic') {
        await this.db.execute(sql`DELETE FROM courier_medicine WHERE rand_id = ${syncRandId}`);
      }
    }

    return { id: prescriptionId };
  }

  // ── 8. Soft-delete a prescription row ──
  // When the last prescription for a given date is deleted, also clean up
  // related records (SOAP/homeo details, followup notes, images, investigations).
  async deletePrescription(id: number): Promise<void> {
    // 1. Fetch the prescription being deleted to get regid + dateval
    const [rx] = await this.db.execute(sql`
      SELECT regid, dateval FROM case_potencies WHERE id = ${id}
    `) as any[];

    // 2. Soft-delete the prescription itself
    await this.db.execute(sql`
      UPDATE case_potencies SET deleted_at = NOW()::text WHERE id = ${id}
    `);
    // Also remove from courier queue if it exists
    await this.db.execute(sql`DELETE FROM courier_medicine WHERE rand_id = ${String(id)}`);

    if (!rx) return;

    const regid = Number(rx.regid);
    const dateval = rx.dateval;
    if (!dateval) return;

    // 3. Check if there are any remaining (non-deleted) prescriptions for the same regid + date
    const remaining = await this.db.execute(sql`
      SELECT COUNT(*)::int AS cnt FROM case_potencies
      WHERE regid = ${regid}
        AND dateval = ${dateval}
        AND (deleted_at IS NULL OR deleted_at = '')
    `) as any[];

    const count = Number(remaining?.[0]?.cnt ?? 0);
    if (count > 0) return; // Other prescriptions remain for this date, don't cascade

    // 4. This was the last prescription for that date — cascade delete related records
    console.log(`🗑️ Last prescription for regid=${regid} date=${dateval} deleted, cascading cleanup...`);

    // Delete SOAP notes (homeo details) for this date
    await this.db.execute(sql`
      DELETE FROM soap_notes
      WHERE regid = ${regid}
        AND created_at::date = ${dateval}::date
    `);

    // Delete case notes (followup) for this date
    await this.db.execute(sql`
      UPDATE case_notes SET deleted_at = NOW()
      WHERE regid = ${regid}
        AND dateval = ${dateval}
        AND deleted_at IS NULL
    `);

    // Delete case images for this date
    await this.db.execute(sql`
      UPDATE case_images SET deleted_at = NOW()
      WHERE regid = ${regid}
        AND created_at::date = ${dateval}::date
        AND deleted_at IS NULL
    `);

    // Delete investigations for this date
    await this.db.execute(sql`
      UPDATE investigations SET deleted_at = NOW()
      WHERE regid = ${regid}
        AND invest_date = ${dateval}
        AND deleted_at IS NULL
    `);
  }

  // ─── Tree builder ──────────────────────────────────────────────────────────
  private _buildTree(nodes: RemedyTreeNode[], parentId = 0): RemedyTreeNode[] {
    return nodes
      .filter(n => n.parentId === parentId)
      .map(n => {
        const children = this._buildTree(nodes, n.id);
        return children.length > 0 ? { ...n, children } : n;
      });
  }
}
