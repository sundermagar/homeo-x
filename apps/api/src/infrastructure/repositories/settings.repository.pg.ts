import { eq, asc, sql } from 'drizzle-orm';
import { createLogger } from '../../shared/logger.js';

import type { DbClient } from '@mmc/database';
import type {
  ISettingsRepository,
  Department, Dispensary, ReferralSource, Sticker,
  StaticPage, Faq, PdfSetting, Medicine, Potency, Frequency,
  MessageTemplate, StockLog, PackagePlan, Courier,
  User
} from '../../domains/settings/ports/settings.repository.js';

export class SettingsRepositoryPg implements ISettingsRepository {
  private readonly logger = createLogger('settings-repository-pg');
  constructor(private readonly db: DbClient) {}


  // ─── Helpers: raw query via db.execute ───────────────────────────────────────
  private async q<T>(query: string, params: unknown[] = []): Promise<T[]> {
    let rows;
    try {
      // Find postgres.js client dynamically inside Drizzle's session to bypass module restarts
      const rawClient = (this.db as any).session?.client || (this.db as any).rawClient;
      if (rawClient && typeof rawClient.unsafe === 'function') {
        rows = await rawClient.unsafe(query, params);
      } else {
        const result = await (this.db as any).execute({ text: query, values: params });
        rows = result.rows ?? result;
      }
    } catch (err: any) {
      this.logger.error({ err, query }, 'DB Error in SettingsRepo');
      throw err;
    }
    return (rows || []).map((row: any) => this.mapRow(row)) as T[];
  }

  private async q1<T>(query: string, params: unknown[] = []): Promise<T | undefined> {
    const rows = await this.q<T>(query, params);
    return rows[0];
  }

  private mapRow(row: any): any {
    if (!row) return row;
    const mapped: any = {};
    for (const key of Object.keys(row)) {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      mapped[camelKey] = row[key];
    }
    // Specific legacy mappings
    if (row.potency_name) mapped.name = row.potency_name;
    if (row.case_frequency) mapped.frequency = row.case_frequency;
    if (row.detail !== undefined && mapped.description === undefined) mapped.description = row.detail;
    return mapped;
  }

  // ─── Departments ──────────────────────────────────────────────────────────
  async listDepartments(): Promise<Department[]> {
    return this.q<Department>('SELECT * FROM departments ORDER BY id ASC');
  }
  async getDepartment(id: number): Promise<Department | undefined> {
    return this.q1('SELECT * FROM departments WHERE id = $1', [id]);
  }
  async createDepartment(data: Omit<Department, 'id' | 'createdAt' | 'updatedAt'>): Promise<Department> {
    return this.q1(
      `INSERT INTO departments (name, detail, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, NOW(), NOW()) RETURNING *`,
      [data.name, data.description ?? null, data.isActive ?? true]
    ) as Promise<Department>;
  }
  async updateDepartment(id: number, data: Partial<Omit<Department, 'id'>>): Promise<Department> {
    return this.q1(
      `UPDATE departments SET name = COALESCE($1, name), detail = COALESCE($2, detail),
       is_active = COALESCE($3, is_active), updated_at = NOW() WHERE id = $4 RETURNING *`,
      [data.name ?? null, data.description ?? null, data.isActive ?? null, id]
    ) as Promise<Department>;
  }
  async deleteDepartment(id: number): Promise<void> {
    await this.q('DELETE FROM departments WHERE id = $1', [id]);
  }

