import type { NodePgDatabase } from 'drizzle-orm/node-postgres';

// ─── Settings sub-entity types ────────────────────────────────────────────────

export interface Department {
  id: number;
  name: string;
  description?: string | null;
  isActive?: boolean | null;
  createdAt?: Date | null;
  updatedAt?: Date | null;
}

export interface Dispensary {
  id: number;
  name: string;
  email?: string | null;
  password?: string | null;
  gender?: string | null;
  mobile?: string | null;
  mobile2?: string | null;
  location?: string | null;
  city?: string | null;
  address?: string | null;
  about?: string | null;
  designation?: string | null;
  dept?: string | null;
  dateBirth?: string | Date | null;
  contactNumber?: string | null;
  isActive?: boolean | null;
  createdAt?: Date | null;
  updatedAt?: Date | null;
}


export interface ReferralSource {
  id: number;
  name: string;
  type?: string | null;
  isActive?: boolean | null;
}

export interface Sticker {
  id: number;
  title: string;
  content: string;
}

export interface StaticPage {
  id: number;
  slug: string;
  title: string;
  content?: string | null;
  isActive?: boolean | null;
}

export interface Faq {
  id: number;
  ques: string;
  ans: string;
  createdAt?: Date | null;
  updatedAt?: Date | null;
}

export interface PdfSetting {
  id: number;
  templateName: string;
  headerHtml?: string | null;
  footerHtml?: string | null;
  margin?: string | null;
  isDefault?: boolean | null;
}

export interface Medicine {
  id: number;
  name: string;
  disease?: string | null;
  createdAt?: Date | null;
  updatedAt?: Date | null;
}

export interface Potency {
  id: number;
  name: string;
  detail?: string | null;
  createdAt?: Date | null;
  updatedAt?: Date | null;
}

export interface Frequency {
  id: number;
  title?: string | null;
  frequency?: string | null;
  duration?: string | null;
  days?: number | null;
  createdAt?: Date | null;
  updatedAt?: Date | null;
}

export interface ExpenseHead {
  id: number;
  name: string;
  description?: string | null;
  isActive?: boolean | null;
}

export interface MessageTemplate {
  id: number;
  name: string;
  content: string;
  type?: string | null;
  isActive?: boolean | null;
}

export interface StockLog {
  id: number;
  medicineId: number;
  changeType: string;
  quantity: number;
  previousStock?: number | null;
  newStock?: number | null;
  reason?: string | null;
  createdAt?: Date | null;
}

export interface PackagePlan {
  id: number;
  name: string;
  description?: string | null;
  price: number;
  durationDays: number;
  colorCode?: string | null;
  isActive?: boolean | null;
}

export interface Courier {
  id: number;
  name: string;
  contactPerson?: string | null;
  phone?: string | null;
  trackingUrl?: string | null;
  isActive?: boolean | null;
}

// ─── Port Interface ───────────────────────────────────────────────────────────

export interface ISettingsRepository {
  // Departments
  listDepartments(): Promise<Department[]>;
  getDepartment(id: number): Promise<Department | undefined>;
  createDepartment(data: Omit<Department, 'id' | 'createdAt' | 'updatedAt'>): Promise<Department>;
  updateDepartment(id: number, data: Partial<Omit<Department, 'id'>>): Promise<Department>;
  deleteDepartment(id: number): Promise<void>;

  // Dispensaries
  listDispensaries(): Promise<Dispensary[]>;
  getDispensary(id: number): Promise<Dispensary | undefined>;
  createDispensary(data: Omit<Dispensary, 'id'>): Promise<Dispensary>;
  updateDispensary(id: number, data: Partial<Omit<Dispensary, 'id'>>): Promise<Dispensary>;
  deleteDispensary(id: number): Promise<void>;

  // Referral Sources
  listReferralSources(): Promise<ReferralSource[]>;
  getReferralSource(id: number): Promise<ReferralSource | undefined>;
  createReferralSource(data: Omit<ReferralSource, 'id'>): Promise<ReferralSource>;
  updateReferralSource(id: number, data: Partial<Omit<ReferralSource, 'id'>>): Promise<ReferralSource>;
  deleteReferralSource(id: number): Promise<void>;

  // Stickers
  listStickers(): Promise<Sticker[]>;
  getSticker(id: number): Promise<Sticker | undefined>;
  createSticker(data: Omit<Sticker, 'id'>): Promise<Sticker>;
  updateSticker(id: number, data: Partial<Omit<Sticker, 'id'>>): Promise<Sticker>;
  deleteSticker(id: number): Promise<void>;

