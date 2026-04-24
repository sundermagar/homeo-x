import { sql } from 'drizzle-orm';

// ─── DTOs ────────────────────────────────────────────────────────────────────

export interface RemedyTreeNode {
  id: number;
  parentId: number;
  label: string;
  description: string | null;
  nodeType: string;
  sortOrder: number;
  children?: RemedyTreeNode[];
}

export interface AlphabetGroup {
  letter: string;
  nodes: RemedyTreeNode[];
}

export interface RemedyLookups {
  medicines: { id: number; name: string }[];
  potencies: { id: number; name: string }[];
  frequencies: { id: number; name: string }[];
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
}

// ─── Use Case ────────────────────────────────────────────────────────────────

export class RemedyChartUseCase {
  constructor(private readonly db: any) { }

  private async _executeWithFallback(primary: Promise<any>, backup: Promise<any>) {
    try {
      return await primary;
    } catch {
      try {
        return await backup;
      } catch {
        return [];
      }
    }
  }

  // ── 1. Full hierarchical tree (optionally filtered by label) ──
  async getRemedyTree(label?: string): Promise<RemedyTreeNode[]> {
    const rows = await this._executeWithFallback(
      this.db.execute(sql`
        SELECT id, parent_id, label, description, node_type, sort_order
        FROM remedy_tree_nodes
        WHERE is_active = true
        ORDER BY label ASC
      `),
      this.db.execute(sql`
        SELECT id, parent_id, label, description,
               'RUBRIC' AS node_type, 0 AS sort_order
        FROM managetreedatas
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
    }));

    // Filter by label if provided
    let needle = label?.trim() ?? '';
    if (needle.includes('(')) {
      const m = needle.match(/\(([^)]+)\)/);
      if (m) needle = m[1] ?? needle;
    }
    const filtered = needle
      ? flat.filter(n => n.label.toLowerCase() === needle.toLowerCase())
      : flat;

    return this._buildTree(filtered.length > 0 ? filtered : flat);
  }

  // ── 2. A-Z grouped index of root-level nodes ──
  async getTreeByAlphabet(): Promise<AlphabetGroup[]> {
    const rows = await this._executeWithFallback(
      this.db.execute(sql`
        SELECT id, parent_id, label, description, node_type, sort_order
        FROM remedy_tree_nodes
        WHERE parent_id = 0 AND is_active = true
        ORDER BY label ASC
      `),
      this.db.execute(sql`
        SELECT id, parent_id, label, description,
               'RUBRIC' AS node_type, 0 AS sort_order
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
      this.db.execute(sql`
        SELECT id, parent_id, label, description, node_type, sort_order
        FROM remedy_tree_nodes
        WHERE label ILIKE ${safeLetter + '%'} AND parent_id = 0 AND is_active = true
        ORDER BY label ASC
      `),
      this.db.execute(sql`
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
      this.db.execute(sql`
        SELECT id, tree_id, remedy, potency, notes, sort_order
        FROM remedy_alternatives
        WHERE tree_id = ${treeNodeId}
        ORDER BY remedy ASC
      `),
      this.db.execute(sql`
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
      this._executeWithFallback(
        this.db.execute(sql`
          SELECT id, name FROM medicines WHERE deleted_at IS NULL ORDER BY name ASC
        `),
        this.db.execute(sql`SELECT id, name FROM stocks WHERE deleted_at IS NULL ORDER BY name ASC`)
      ),
      this._executeWithFallback(
        this.db.execute(sql`
          SELECT id, name FROM potencies WHERE deleted_at IS NULL ORDER BY id ASC
        `),
        this.db.execute(sql`SELECT id, name FROM potencies1 WHERE deleted_at IS NULL ORDER BY id ASC`)
      ),
      this.db.execute(sql`
        SELECT id, COALESCE(frequency, title) AS name
        FROM case_frequency
        WHERE deleted_at IS NULL
        ORDER BY id ASC
      `).catch(() => []),
    ]);

    return {
      medicines: (medRows as any[]).map(r => ({ id: Number(r.id), name: String(r.name) })),
      potencies: (potRows as any[]).map(r => ({ id: Number(r.id), name: String(r.name) })),
      frequencies: (freqRows as any[]).map(r => ({ id: Number(r.id), name: String(r.name) })),
    };
  }

  // ── 6. Get all prescription rows for a patient ──
  async getPrescriptionsForPatient(regid: number) {
    const caseRow = await this.db.execute(sql`
      SELECT id FROM case_datas WHERE regid = ${regid} LIMIT 1
    `).catch(() =>
      this.db.execute(sql`
        SELECT id FROM medicalcases WHERE regid = ${regid} LIMIT 1
      `)
    );

    const caseId = (caseRow as any)[0] ? Number((caseRow as any)[0].id) : regid;

    const rows = await this.db.execute(sql`
      SELECT
        cp.id,
        cp.regid,
        cp.dateval,
        cp.todate,
        cp.appremedy   AS remedy_name,
        cp.apppotency  AS potency_name,
        cp.appfrequency AS frequency_name,
        cp.appdays     AS days,
        cp.appnotes    AS notes,
        cp.rxprescription AS prescription,
        cp.created_at
      FROM case_potencies cp
      WHERE cp.regid = ${caseId}
        AND cp.deleted_at IS NULL
      ORDER BY cp.id DESC
    `);

    return rows;
  }

  // ── 7. Upsert a prescription row ──
  async savePrescription(dto: SavePrescriptionDto): Promise<{ id: number }> {
    const caseRow = await this.db.execute(sql`
      SELECT id FROM case_datas WHERE regid = ${dto.regid} LIMIT 1
    `).catch(() =>
      this.db.execute(sql`
        SELECT id FROM medicalcases WHERE regid = ${dto.regid} LIMIT 1
      `)
    );
    const caseId = (caseRow as any)[0] ? Number((caseRow as any)[0].id) : dto.regid;

    const remedyName = dto.remedyName ?? '';
    const potencyName = dto.potencyName ?? '';
    const frequencyName = dto.frequencyName ?? '';
    const days = dto.days ?? 0;
    const notes = dto.notes ?? '';
    const prescription = dto.instructions ?? '';
    const clinicId = dto.clinicId ?? 0;
    const dateNow = new Date().toISOString().split('T')[0]!;

    if (dto.id) {
      await this.db.execute(sql`
        UPDATE case_potencies SET
          appremedy    = ${remedyName},
          apppotency   = ${potencyName},
          appfrequency = ${frequencyName},
          appdays      = ${days},
          appnotes     = ${notes},
          rxprescription = ${prescription},
          updated_at   = NOW()
        WHERE id = ${dto.id}
      `);
      return { id: dto.id };
    } else {
      const randId = `${dateNow.replace(/-/g, '')}${caseId}`;
      const result = await this.db.execute(sql`
        INSERT INTO case_potencies (
          rand_id, regid, clinic_id,
          appremedy, apppotency, appfrequency, appdays,
          appnotes, rxprescription,
          dateval, todate, sdate, created_at, updated_at
        ) VALUES (
          ${randId}, ${caseId}, ${clinicId},
          ${remedyName}, ${potencyName}, ${frequencyName}, ${days},
          ${notes}, ${prescription},
          ${dateNow}, ${dateNow}, ${dateNow}, NOW(), NOW()
        )
        RETURNING id
      `);
      return { id: Number((result as any)[0].id) };
    }
  }

  // ── 8. Soft-delete a prescription row ──
  async deletePrescription(id: number): Promise<void> {
    await this.db.execute(sql`
      UPDATE case_potencies SET deleted_at = NOW() WHERE id = ${id}
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