  // ─── Dispensaries ─────────────────────────────────────────────────────────
  async listDispensaries(): Promise<Dispensary[]> {
    return this.q<Dispensary>('SELECT * FROM dispensaries ORDER BY id ASC');
  }
  async getDispensary(id: number): Promise<Dispensary | undefined> {
    return this.q1('SELECT * FROM dispensaries WHERE id = $1', [id]);
  }
  async createDispensary(data: Omit<Dispensary, 'id'>): Promise<Dispensary> {
    const sanitizedData = { ...data, password: data.password ? '****' : null };
    this.logger.info({ dispensaryName: data.name }, 'Creating new dispensary staff account');
    this.logger.debug({ payload: sanitizedData }, 'Dispensary creation payload');

    const r = await this.q1<any>(
      `INSERT INTO dispensaries (
        name, email, password, gender, mobile, mobile2, 
        location, city, address, about, designation, 
        dept, date_birth, contact_number, is_active
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) RETURNING *`,
      [
        data.name, 
        data.email || null, 
        data.password || null, 
        data.gender || 'Male', 
        data.mobile || null, 
        data.mobile2 || null, 
        data.location || null, 
        data.city || null, 
        data.address || null, 
        data.about || null, 
        data.designation || null, 
        data.dept || null, 
        (data.dateBirth && data.dateBirth !== '') ? data.dateBirth : null, 
        data.contactNumber || null, 
        data.isActive ?? true
      ]
    );

    const result = { ...r, id: r?.ID ?? r?.id };
    this.logger.info({ dispensaryId: result.id }, 'Dispensary created successfully');
    return result;
  }

  async updateDispensary(id: number, data: Partial<Omit<Dispensary, 'id'>>): Promise<Dispensary> {
    const r = await this.q1<any>(
      `UPDATE dispensaries SET 
        name = COALESCE($1, name), 
        email = COALESCE($2, email),
        password = COALESCE($3, password),
        gender = COALESCE($4, gender),
        mobile = COALESCE($5, mobile),
        mobile2 = COALESCE($6, mobile2),
        location = COALESCE($7, location),
        city = COALESCE($8, city),
        address = COALESCE($9, address),
        about = COALESCE($10, about),
        designation = COALESCE($11, designation),
        dept = COALESCE($12, dept),
        date_birth = COALESCE($13, date_birth),
        contact_number = COALESCE($14, contact_number),
        is_active = COALESCE($15, is_active),
        updated_at = NOW() 
       WHERE id = $16 RETURNING *`,
      [
        data.name || null, 
        data.email || null, 
        data.password || null, 
        data.gender || null,
        data.mobile || null, 
        data.mobile2 || null, 
        data.location || null,
        data.city || null, 
        data.address || null, 
        data.about || null,
        data.designation || null, 
        data.dept || null, 
        (data.dateBirth && data.dateBirth !== '') ? data.dateBirth : null,
        data.contactNumber || null, 
        data.isActive ?? null,
        id
      ]
    );
    return { ...r, id: r?.ID ?? r?.id };
  }


  async deleteDispensary(id: number): Promise<void> {
    await this.q('DELETE FROM dispensaries WHERE id = $1', [id]);
  }

  // ─── Referral Sources ─────────────────────────────────────────────────────
  async listReferralSources(): Promise<ReferralSource[]> {
    return this.q<ReferralSource>('SELECT * FROM referral_sources ORDER BY name ASC');
  }
  async getReferralSource(id: number): Promise<ReferralSource | undefined> {
    return this.q1('SELECT * FROM referral_sources WHERE id = $1', [id]);
  }
  async createReferralSource(data: Omit<ReferralSource, 'id'>): Promise<ReferralSource> {
    return this.q1(
      `INSERT INTO referral_sources (name, type, is_active) VALUES ($1, $2, $3) RETURNING *`,
      [data.name, data.type ?? null, data.isActive ?? true]
    ) as Promise<ReferralSource>;
  }
  async updateReferralSource(id: number, data: Partial<Omit<ReferralSource, 'id'>>): Promise<ReferralSource> {
    return this.q1(
      `UPDATE referral_sources SET name = COALESCE($1, name), type = COALESCE($2, type),
       is_active = COALESCE($3, is_active), updated_at = NOW() WHERE id = $4 RETURNING *`,
      [data.name ?? null, data.type ?? null, data.isActive ?? null, id]
    ) as Promise<ReferralSource>;
  }
  async deleteReferralSource(id: number): Promise<void> {
    await this.q('DELETE FROM referral_sources WHERE id = $1', [id]);
  }