  // Static Pages (CMS)
  listStaticPages(): Promise<StaticPage[]>;
  getStaticPage(id: number): Promise<StaticPage | undefined>;
  getStaticPageBySlug(slug: string): Promise<StaticPage | undefined>;
  createStaticPage(data: Omit<StaticPage, 'id'>): Promise<StaticPage>;
  updateStaticPage(id: number, data: Partial<Omit<StaticPage, 'id'>>): Promise<StaticPage>;
  deleteStaticPage(id: number): Promise<void>;

  // FAQs
  listFaqs(): Promise<Faq[]>;
  getFaq(id: number): Promise<Faq | undefined>;
  createFaq(data: Omit<Faq, 'id'>): Promise<Faq>;
  updateFaq(id: number, data: Partial<Omit<Faq, 'id'>>): Promise<Faq>;
  deleteFaq(id: number): Promise<void>;

  // PDF Settings
  listPdfSettings(): Promise<PdfSetting[]>;
  getPdfSetting(id: number): Promise<PdfSetting | undefined>;
  createPdfSetting(data: Omit<PdfSetting, 'id'>): Promise<PdfSetting>;
  updatePdfSetting(id: number, data: Partial<Omit<PdfSetting, 'id'>>): Promise<PdfSetting>;
  deletePdfSetting(id: number): Promise<void>;

  // Medicines
  listMedicines(): Promise<Medicine[]>;
  getMedicine(id: number): Promise<Medicine | undefined>;
  createMedicine(data: Omit<Medicine, 'id'>): Promise<Medicine>;
  updateMedicine(id: number, data: Partial<Omit<Medicine, 'id'>>): Promise<Medicine>;
  deleteMedicine(id: number): Promise<void>;

  // Potencies
  listPotencies(): Promise<Potency[]>;
  getPotency(id: number): Promise<Potency | undefined>;
  createPotency(data: Omit<Potency, 'id' | 'createdAt' | 'updatedAt'>): Promise<Potency>;
  updatePotency(id: number, data: Partial<Omit<Potency, 'id'>>): Promise<Potency>;
  deletePotency(id: number): Promise<void>;

  // Frequencies
  listFrequencies(): Promise<Frequency[]>;
  getFrequency(id: number): Promise<Frequency | undefined>;
  createFrequency(data: Omit<Frequency, 'id' | 'createdAt' | 'updatedAt'>): Promise<Frequency>;
  updateFrequency(id: number, data: Partial<Omit<Frequency, 'id'>>): Promise<Frequency>;
  deleteFrequency(id: number): Promise<void>;

  // Expense Heads
  listExpenseHeads(): Promise<ExpenseHead[]>;
  getExpenseHead(id: number): Promise<ExpenseHead | undefined>;
  createExpenseHead(data: Omit<ExpenseHead, 'id'>): Promise<ExpenseHead>;
  updateExpenseHead(id: number, data: Partial<Omit<ExpenseHead, 'id'>>): Promise<ExpenseHead>;
  deleteExpenseHead(id: number): Promise<void>;

  // Message Templates
  listMessageTemplates(): Promise<MessageTemplate[]>;
  getMessageTemplate(id: number): Promise<MessageTemplate | undefined>;
  createMessageTemplate(data: Omit<MessageTemplate, 'id'>): Promise<MessageTemplate>;
  updateMessageTemplate(id: number, data: Partial<Omit<MessageTemplate, 'id'>>): Promise<MessageTemplate>;
  deleteMessageTemplate(id: number): Promise<void>;

  // Stock Logs
  listStockLogs(medicineId?: number): Promise<StockLog[]>;
  createStockLog(data: Omit<StockLog, 'id' | 'createdAt'>): Promise<StockLog>;

  // Package Plans
  listPackagePlans(): Promise<PackagePlan[]>;
  getPackagePlan(id: number): Promise<PackagePlan | undefined>;
  createPackagePlan(data: Omit<PackagePlan, 'id'>): Promise<PackagePlan>;
  updatePackagePlan(id: number, data: Partial<Omit<PackagePlan, 'id'>>): Promise<PackagePlan>;
  deletePackagePlan(id: number): Promise<void>;

  // Couriers
  listCouriers(): Promise<Courier[]>;
  getCourier(id: number): Promise<Courier | undefined>;
  createCourier(data: Omit<Courier, 'id'>): Promise<Courier>;
  updateCourier(id: number, data: Partial<Omit<Courier, 'id'>>): Promise<Courier>;
  deleteCourier(id: number): Promise<void>;
}

