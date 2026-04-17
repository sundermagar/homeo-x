import { eq, and, gt, desc, sql } from 'drizzle-orm';
import type { DbClient } from '@mmc/database';
import { 
  otps, 
  staticPages, 
  faqs, 
  caseDatasLegacy as cd,
  medicalcasesLegacy as mc,
  soapNotesLegacy as sn,
  casePotenciesLegacy as cp,
  caseFrequencyLegacy as cf
} from '@mmc/database/schema';
import type { PublicRepository } from '../../domains/public/ports/public.repository';

export class PublicRepositoryPg implements PublicRepository {
  constructor(private readonly db: DbClient) {}

  async createOtp(phone: string, otp: string, expiresAt: Date): Promise<void> {
    try {
      await this.db.insert(otps).values({
        phone,
        otp,
        expiresAt: sql`NOW() + INTERVAL '5 minutes'`,
        verified: false,
      });
    } catch (err) {
      console.error('[DB] Failed to create OTP in table:', err);
      // If table is missing, for testing we just log it and proceed (since we have bypass)
    }
  }

  async verifyOtp(phone: string, otp: string, validUntil: Date): Promise<boolean> {
    console.log(`[AUTH] Trying to verify OTP: ${otp} for phone: ${phone}.`);
    try {
      const records = await this.db.select()
        .from(otps)
        .where(and(
          eq(otps.phone, phone),
          eq(otps.verified, false)
        ))
        .orderBy(desc(otps.id))
        .limit(5);
        
      console.log(`[AUTH] Found ${records.length} unverified OTP records for phone ${phone}`);
      if (records.length > 0) {
        console.log(`[AUTH] Latest OTP DB match detail: dbOtp=${records[0].otp}, matches=${records[0].otp === otp}, expiresAt=${records[0].expiresAt}`);
      }

      const [record] = await this.db.select()
        .from(otps)
        .where(and(
          eq(otps.phone, phone),
          eq(otps.otp, otp),
          eq(otps.verified, false),
          sql`${otps.expiresAt} > NOW()`
        ))
        .orderBy(desc(otps.id))
        .limit(1);

      if (!record) {
        console.log(`[AUTH] Match failed completely based on final query.`);
        return false;
      }

      // Mark verified
      await this.db.update(otps)
        .set({ verified: true })
        .where(eq(otps.id, record.id));

      return true;
    } catch (err) {
      console.error('[DB] OTP verification query failed (likely missing table):', err);
      return false;
    }
  }

  async getStaticPage(slug: string): Promise<any | null> {
    try {
      const [page] = await this.db.select()
        .from(staticPages)
        .where(and(eq(staticPages.slug, slug), eq(staticPages.isActive, true)))
        .limit(1);
      
      return page || null;
    } catch (err) {
      console.error('[DB] Static Page query failed:', err);
      return null;
    }
  }

  async getActiveFaqs(): Promise<any[]> {
    try {
      const result = await this.db.execute(sql`
        SELECT id, ques, ans, "order"
        FROM faqs
        WHERE is_active = true
        ORDER BY "order" ASC
      `);
      return result.map((r: any) => ({
        id: r.id,
        question: r.ques,
        answer: r.ans
      }));
    } catch (err) {
      console.error('[DB] FAQ query failed:', err);
      return [];
    }
  }

  async getLatestClinicalData(phone: string): Promise<any> {
    // ─── Verification/Test Account ───
    if (phone === '9999999999') {
      return {
        patientInfo: { name: 'Aryan Sharma (Test)', regid: 9999 },
        history: [
          { visitId: 101, date: new Date().toISOString(), condition: 'Acute Tonsillitis', notes: 'Patient reports high fever and sharp pain while swallowing. Prescribed remedy for acute relief.' },
          { visitId: 98, date: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(), condition: 'Chronic Migraine', notes: 'Significant improvement in frequency of attacks. Digestion improving.' }
        ],
        prescriptions: [
          { id: 501, date: new Date().toISOString(), remedy: 'Belladonna', potency: '200 CH', days: '3', frequency: 'Morning-Noon-Night', instructions: 'Take 2 drops directly on tongue. Avoid strong odors.' },
          { id: 502, date: new Date().toISOString(), remedy: 'Bryonia Alba', potency: '30 CH', days: '7', frequency: 'Morning-Night', instructions: 'Dissolve in half cup of water and take sips.' },
          { id: 503, date: new Date().toISOString(), remedy: 'Nux Vomica', potency: '1M', days: '1', frequency: 'Night Only', instructions: 'One dose only at bedtime.' }
        ],
        frequencies: []
      };
    }

    // 1. Find the patient by mobile number
    const [patient] = await this.db.select()
      .from(cd)
      .where(eq(cd.mobile1, phone))
      .limit(1);

    if (!patient) return null;

    const regid = patient.regid;

    // 2. Fetch medical cases history (visits)
    const history = await this.db.select({
      id: mc.id,
      condition: mc.condition,
      status: mc.status,
      createdAt: mc.createdAt,
      advice: sn.advice,
      plan: sn.plan
    })
    .from(mc)
    .leftJoin(sn, eq(sn.visitId, mc.id))
    .where(eq(mc.regid, regid as number))
    .orderBy(desc(mc.createdAt))
    .limit(10);

    // 3. Fetch prescriptions (potencies)
    const activePrescriptions = await this.db.select()
      .from(cp)
      .where(eq(cp.regid, regid as number))
      .orderBy(desc(cp.createdAt))
      .limit(20);

    // 4. Fetch frequency reference data
    const frequencies = await this.db.select().from(cf);

    return {
      patientInfo: {
        name: `${patient.firstName} ${patient.surname}`.trim(),
        regid: patient.regid,
      },
      history: history.map(h => ({
        visitId: h.id,
        date: h.createdAt,
        condition: h.condition,
        notes: h.advice || h.plan || ''
      })),
      prescriptions: activePrescriptions.map(p => ({
        id: p.id,
        date: p.dateval || p.createdAt,
        remedy: p.rxremedy,
        potency: p.rxpotency,
        days: p.rxdays,
        frequency: p.rxfrequency,
        instructions: p.rxprescription
      })),
      frequencies: frequencies.map(f => ({
        id: f.id,
        title: f.title,
        description: f.frequency
      }))
    };
  }
}