  // ─── Stickers ─────────────────────────────────────────────────────────────
  async listStickers(): Promise<Sticker[]> {
    return this.q('SELECT * FROM stickers ORDER BY name ASC');
  }
  async getSticker(id: number): Promise<Sticker | undefined> {
    return this.q1('SELECT * FROM stickers WHERE id = $1', [id]);
  }
  async createSticker(data: Omit<Sticker, 'id'>): Promise<Sticker> {
    return this.q1(
      `INSERT INTO stickers (name, detail) VALUES ($1, $2) RETURNING *`,
      [data.name, data.detail]
    ) as Promise<Sticker>;
  }
  async updateSticker(id: number, data: Partial<Omit<Sticker, 'id'>>): Promise<Sticker> {
    return this.q1(
      `UPDATE stickers SET name = COALESCE($1, name), detail = COALESCE($2, detail),
       updated_at = NOW() WHERE id = $3 RETURNING *`,
      [data.name ?? null, data.detail ?? null, id]
    ) as Promise<Sticker>;
  }
  async deleteSticker(id: number): Promise<void> {
    await this.q('DELETE FROM stickers WHERE id = $1', [id]);
  }

  // ─── Static Pages ─────────────────────────────────────────────────────────
  async listStaticPages(): Promise<StaticPage[]> {
    return this.q('SELECT * FROM static_pages ORDER BY title ASC');
  }
  async getStaticPage(id: number): Promise<StaticPage | undefined> {
    return this.q1('SELECT * FROM static_pages WHERE id = $1', [id]);
  }
  async getStaticPageBySlug(slug: string): Promise<StaticPage | undefined> {
    return this.q1('SELECT * FROM static_pages WHERE slug = $1', [slug]);
  }
  async createStaticPage(data: Omit<StaticPage, 'id'>): Promise<StaticPage> {
    return this.q1(
      `INSERT INTO static_pages (slug, title, content, is_active) VALUES ($1, $2, $3, $4) RETURNING *`,
      [data.slug, data.title, data.content ?? null, data.isActive ?? true]
    ) as Promise<StaticPage>;
  }
  async updateStaticPage(id: number, data: Partial<Omit<StaticPage, 'id'>>): Promise<StaticPage> {
    return this.q1(
      `UPDATE static_pages SET slug = COALESCE($1, slug), title = COALESCE($2, title),
       content = COALESCE($3, content), is_active = COALESCE($4, is_active),
       updated_at = NOW() WHERE id = $5 RETURNING *`,
      [data.slug ?? null, data.title ?? null, data.content ?? null, data.isActive ?? null, id]
    ) as Promise<StaticPage>;
  }
  async deleteStaticPage(id: number): Promise<void> {
    await this.q('DELETE FROM static_pages WHERE id = $1', [id]);
  }

  // ─── FAQs ─────────────────────────────────────────────────────────────────
  async listFaqs(): Promise<Faq[]> {
    return this.q<Faq>('SELECT * FROM faqs ORDER BY display_order ASC, id ASC');
  }
  async getFaq(id: number): Promise<Faq | undefined> {
    return this.q1('SELECT * FROM faqs WHERE id = $1', [id]);
  }
  async createFaq(data: Omit<Faq, 'id' | 'createdAt' | 'updatedAt'>): Promise<Faq> {
    return this.q1(
      `INSERT INTO faqs (name, detail, ques, ans, display_order, is_active, created_at, updated_at) 
       VALUES ($1, $2, $1, $2, (SELECT COALESCE(MAX(display_order), 0) + 1 FROM faqs), $3, NOW(), NOW()) RETURNING *`,
      [data.ques || data.name, data.ans || data.detail, data.isActive ?? true]
    ) as Promise<Faq>;
  }
  async updateFaq(id: number, data: Partial<Omit<Faq, 'id'>>): Promise<Faq> {
    return this.q1(
      `UPDATE faqs SET 
        name = COALESCE($1, name), 
        ques = COALESCE($1, ques),
        detail = COALESCE($2, detail),
        ans = COALESCE($2, ans),
        is_active = COALESCE($3, is_active),
        updated_at = NOW() 
       WHERE id = $4 RETURNING *`,
      [data.ques || data.name || null, data.ans || data.detail || null, data.isActive ?? null, id]
    ) as Promise<Faq>;
  }
  async deleteFaq(id: number): Promise<void> {
    await this.q('DELETE FROM faqs WHERE id = $1', [id]);
    // Re-sequence after delete to keep it gapless
    await this.q(`
      WITH ranked AS (
        SELECT id, row_number() OVER (ORDER BY display_order, id) as new_order 
        FROM faqs
      )
      UPDATE faqs SET display_order = ranked.new_order FROM ranked WHERE faqs.id = ranked.id
    `);
  }

