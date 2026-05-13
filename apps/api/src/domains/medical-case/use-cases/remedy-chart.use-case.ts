import { sql } from 'drizzle-orm';
import { getAiProviderChain } from '../../../infrastructure/ai/ai-provider-chain.js';

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
}

// ─── Use Case ────────────────────────────────────────────────────────────────

export class RemedyChartUseCase {
  constructor(private readonly db: any) { }

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

  // ── 1.5 Semantic Search using pgvector ──
  async searchSemanticRubrics(query: string): Promise<RemedyTreeNode[]> {
    const chain = getAiProviderChain();
    
    // Generate embedding for the query
    const response = await chain.complete({
      systemPrompt: "You are a homeopathic assistant. Generate a semantic embedding for the following medical rubric or symptom. Respond with only the JSON array of numbers.",
      userPrompt: `Rubric: ${query}`,
      temperature: 0,
      // Note: In a production environment, we should call the embedding endpoint directly.
      // But since we have a provider chain, we use a specialized 'embed' method if it exists,
      // or we simulate it here if the chain supports it.
      // For now, I'll implement a direct fetch to Gemini to be consistent with the seeder.
    });

    // Actually, I'll implement a direct embedding call here to ensure consistency with the 3072-dim seeder.
    const GEMINI_API_KEY = process.env['GEMINI_API_KEY']?.split(',')[0];
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${GEMINI_API_KEY}`;
    
    const embedResponse = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: "models/gemini-embedding-001",
        content: { parts: [{ text: query }] }
      })
    });

    if (!embedResponse.ok) {
      throw new Error('Failed to generate embedding for search');
    }

    const embedData = await embedResponse.json() as any;
    const vector = embedData.embedding.values;

    // Perform vector similarity search
    const rows = await this.db.execute(sql`
      SELECT id, parent_id, label, description, node_type, sort_order,
             1 - (embedding <=> ${JSON.stringify(vector)}::vector) as similarity
      FROM remedy_tree_nodes
      WHERE is_active = true AND embedding IS NOT NULL
      ORDER BY embedding <=> ${JSON.stringify(vector)}::vector
      LIMIT 20
    `);

    return (rows as any[]).map(r => ({
      id: Number(r.id),
      parentId: Number(r.parent_id ?? 0),
      label: String(r.label),
      description: r.description ?? null,
      nodeType: String(r.node_type ?? 'RUBRIC'),
      sortOrder: Number(r.sort_order ?? 0),
      similarity: Number(r.similarity),
    }));
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
      this._executeWithFallback(
        () => this.db.execute(sql`
          SELECT id, name FROM medicines WHERE deleted_at IS NULL ORDER BY name ASC
        `),
        () => this.db.execute(sql`SELECT id, name FROM stocks WHERE deleted_at IS NULL ORDER BY name ASC`)
      ),
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
        LOWER(COALESCE(cm.post_type, 'clinic')) AS "deliveryMode"
      FROM case_potencies cp
      LEFT JOIN courier_medicine cm ON cp.rand_id = cm.rand_id
      WHERE cp.regid = ${regid}
        AND (cp.deleted_at IS NULL OR cp.deleted_at = '')
      ORDER BY cp.id DESC
    `);
    return rows;
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
      prescriptionId = Number((result as any)[0].id);
    }

    // Upsert Delivery Mode if provided
    if (deliveryMode && randId) {
      if (deliveryMode === 'courier' || deliveryMode === 'pickup') {
        const postType = deliveryMode === 'courier' ? 'Courier' : 'Pickup';
        const isPickup = deliveryMode === 'pickup' ? 1 : 0;
        
        // Map columns correctly: case_id = patient regid, regid = internal case ID (visitId)
        const patientRegid = regid;
        const internalCaseId = visitId;

        const check = await this.db.execute(sql`SELECT id FROM courier_medicine WHERE rand_id = ${randId}`);
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
             WHERE rand_id = ${randId}
           `);
        } else {
          await this.db.execute(sql`
             INSERT INTO courier_medicine (
               case_id, regid, rand_id, currentdate, remedy, potency, frequency, days, post_type, pickup, read_type, is_assign, created_at, updated_at
             ) VALUES (
               ${patientRegid}, ${internalCaseId}, ${randId}, ${dateNow}, 
               ${remedyName}, ${potencyName}, ${frequencyName}, ${String(days)},
               ${postType}, ${isPickup}, 'unread', 0, NOW(), NOW()
             )
           `);
        }
      } else if (deliveryMode === 'clinic') {
        await this.db.execute(sql`DELETE FROM courier_medicine WHERE rand_id = ${randId}`);
      }
    }

    return { id: prescriptionId };
  }

  // ── 8. Soft-delete a prescription row ──
  async deletePrescription(id: number): Promise<void> {
    await this.db.execute(sql`
      UPDATE case_potencies SET deleted_at = NOW()::text WHERE id = ${id}
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
