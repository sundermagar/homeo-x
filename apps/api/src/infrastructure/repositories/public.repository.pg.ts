import { eq, and, or, gt, desc, sql, isNull, ne } from 'drizzle-orm';
import type { DbClient } from '@mmc/database';
import { 
  otps, 
  staticPages, 
  faqs, 
  appointmentsLegacy as appointments,
  caseDatasLegacy as cd,
  medicalcasesLegacy as mc,
  soapNotesLegacy as sn,
  casePotenciesLegacy as cp,
  caseFrequencyLegacy as cf,
  patientPreferences
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
        patientInfo: {
          name: 'Aryan Sharma (Test)',
          regid: 9999,
          firstName: 'Aryan',
          lastName: 'Sharma',
          gender: 'Male',
          dob: '1997-01-01',
           bloodGroup: 'O+',
           height: '170',
           weight: '72',
           allergies: '',
           chronicConditions: '',
           currentMedications: '',
          email: 'aryan.test@example.com',
          phone: '9999999999',
          address: '123, Test Colony',
          city: 'Chandigarh',
          state: 'Punjab',
          pin: '160001',
          emergencyName: 'Raj Sharma',
          emergencyPhone: '9876543210',
          emergencyRelation: 'Father',
        },
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

    // 1. Find the patient by mobile number (check both phone and mobile1 columns)
    const patients = await this.db.execute(sql`
      SELECT * FROM case_datas 
      WHERE mobile1 = ${phone} OR phone = ${phone}
      LIMIT 1
    `);
    const patient = patients[0];

    if (!patient) return null;

    const regid = patient.regid;

    // 2. Fetch medical cases history (visits) via raw SQL
    let history: any[] = [];
    try {
      history = await this.db.execute(sql`
        SELECT mc.id, mc.condition, mc.status, mc.created_at,
               sn.advice, sn.plan
        FROM medicalcases mc
        LEFT JOIN soap_notes sn ON sn.visit_id = mc.id
        WHERE mc.regid = ${regid}
        ORDER BY mc.created_at DESC
        LIMIT 10
      `);
    } catch (e) { console.error('[DB] History query failed:', e); }

    // 3. Fetch prescriptions (potencies) via raw SQL
    let activePrescriptions: any[] = [];
    try {
      activePrescriptions = await this.db.execute(sql`
        SELECT * FROM case_potencies
        WHERE regid = ${regid}
        ORDER BY created_at DESC
        LIMIT 20
      `);
    } catch (e) { console.error('[DB] Prescriptions query failed:', e); }

    // 4. Fetch frequency reference data
    let frequencies: any[] = [];
    try {
      frequencies = await this.db.execute(sql`SELECT * FROM case_frequency`);
    } catch (e) { console.error('[DB] Frequencies query failed:', e); }

    // Parse extra profile fields from notes JSON
    let extraFields: Record<string, string> = {};
    try {
      if (patient.notes) extraFields = JSON.parse(patient.notes);
    } catch { /* notes is plain text, ignore */ }

    return {
      patientInfo: {
        name: `${patient.first_name || ''} ${patient.surname || ''}`.trim(),
        regid: patient.regid,
        firstName: patient.first_name || '',
        lastName: patient.surname || '',
        middleName: patient.middle_name || '',
        gender: patient.gender || '',
        dob: patient.dob || patient.date_of_birth || '',
        bloodGroup: patient.blood_group || '',
        height: extraFields.height || '',
        weight: extraFields.weight || '',
        allergies: extraFields.allergies || '',
        chronicConditions: extraFields.chronicConditions || '',
        currentMedications: extraFields.currentMedications || '',
        email: patient.email || '',
        phone: patient.mobile1 || patient.phone || '',
        address: patient.address || '',
        city: patient.city || '',
        state: patient.state || '',
        pin: patient.pin || '',
        occupation: patient.occupation || '',
        emergencyName: extraFields.emergencyName || '',
        emergencyPhone: extraFields.emergencyPhone || '',
        emergencyRelation: extraFields.emergencyRelation || '',
      },
      history: history.map((h: any) => ({
        visitId: h.id,
        date: h.created_at,
        condition: h.condition,
        notes: h.advice || h.plan || ''
      })),
      prescriptions: activePrescriptions.map((p: any) => ({
        id: p.id,
        date: p.dateval || p.created_at,
        remedy: p.rxremedy,
        potency: p.rxpotency,
        days: p.rxdays,
        frequency: p.rxfrequency,
        instructions: p.rxprescription
      })),
      frequencies: frequencies.map((f: any) => ({
        id: f.id,
        title: f.title,
        description: f.frequency
      }))
    };
  }

  async getPatientAppointments(phone: string): Promise<any[]> {
    try {
      const result = await this.db.select()
        .from(appointments)
        .where(and(
          eq(appointments.phone, phone),
          isNull(appointments.deletedAt)
        ))
        .orderBy(desc(appointments.bookingDate))
        .limit(20);

      return result.map(a => ({
        id: a.id,
        bookingDate: a.bookingDate,
        bookingTime: a.bookingTime,
        status: a.status,
        visitType: a.visitType,
        notes: a.notes,
        patientName: a.patientName,
        tokenNo: a.tokenNo,
      }));
    } catch (err) {
      console.error('[DB] Failed to fetch patient appointments:', err);
      return [];
    }
  }

  async bookAppointment(input: {
    phone: string;
    patientName: string;
    bookingDate: string;
    bookingTime: string;
    doctorId: number;
    visitType?: string;
    notes: string;
  }): Promise<any> {
    try {
      // Resolve max ID manually since legacy table might lack an auto-increment sequence
      const maxResult = await this.db.execute(sql`SELECT COALESCE(MAX(id), 0) as max_id FROM appointments`);
      const nextId = Number(maxResult[0]?.max_id || 0) + 1;

      const [result] = await this.db.insert(appointments).values({
        id: nextId,
        phone: input.phone,
        patientName: input.patientName,
        bookingDate: input.bookingDate,
        bookingTime: input.bookingTime,
        doctorId: input.doctorId,
        notes: input.notes,
        status: 'Pending',
        visitType: input.visitType || 'New',
      }).returning();

      return result;
    } catch (err: any) {
      console.error('[DB] Failed to book appointment:', err);
      throw new Error(`Failed to book appointment. Error: ${err.message || String(err)}`);
    }
  }

  async cancelAppointment(id: number): Promise<any> {
    try {
      const [result] = await this.db.update(appointments)
        .set({ status: 'Cancelled', updatedAt: new Date() })
        .where(eq(appointments.id, id))
        .returning();
      return result;
    } catch (err: any) {
      console.error('[DB] Failed to cancel appointment:', err);
      throw new Error(`Failed to cancel appointment: ${err.message}`);
    }
  }

  async getBookedSlots(date: string): Promise<string[]> {
    try {
      const result = await this.db.select({ bookingTime: appointments.bookingTime })
        .from(appointments)
        .where(and(
          eq(appointments.bookingDate, date),
          ne(appointments.status, 'Cancelled')
        ));
      return result.map((r: any) => r.bookingTime).filter(Boolean);
    } catch (err: any) {
      console.error('[DB] Failed to get booked slots:', err);
      return [];
    }
  }

  async updatePatientProfile(phone: string, updates: {
    firstName?: string;
    lastName?: string;
    gender?: string;
    dob?: string;
    bloodGroup?: string;
    email?: string;
    address?: string;
    city?: string;
    state?: string;
    pin?: string;
    height?: string;
    weight?: string;
    allergies?: string;
    emergencyName?: string;
    emergencyPhone?: string;
    emergencyRelation?: string;
  }): Promise<any> {
    try {
      const updateFields: Record<string, any> = {};
      if (updates.firstName !== undefined) updateFields.firstName = updates.firstName;
      if (updates.lastName !== undefined) updateFields.surname = updates.lastName;
      if (updates.gender !== undefined) updateFields.gender = updates.gender;
      if (updates.dob !== undefined) updateFields.dob = updates.dob;
      if (updates.bloodGroup !== undefined) updateFields.bloodGroup = updates.bloodGroup;
      if (updates.email !== undefined) updateFields.email = updates.email;
      if (updates.address !== undefined) updateFields.address = updates.address;
      if (updates.city !== undefined) updateFields.city = updates.city;
      if (updates.state !== undefined) updateFields.state = updates.state;
      if (updates.pin !== undefined) updateFields.pin = updates.pin;

      // Store extra fields (height, weight, allergies, emergency contact) in notes as JSON
      // First read existing notes to preserve data
      let existingNotes: Record<string, string> = {};
      try {
        const [current] = await this.db.select({ notes: cd.notes })
          .from(cd).where(eq(cd.mobile1, phone)).limit(1);
        if (current?.notes) existingNotes = JSON.parse(current.notes);
      } catch { /* ignore parse errors */ }

      const notesData = { ...existingNotes };
      if (updates.height !== undefined) notesData.height = updates.height;
      if (updates.weight !== undefined) notesData.weight = updates.weight;
      if (updates.allergies !== undefined) notesData.allergies = updates.allergies;
      if (updates.chronicConditions !== undefined) notesData.chronicConditions = updates.chronicConditions;
      if (updates.currentMedications !== undefined) notesData.currentMedications = updates.currentMedications;
      if (updates.emergencyName !== undefined) notesData.emergencyName = updates.emergencyName;
      if (updates.emergencyPhone !== undefined) notesData.emergencyPhone = updates.emergencyPhone;
      if (updates.emergencyRelation !== undefined) notesData.emergencyRelation = updates.emergencyRelation;

      updateFields.notes = JSON.stringify(notesData);
      updateFields.updatedAt = new Date();

      await this.db.update(cd)
        .set(updateFields)
        .where(eq(cd.mobile1, phone));

      return { success: true };
    } catch (err) {
      console.error('[DB] Failed to update patient profile:', err);
      throw new Error('Failed to update profile. Please try again.');
    }
  }

  async getNotificationPreferences(phone: string): Promise<any> {
    try {
      const [record] = await this.db.select()
        .from(patientPreferences)
        .where(eq(patientPreferences.phone, phone))
        .limit(1);
      
      if (record) {
        return record.preferences;
      }
    } catch (err) {
      console.error('[DB] patient_preferences table query failed (likely missing):', err);
    }
    
    // Return default mapping if not found
    return {
      appointments: { push: true, sms: true, email: true, whatsapp: true },
      labs: { push: true, sms: true, email: true, whatsapp: true },
      prescriptions: { push: true, sms: true, email: true, whatsapp: true },
      followUp: { push: true, sms: true, email: true, whatsapp: true },
      system: { push: true, sms: true, email: true, whatsapp: true },
    };
  }

  async upsertNotificationPreferences(phone: string, prefs: any): Promise<void> {
    try {
      const [existing] = await this.db.select()
        .from(patientPreferences)
        .where(eq(patientPreferences.phone, phone))
        .limit(1);

      if (existing) {
        await this.db.update(patientPreferences)
          .set({ preferences: prefs, updatedAt: new Date() })
          .where(eq(patientPreferences.id, existing.id));
      } else {
        await this.db.insert(patientPreferences)
          .values({ phone, preferences: prefs });
      }
    } catch (err) {
      console.error('[DB] patient_preferences upsert failed (likely missing table):', err);
    }
  }
}