  // ─── PDF Settings ─────────────────────────────────────────────────────────
  async listPdfSettings(): Promise<PdfSetting[]> {
    return this.q('SELECT * FROM pdf_settings ORDER BY template_name ASC');
  }
  async getPdfSetting(id: number): Promise<PdfSetting | undefined> {
    return this.q1('SELECT * FROM pdf_settings WHERE id = $1', [id]);
  }
  async createPdfSetting(data: Omit<PdfSetting, 'id'>): Promise<PdfSetting> {
    if (data.isDefault) {
      await this.q('UPDATE pdf_settings SET is_default = FALSE');
    }
    return this.q1(
      `INSERT INTO pdf_settings (template_name, header_html, footer_html, margin, is_default)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [data.templateName, data.headerHtml ?? null, data.footerHtml ?? null, data.margin ?? null, data.isDefault ?? false]
    ) as Promise<PdfSetting>;
  }
  async updatePdfSetting(id: number, data: Partial<Omit<PdfSetting, 'id'>>): Promise<PdfSetting> {
    if (data.isDefault) {
      await this.q('UPDATE pdf_settings SET is_default = FALSE WHERE id != $1', [id]);
    }
    return this.q1(
      `UPDATE pdf_settings SET template_name = COALESCE($1, template_name),
       header_html = COALESCE($2, header_html), footer_html = COALESCE($3, footer_html),
       margin = COALESCE($4, margin), is_default = COALESCE($5, is_default),
       updated_at = NOW() WHERE id = $6 RETURNING *`,
      [data.templateName ?? null, data.headerHtml ?? null, data.footerHtml ?? null, data.margin ?? null, data.isDefault ?? null, id]
    ) as Promise<PdfSetting>;
  }
  async deletePdfSetting(id: number): Promise<void> {
    await this.q('DELETE FROM pdf_settings WHERE id = $1', [id]);
  }

  // ─── Medicines ────────────────────────────────────────────────────────────
  async listMedicines(): Promise<Medicine[]> {
    const rows = await this.q<any>('SELECT * FROM medicines ORDER BY id ASC');
    return rows.map(r => ({ ...r, id: r.id }));
  }
  async getMedicine(id: number): Promise<Medicine | undefined> {
    const r = await this.q1<any>('SELECT * FROM medicines WHERE id = $1', [id]);
    if (!r) return undefined;
    return { ...r, id: r.id };
  }
  async createMedicine(data: Omit<Medicine, 'id'>): Promise<Medicine> {
    console.log('[REPO] createMedicine called', data);
    const name = data.name || data.shortname;
    const disease = data.disease || data.description || data.detail;
    const potencyId = data.potencyId || null;
    const type = data.type || null;
    const category = data.category || null;
    const price = data.price || 0;
    const stockLevel = data.stockLevel || 0;

    try {
      const r = await this.q1<any>(
        `INSERT INTO medicines (name, disease, potency_id, type, category, price, stock_level, created_at, updated_at) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW()) RETURNING *`,
        [name, disease ?? null, potencyId, type, category, price, stockLevel]
      );
      console.log('[REPO] createMedicine Success', r.id);

      // Initial stock log
      if (stockLevel > 0) {
        await this.createStockLog({
          medicineId: r.id,
          changeType: 'Adjust',
          quantity: stockLevel,
          previousStock: 0,
          newStock: stockLevel,
          reason: 'Initial stock on creation'
        });
      }

      return { ...r, id: r?.id };
    } catch (err) {
      console.error('[REPO] createMedicine Error', err);
      throw err;
    }
  }
  async updateMedicine(id: number, data: Partial<Omit<Medicine, 'id'>>): Promise<Medicine> {
    console.log('[REPO] updateMedicine called', { id, data });
    const name = data.name || data.shortname;
    const disease = data.disease !== undefined ? data.disease : undefined;
    const potencyId = data.potencyId !== undefined ? data.potencyId : undefined;
    const type = data.type !== undefined ? data.type : undefined;
    const category = data.category !== undefined ? data.category : undefined;
    const price = data.price !== undefined ? data.price : undefined;
    const stockLevel = data.stockLevel !== undefined ? data.stockLevel : undefined;

    // Fetch current for logging
    const current = await this.getMedicine(id);
    const oldStock = current?.stockLevel || 0;

    try {
      const r = await this.q1<any>(
        `UPDATE medicines SET 
          name = COALESCE($1, name), 
          disease = CASE WHEN $2::text IS NOT NULL OR $9::boolean THEN $2 ELSE disease END,
          potency_id = CASE WHEN $3::integer IS NOT NULL OR $10::boolean THEN $3 ELSE potency_id END,
          type = CASE WHEN $4::text IS NOT NULL OR $11::boolean THEN $4 ELSE type END,
          category = CASE WHEN $5::text IS NOT NULL OR $12::boolean THEN $5 ELSE category END,
          price = CASE WHEN $6::real IS NOT NULL OR $13::boolean THEN $6 ELSE price END,
          stock_level = CASE WHEN $7::integer IS NOT NULL OR $14::boolean THEN $7 ELSE stock_level END,
          updated_at = NOW() 
         WHERE id = $8 RETURNING *`,
        [
          name ?? null, 
          disease ?? null, 
          potencyId ?? null, 
          type ?? null, 
          category ?? null, 
          price ?? null, 
          stockLevel ?? null, 
          id,
          disease === null,
          potencyId === null,
          type === null,
          category === null,
          price === null,
          stockLevel === null
        ]
      );
      console.log('[REPO] updateMedicine Success', id);

      // Stock change log
      if (stockLevel !== undefined && stockLevel !== null && stockLevel !== oldStock) {
        await this.createStockLog({
          medicineId: id,
          changeType: 'Adjust',
          quantity: stockLevel - oldStock,
          previousStock: oldStock,
          newStock: stockLevel,
          reason: 'Manual adjustment via catalog'
        });
      }

      return { ...r, id: r?.id };
    } catch (err) {
      console.error('[REPO] updateMedicine Error', err);
      throw err;
    }
  }
  async deleteMedicine(id: number): Promise<void> {
    await this.q('DELETE FROM medicines WHERE id = $1', [id]);
  }

  // ─── Potencies ────────────────────────────────────────────────────────────
  async listPotencies(): Promise<Potency[]> {
    return this.q('SELECT * FROM potencies ORDER BY name ASC');
  }
  async getPotency(id: number): Promise<Potency | undefined> {
    return this.q1('SELECT * FROM potencies WHERE id = $1', [id]);
  }
  async createPotency(data: Omit<Potency, 'id' | 'createdAt' | 'updatedAt'>): Promise<Potency> {
    return this.q1(
      `INSERT INTO potencies (name, detail, created_at, updated_at) VALUES ($1, $2, NOW(), NOW()) RETURNING *`,
      [data.name, data.detail ?? null]
    ) as Promise<Potency>;
  }
  async updatePotency(id: number, data: Partial<Omit<Potency, 'id'>>): Promise<Potency> {
    return this.q1(
      `UPDATE potencies SET name = COALESCE($1, name), detail = COALESCE($2, detail), updated_at = NOW() WHERE id = $3 RETURNING *`,
      [data.name ?? null, data.detail ?? null, id]
    ) as Promise<Potency>;
  }
  async deletePotency(id: number): Promise<void> {
    await this.q('DELETE FROM potencies WHERE id = $1', [id]);
  }

  // ─── Frequencies ──────────────────────────────────────────────────────────
  async listFrequencies(): Promise<Frequency[]> {
    return this.q('SELECT * FROM case_frequency ORDER BY id ASC');
  }
  async getFrequency(id: number): Promise<Frequency | undefined> {
    return this.q1('SELECT * FROM case_frequency WHERE id = $1', [id]);
  }
  async createFrequency(data: Omit<Frequency, 'id' | 'createdAt' | 'updatedAt'>): Promise<Frequency> {
    return this.q1(
      `INSERT INTO case_frequency (title, frequency, duration, days, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING *`,
      [data.title ?? null, data.frequency ?? null, data.duration ?? null, data.days ?? null]
    ) as Promise<Frequency>;
  }
  async updateFrequency(id: number, data: Partial<Omit<Frequency, 'id'>>): Promise<Frequency> {
    return this.q1(
      `UPDATE case_frequency SET 
        title = COALESCE($1, title), 
        frequency = COALESCE($2, frequency),
        duration = COALESCE($3, duration),
        days = COALESCE($4, days),
        updated_at = NOW() 
       WHERE id = $5 RETURNING *`,
      [data.title ?? null, data.frequency ?? null, data.duration ?? null, data.days ?? null, id]
    ) as Promise<Frequency>;
  }
  async deleteFrequency(id: number): Promise<void> {
    await this.q('DELETE FROM case_frequency WHERE id = $1', [id]);
  }



  // ─── Message Templates ────────────────────────────────────────────────────
  async listMessageTemplates(): Promise<MessageTemplate[]> {
    return this.q('SELECT * FROM message_templates ORDER BY id ASC');
  }
  async getMessageTemplate(id: number): Promise<MessageTemplate | undefined> {
    return this.q1('SELECT * FROM message_templates WHERE id = $1', [id]);
  }
  async createMessageTemplate(data: Omit<MessageTemplate, 'id'>): Promise<MessageTemplate> {
    return this.q1(
      `INSERT INTO message_templates (name, content, type, is_active) VALUES ($1, $2, $3, $4) RETURNING *`,
      [data.name, data.content, data.type ?? 'SMS', data.isActive ?? true]
    ) as Promise<MessageTemplate>;
  }
  async updateMessageTemplate(id: number, data: Partial<Omit<MessageTemplate, 'id'>>): Promise<MessageTemplate> {
    return this.q1(
      `UPDATE message_templates SET name = COALESCE($1, name), content = COALESCE($2, content),
       type = COALESCE($3, type), is_active = COALESCE($4, is_active), updated_at = NOW()
       WHERE id = $5 RETURNING *`,
      [data.name ?? null, data.content ?? null, data.type ?? null, data.isActive ?? null, id]
    ) as Promise<MessageTemplate>;
  }
  async deleteMessageTemplate(id: number): Promise<void> {
    await this.q('DELETE FROM message_templates WHERE id = $1', [id]);
  }

  // ─── Stock Logs ───────────────────────────────────────────────────────────
  async listStockLogs(medicineId?: number): Promise<StockLog[]> {
    try {
      if (medicineId) {
        return await this.q('SELECT * FROM stock_logs WHERE medicine_id = $1 ORDER BY created_at DESC', [medicineId]);
      }
      return await this.q('SELECT * FROM stock_logs ORDER BY created_at DESC LIMIT 100');
    } catch (err) {
      this.logger.warn({ err }, 'stock_logs table not found or query failed, returning empty list');
      return [];
    }
  }
  async createStockLog(data: Omit<StockLog, 'id' | 'createdAt'>): Promise<StockLog> {
    return this.q1(
      `INSERT INTO stock_logs (medicine_id, change_type, quantity, previous_stock, new_stock, reason)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [data.medicineId, data.changeType, data.quantity, data.previousStock ?? null, data.newStock ?? null, data.reason ?? null]
    ) as Promise<StockLog>;
  }

  // ─── Package Plans ────────────────────────────────────────────────────────
  async listPackagePlans(): Promise<PackagePlan[]> {
    return this.q('SELECT * FROM package_plans ORDER BY id ASC');
  }
  async getPackagePlan(id: number): Promise<PackagePlan | undefined> {
    return this.q1('SELECT * FROM package_plans WHERE id = $1', [id]);
  }
  async createPackagePlan(data: Omit<PackagePlan, 'id'>): Promise<PackagePlan> {
    return this.q1(
      `INSERT INTO package_plans (name, description, price, duration_days, color_code, is_active)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [data.name, data.description ?? null, data.price, data.durationDays, data.colorCode ?? '#2563EB', data.isActive ?? true]
    ) as Promise<PackagePlan>;
  }
  async updatePackagePlan(id: number, data: Partial<Omit<PackagePlan, 'id'>>): Promise<PackagePlan> {
    return this.q1(
      `UPDATE package_plans SET name = COALESCE($1, name), description = COALESCE($2, description),
       price = COALESCE($3, price), duration_days = COALESCE($4, duration_days),
       color_code = COALESCE($5, color_code), is_active = COALESCE($6, is_active), updated_at = NOW()
       WHERE id = $7 RETURNING *`,
      [data.name ?? null, data.description ?? null, data.price ?? null, data.durationDays ?? null, data.colorCode ?? null, data.isActive ?? null, id]
    ) as Promise<PackagePlan>;
  }
  async deletePackagePlan(id: number): Promise<void> {
    await this.q('DELETE FROM package_plans WHERE id = $1', [id]);
  }

  // ─── Couriers ─────────────────────────────────────────────────────────────
  async listCouriers(): Promise<Courier[]> {
    return this.q('SELECT * FROM courier_masters ORDER BY id ASC');
  }
  async getCourier(id: number): Promise<Courier | undefined> {
    return this.q1('SELECT * FROM courier_masters WHERE id = $1', [id]);
  }
  async createCourier(data: Omit<Courier, 'id'>): Promise<Courier> {
    return this.q1(
      `INSERT INTO courier_masters (name, contact_person, phone, tracking_url, is_active)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [data.name, data.contactPerson ?? null, data.phone ?? null, data.trackingUrl ?? null, data.isActive ?? true]
    ) as Promise<Courier>;
  }
  async updateCourier(id: number, data: Partial<Omit<Courier, 'id'>>): Promise<Courier> {
    return this.q1(
      `UPDATE courier_masters SET name = COALESCE($1, name), contact_person = COALESCE($2, contact_person),
       phone = COALESCE($3, phone), tracking_url = COALESCE($4, tracking_url),
       is_active = COALESCE($5, is_active), updated_at = NOW() WHERE id = $6 RETURNING *`,
      [data.name ?? null, data.contactPerson ?? null, data.phone ?? null, data.trackingUrl ?? null, data.isActive ?? null, id]
    ) as Promise<Courier>;
  }
  async deleteCourier(id: number): Promise<void> {
    await this.q('DELETE FROM courier_masters WHERE id = $1', [id]);
  }

  // ─── Practitioners (Doctors from users table) ──────────────────────────────
  async listPractitioners(): Promise<User[]> {
    return this.q<User>("SELECT * FROM users WHERE type = 'Doctor' AND is_active = true ORDER BY name ASC");
  }
}
