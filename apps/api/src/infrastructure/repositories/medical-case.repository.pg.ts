import { eq, and, sql, desc, isNull } from 'drizzle-orm';
import type { DbClient } from '@mmc/database';
import * as schema from '@mmc/database';
import type { 
  MedicalCaseRepository, 
  MedicalCase, 
  Vitals, 
  SoapNotes, 
  HomeoDetails,
  CaseNote,
  CaseExamination,
  CaseImage,
  Investigation,
  Prescription,
  FullCaseData,
  VaccineMaster,
  CaseReminder
} from '../../domains/medical-case/ports/medical-case.repository';

export class MedicalCaseRepositoryPg implements MedicalCaseRepository {
  constructor(private readonly db: DbClient) {}

  async findById(id: number): Promise<MedicalCase | null> {
    const [row] = await this.db
      .select()
      .from(schema.medicalCases)
      .where(eq(schema.medicalCases.id, id))
      .limit(1);

    return (row as unknown as MedicalCase) || null;
  }

  async findByRegId(regid: number): Promise<MedicalCase[]> {
    const rows = await this.db
      .select()
      .from(schema.medicalCases)
      .where(eq(schema.medicalCases.regid, regid))
      .orderBy(desc(schema.medicalCases.createdAt));

    return rows as unknown as MedicalCase[];
  }

  private _calculateAge(dobValue: string | Date | null | undefined): number | undefined {
    if (!dobValue) return undefined;
    const dob = new Date(dobValue);
    if (Number.isNaN(dob.getTime())) return undefined;
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    const dayDiff = today.getDate() - dob.getDate();
    if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
      age -= 1;
    }
    return age >= 0 ? age : undefined;
  }

  async findMany(filters: { search?: string; page?: number; limit?: number; clinicId?: number }) {
    const { search, page = 1, limit = 50, clinicId } = filters;
    const offset = (page - 1) * limit;

    let query = this.db
      .select({
        id: schema.medicalCases.id,
        regid: schema.medicalCases.regid,
        status: schema.medicalCases.status,
        condition: schema.medicalCases.condition,
        createdAt: schema.medicalCases.createdAt,
        first_name: schema.patients.firstName,
        surname: schema.patients.surname,
        gender: schema.patients.gender,
        dob: schema.patients.dob,
        date_of_birth: schema.patients.dateOfBirth,
        phone: schema.patients.phone,
        city: schema.patients.city,
      })
      .from(schema.medicalCases)
      .leftJoin(schema.patients, eq(schema.medicalCases.regid, schema.patients.regid))
      .$dynamic();

    const conditions: any[] = [isNull(schema.medicalCases.deletedAt)];
    if (clinicId) {
      conditions.push(eq(schema.patients.clinicId, clinicId));
    }

    if (search) {
      const searchTerms = `%${search}%`;
      conditions.push(
        sql`(${schema.patients.firstName} ILIKE ${searchTerms} OR ${schema.patients.surname} ILIKE ${searchTerms} OR ${schema.patients.phone} ILIKE ${searchTerms})`
      );
    }

    query = query.where(and(...conditions));

    const rows = await query
      .orderBy(desc(schema.medicalCases.createdAt))
      .limit(limit)
      .offset(offset);

    const hydrated = (rows as any[]).map((row) => ({
      ...row,
      age: row.age ?? this._calculateAge(row.dob ?? row.date_of_birth),
    }));

    const [countRes] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.medicalCases)
      .leftJoin(schema.patients, eq(schema.medicalCases.regid, schema.patients.regid))
      .where(and(...conditions));

    return { data: hydrated, total: countRes?.count ?? 0 };
  }

  async create(data: Partial<MedicalCase>): Promise<number> {
    const [row] = await this.db
      .insert(schema.medicalCases)
      .values({
        regid: data.regid!,
        clinicId: data.clinicId,
        doctorId: data.doctorId,
        status: data.status || 'Active',
        condition: data.condition,
      })
      .returning({ id: schema.medicalCases.id });

    return row?.id ?? 0;
  }

  async update(id: number, data: Partial<MedicalCase>): Promise<void> {
    await this.db
      .update(schema.medicalCases)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(schema.medicalCases.id, id));
  }

  async getUnifiedCaseData(regid: number): Promise<FullCaseData | null> {
    try {
      const medicalCases = await this.db
        .select({
          id: schema.medicalCases.id,
          patientId: schema.patients.id,
          regid: schema.medicalCases.regid,
          status: sql<string>`COALESCE(${schema.medicalCases.status}, 'Active')`,
          condition: sql<string>`COALESCE(${schema.medicalCases.condition}, '')`,
          createdAt: schema.medicalCases.createdAt,
          patientName: sql<string>`${schema.patients.firstName} || ' ' || ${schema.patients.surname}`,
          phone: schema.patients.phone,
          dateOfBirth: schema.patients.dateOfBirth,
          city: schema.patients.city,
        })
        .from(schema.medicalCases)
        .leftJoin(schema.patients, eq(schema.medicalCases.regid, schema.patients.regid))
        .where(eq(schema.medicalCases.regid, regid))
        .orderBy(desc(schema.medicalCases.createdAt));

      const activeCase = medicalCases.find(c => c.status === 'Active') || medicalCases[0];

      // If no medical case exists, fetch patient info separately
      if (!activeCase) {
        const [patient] = await this.db
          .select()
          .from(schema.patients)
          .where(eq(schema.patients.regid, regid))
          .limit(1);

        if (!patient) return null;

        return {
          medicalCase: {
            id: 0,
            patientId: patient.id,
            regid,
            status: 'None',
            patientName: `${patient.firstName} ${patient.surname}`,
            phone: patient.phone,
            dateOfBirth: patient.dateOfBirth ? new Date(patient.dateOfBirth).toISOString() : null,
            city: patient.city,
          } as MedicalCase,
          vitals: [],
          soap: [],
          notes: [],
          examination: [],
          images: [],
          investigations: [],
          prescriptions: [],
          vaccines: [],
          reminders: [],
        };
      }

      // If no medical case exists, we still want to return patient-level data (notes, images, homeo)
      // but soap/vitals will be empty since they depend on visitId (activeCase.id).
      
      // Fetch all clinical data points for this patient, unifying legacy and AI-driven tables.
      const [
        vitalsRows,
        soapRows,
        homeo,
        notes,
        examination,
        images,
        investigations,
        legacyPrescriptions,
        aiPrescriptions,
        vaccines,
        reminders
      ] = await Promise.all([
        // Vitals: Fetch all vitals recorded for this patient's visits
        this.db
          .select({
            id: schema.vitals.id,
            visitId: schema.vitals.visitId,
            heightCm: schema.vitals.heightCm,
            weightKg: schema.vitals.weightKg,
            bmi: schema.vitals.bmi,
            temperatureF: schema.vitals.temperatureF,
            pulseRate: schema.vitals.pulseRate,
            systolicBp: schema.vitals.systolicBp,
            diastolicBp: schema.vitals.diastolicBp,
            respiratoryRate: schema.vitals.respiratoryRate,
            oxygenSaturation: schema.vitals.oxygenSaturation,
            bloodSugar: schema.vitals.bloodSugar,
            notes: schema.vitals.notes,
            recordedAt: schema.vitals.recordedAt,
          })
          .from(schema.vitals)
          .innerJoin(schema.appointments, eq(schema.vitals.visitId, schema.appointments.id))
          .innerJoin(schema.patients, eq(schema.appointments.patientId, schema.patients.id))
          .where(eq(schema.patients.regid, regid))
          .orderBy(desc(schema.vitals.recordedAt)),

        // SOAP: Fetch all SOAP notes recorded for this patient's visits
        this.db
          .select({
            id: schema.legacySoapNotes.id,
            visitId: schema.legacySoapNotes.visitId,
            subjective: schema.legacySoapNotes.subjective,
            objective: schema.legacySoapNotes.objective,
            assessment: schema.legacySoapNotes.assessment,
            plan: schema.legacySoapNotes.plan,
            advice: schema.legacySoapNotes.advice,
            followUp: schema.legacySoapNotes.followUp,
            icdCodes: schema.legacySoapNotes.icdCodes,
          })
          .from(schema.legacySoapNotes)
          .innerJoin(schema.appointments, eq(schema.legacySoapNotes.visitId, schema.appointments.id))
          .innerJoin(schema.patients, eq(schema.appointments.patientId, schema.patients.id))
          .where(eq(schema.patients.regid, regid))
          .orderBy(desc(schema.legacySoapNotes.id)),

        this.getHomeoDetails(regid),
        this.db.select().from(schema.caseNotes).where(eq(schema.caseNotes.regid, regid)).orderBy(desc(schema.caseNotes.createdAt)),
        this.db.select().from(schema.caseExamination).where(eq(schema.caseExamination.regid, regid)),
        this.db.select().from(schema.caseImages).where(and(eq(schema.caseImages.regid, regid), isNull(schema.caseImages.deletedAt))),
        this.db.select().from(schema.investigations).where(eq(schema.investigations.regid, regid)),
        
        // Legacy Prescriptions: Detailed fetch with joins
        this.db
          .select({
            id: schema.legacyPrescriptions.id,
            regid: schema.legacyPrescriptions.regid,
            visitId: schema.legacyPrescriptions.visitId,
            dateval: schema.legacyPrescriptions.dateval,
            medicineId: schema.legacyPrescriptions.medicineId,
            medicineName: schema.medicines.name,
            potencyId: schema.legacyPrescriptions.potencyId,
            potencyName: schema.potencies.name,
            frequencyId: schema.legacyPrescriptions.frequencyId,
            frequencyTitle: schema.frequencies.title,
            days: schema.legacyPrescriptions.days,
            instructions: schema.legacyPrescriptions.instructions,
            createdAt: schema.legacyPrescriptions.createdAt,
          })
          .from(schema.legacyPrescriptions)
          .leftJoin(schema.medicines, eq(schema.legacyPrescriptions.medicineId, schema.medicines.id))
          .leftJoin(schema.potencies, eq(schema.legacyPrescriptions.potencyId, schema.potencies.id))
          .leftJoin(schema.frequencies, eq(schema.legacyPrescriptions.frequencyId, schema.frequencies.id))
          .where(and(eq(schema.legacyPrescriptions.regid, regid), isNull(schema.legacyPrescriptions.deletedAt)))
          .orderBy(desc(schema.legacyPrescriptions.createdAt)),
        
        // AI Prescriptions: Resilient raw fetch for the newer text-based table
        (async () => {
          try {
            return await this.db.execute(sql`SELECT * FROM "prescriptions" WHERE "regid" = ${regid} ORDER BY "id" DESC`) as any[];
          } catch (e: any) {
            console.warn(`⚠️ [MedicalCaseRepositoryPg] prescriptions table missing or error for regid ${regid}:`, e.message);
            return [];
          }
        })(),
        
        this.getVaccines(regid),
        this.getReminders(regid)

      ]);

      // Normalize AI prescriptions into the standard Prescription interface for UI consistency
      const normalizedAiRx: Prescription[] = (aiPrescriptions || []).map(row => ({
        id: row.id,
        regid: row.regid,
        visitId: row.consultation_id,
        dateval: row.created_at ? new Date(row.created_at).toISOString().split('T')[0] : null,
        remedyName: row.remedy,
        potencyId: null, // text-based legacy field
        frequencyId: null, // text-based legacy field
        days: parseInt(row.duration) || null,
        instructions: row.instructions,
        // These fields are often expected by the UI for AI-generated remedies
        potency: row.potency,
        frequency: row.frequency,
      } as any));

      const allPrescriptions = [...(legacyPrescriptions as Prescription[]), ...normalizedAiRx];

      return {
        medicalCase: (activeCase || { id: 0, regid, status: 'None' }) as MedicalCase, // Fallback for UI
        vitals: vitalsRows as Vitals[],
        soap: soapRows as SoapNotes[],
        homeo,
        notes: notes as CaseNote[],
        examination: examination as CaseExamination[],
        images: images as CaseImage[],
        investigations: investigations as Investigation[],
        prescriptions: allPrescriptions,
        vaccines: vaccines as any[],
        reminders: reminders as any[],
      };
    } catch (err: any) {
      console.error(`💥 [MedicalCaseRepositoryPg] Error in getUnifiedCaseData for regid ${regid}:`, err);
      throw err; // Re-throw to be caught by Express error handler
    }
  }

  private async patchConstraint(table: string, column: string) {
    const constraintName = `${table}_${column}_unique`;
    try {
      console.log(`[MedicalCaseRepositoryPg] 🔧 Self-healing: Patching missing UNIQUE constraint ${constraintName}...`);
      await this.db.execute(sql.raw(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = '${constraintName}'
          ) THEN
            ALTER TABLE "${table}" ADD CONSTRAINT "${constraintName}" UNIQUE("${column}");
          END IF;
        END $$
      `));
    } catch (err: any) {
      console.error(`[MedicalCaseRepositoryPg] ❌ Self-healing failed for ${constraintName}:`, err.message);
      throw err;
    }
  }

  async saveVitals(data: Partial<Vitals>): Promise<void> {
    const execute = () => this.db
      .insert(schema.vitals)
      .values({
        visitId: data.visitId!,
        heightCm: data.heightCm,
        weightKg: data.weightKg,
        bmi: data.bmi,
        temperatureF: data.temperatureF,
        pulseRate: data.pulseRate,
        systolicBp: data.systolicBp,
        diastolicBp: data.diastolicBp,
        respiratoryRate: data.respiratoryRate,
        oxygenSaturation: data.oxygenSaturation,
        bloodSugar: data.bloodSugar,
        notes: data.notes,
        recordedAt: data.recordedAt || new Date(),
      })
      .onConflictDoUpdate({
        target: schema.vitals.visitId,
        set: {
          heightCm: data.heightCm,
          weightKg: data.weightKg,
          bmi: data.bmi,
          temperatureF: data.temperatureF,
          pulseRate: data.pulseRate,
          systolicBp: data.systolicBp,
          diastolicBp: data.diastolicBp,
          respiratoryRate: data.respiratoryRate,
          oxygenSaturation: data.oxygenSaturation,
          bloodSugar: data.bloodSugar,
          notes: data.notes,
          recordedAt: data.recordedAt || new Date(),
          updatedAt: new Date(),
        },
      });

    try {
      await execute();
    } catch (err: any) {
      if (err.message?.includes('ON CONFLICT specification') || err.code === '42P10') {
        await this.patchConstraint('vitals', 'visit_id');
        await execute();
      } else {
        console.error('💥 [MedicalCaseRepositoryPg] Error in saveVitals:', err);
        throw err;
      }
    }
  }

  async getVitals(visitId: number): Promise<Vitals | null> {
    const [row] = await this.db
      .select()
      .from(schema.vitals)
      .where(eq(schema.vitals.visitId, visitId))
      .limit(1);

    return (row as Vitals) || null;
  }

  async saveSoapNotes(data: Partial<SoapNotes>): Promise<void> {
    const execute = () => this.db
      .insert(schema.legacySoapNotes)
      .values({
        visitId: data.visitId!,
        subjective: data.subjective,
        objective: data.objective,
        assessment: data.assessment,
        plan: data.plan,
        advice: data.advice,
        followUp: data.followUp,
        icdCodes: data.icdCodes,
      })
      .onConflictDoUpdate({
        target: schema.legacySoapNotes.visitId,
        set: {
          subjective: data.subjective,
          objective: data.objective,
          assessment: data.assessment,
          plan: data.plan,
          advice: data.advice,
          followUp: data.followUp,
          icdCodes: data.icdCodes,
          updatedAt: new Date(),
        },
      });

    try {
      await execute();
    } catch (err: any) {
      if (err.message?.includes('ON CONFLICT specification') || err.code === '42P10') {
        await this.patchConstraint('soap_notes', 'visit_id');
        await execute();
      } else {
        console.error('💥 [MedicalCaseRepositoryPg] Error in saveSoapNotes:', err);
        throw err;
      }
    }
  }

  async getSoapNotes(visitId: number): Promise<SoapNotes | null> {
    const [row] = await this.db
      .select()
      .from(schema.legacySoapNotes)
      .where(eq(schema.legacySoapNotes.visitId, visitId))
      .limit(1);

    return (row as SoapNotes) || null;
  }

  async saveHomeoDetails(data: Partial<HomeoDetails>): Promise<void> {
    const homeoData: any = {
      regid: data.regid!,
    };
    if ((schema.homeoDetails as any).thermal) homeoData.thermal = data.thermal;
    if ((schema.homeoDetails as any).constitutional) homeoData.constitutional = data.constitutional;
    
    const setClause: any = {
      updatedAt: new Date(),
    };
    if ((schema.homeoDetails as any).thermal) setClause.thermal = data.thermal;
    if ((schema.homeoDetails as any).constitutional) setClause.constitutional = data.constitutional;

    const execute = () => this.db
      .insert(schema.homeoDetails)
      .values(homeoData)
      .onConflictDoUpdate({
        target: schema.homeoDetails.regid,
        set: setClause,
      });

    try {
      await execute();
    } catch (err: any) {
      if (err.message?.includes('ON CONFLICT specification') || err.code === '42P10') {
        await this.patchConstraint('homeo_details', 'regid');
        await execute();
      } else {
        console.error('💥 [MedicalCaseRepositoryPg] Error in saveHomeoDetails:', err);
        throw err;
      }
    }
  }

  async getHomeoDetails(regid: number): Promise<HomeoDetails | null> {
    const [row] = await this.db
      .select()
      .from(schema.homeoDetails)
      .where(eq(schema.homeoDetails.regid, regid))
      .limit(1);

    return (row as HomeoDetails) || null;
  }


  async saveNote(data: Partial<CaseNote>): Promise<void> {
    if (data.id) {
      await this.db.update(schema.caseNotes).set(data).where(eq(schema.caseNotes.id, data.id));
    } else {
      await this.db.insert(schema.caseNotes).values({
        regid: data.regid!,
        notes: data.notes!,
        notesType: data.notesType || 'General',
        dateval: data.dateval,
      });
    }
  }

  async deleteNote(id: number): Promise<void> {
    await this.db.update(schema.caseNotes).set({ deletedAt: new Date() }).where(eq(schema.caseNotes.id, id));
  }

  async saveExamination(data: Partial<CaseExamination>): Promise<void> {
    if (data.id) {
      await this.db.update(schema.caseExamination).set(data).where(eq(schema.caseExamination.id, data.id));
    } else {
      await this.db.insert(schema.caseExamination).values({
        regid: data.regid!,
        examinationDate: data.examinationDate,
        bpSystolic: data.bpSystolic,
        bpDiastolic: data.bpDiastolic,
        findings: data.findings,
      });
    }
  }

  async deleteExamination(id: number): Promise<void> {
    await this.db.update(schema.caseExamination).set({ deletedAt: new Date() }).where(eq(schema.caseExamination.id, id));
  }

  async saveImage(data: Partial<CaseImage>): Promise<number> {
    const [row] = await this.db.insert(schema.caseImages).values({
      regid: data.regid!,
      picture: data.picture!,
      description: data.description,
    }).returning({ id: schema.caseImages.id });
    return row?.id ?? 0;
  }

  async deleteImage(id: number): Promise<void> {
    await this.db.update(schema.caseImages).set({ deletedAt: new Date() }).where(eq(schema.caseImages.id, id));
  }

  async saveInvestigation(data: Partial<Investigation>): Promise<void> {
    if (data.id) {
      await this.db.update(schema.investigations).set(data).where(eq(schema.investigations.id, data.id));
    } else {
      await this.db.insert(schema.investigations).values({
        regid: data.regid!,
        visitId: data.visitId,
        type: data.type!,
        data: data.data,
        investDate: data.investDate,
      });
    }
  }

  async deleteInvestigation(id: number, type: string): Promise<void> {
    await this.db.update(schema.investigations).set({ deletedAt: new Date() }).where(eq(schema.investigations.id, id));
  }

  async savePrescription(data: Partial<Prescription>): Promise<void> {
    if (data.id) {
      await this.db.update(schema.legacyPrescriptions).set(data).where(eq(schema.legacyPrescriptions.id, data.id));
    } else {
      await this.db.insert(schema.legacyPrescriptions).values({
        regid: data.regid!,
        visitId: data.visitId,
        dateval: data.dateval,
        medicineId: data.medicineId,
        potencyId: data.potencyId,
        frequencyId: data.frequencyId,
        days: data.days,
        instructions: data.instructions,
      });
    }
  }

  async deletePrescription(id: number): Promise<void> {
    await this.db.update(schema.legacyPrescriptions).set({ deletedAt: new Date() }).where(eq(schema.legacyPrescriptions.id, id));
  }

  // ─── Vaccines ───
  async getVaccines(regid: number) {
    const rows = await this.db
      .select({
        id: schema.caseVaccines.id,
        regid: schema.caseVaccines.regid,
        vaccineId: schema.caseVaccines.vaccineId,
        notes: schema.caseVaccines.notes,
        createdAt: schema.caseVaccines.createdAt,
        vaccineName: schema.vaccineMaster.label,
      })
      .from(schema.caseVaccines)
      .leftJoin(schema.vaccineMaster, eq(schema.caseVaccines.vaccineId, schema.vaccineMaster.id))
      .where(eq(schema.caseVaccines.regid, regid));
    return rows as any[];
  }

  async getMasterVaccines() {
    return await this.db.select().from(schema.vaccineMaster) as unknown as VaccineMaster[];
  }

  async saveVaccine(data: Partial<any>) {
    if (data.id) {
      await this.db.update(schema.caseVaccines).set(data).where(eq(schema.caseVaccines.id, data.id));
    } else {
      await this.db.insert(schema.caseVaccines).values(data as any);
    }
  }

  async deleteVaccine(id: number) {
    await this.db.delete(schema.caseVaccines).where(eq(schema.caseVaccines.id, id));
  }

  // ─── Reminders ───
  async getReminders(regid: number) {
    const rows = await this.db
      .select()
      .from(schema.caseReminders)
      .where(eq(schema.caseReminders.regid, regid))
      .orderBy(desc(schema.caseReminders.reminderDate));
    return rows as unknown as CaseReminder[];
  }

  async saveReminder(data: Partial<any>) {
    if (data.id) {
      await this.db.update(schema.caseReminders).set(data).where(eq(schema.caseReminders.id, data.id));
    } else {
      await this.db.insert(schema.caseReminders).values(data as any);
    }
  }

  async deleteReminder(id: number) {
    await this.db.delete(schema.caseReminders).where(eq(schema.caseReminders.id, id));
  }

  // ─── Examinations ───
  async getExaminations(regid: number) {
    const rows = await this.db
      .select()
      .from(schema.caseExamination)
      .where(eq(schema.caseExamination.regid, regid))
      .orderBy(desc(schema.caseExamination.createdAt));
    return rows as CaseExamination[];
  }

  // ─── Package History ───
  async getPackageHistory(regid: number) {
    const rows = await this.db
      .select({
        id: schema.patientPackages.id,
        regid: schema.patientPackages.regid,
        packageId: schema.patientPackages.packageId,
        startDate: schema.patientPackages.startDate,
        expiryDate: schema.patientPackages.expiryDate,
        status: schema.patientPackages.status,
        packageName: schema.packagePlans.name,
        amount: schema.packagePlans.price,
      })
      .from(schema.patientPackages)
      .leftJoin(schema.packagePlans, eq(schema.patientPackages.packageId, schema.packagePlans.id))
      .where(eq(schema.patientPackages.regid, regid))
      .orderBy(desc(schema.patientPackages.startDate));
    return rows as any[];
  }

  // ─── Additional Charges ───
  async getAdditionalCharges(regid: number) {
    const rows = await this.db
      .select({
        id: schema.additionalChargesLegacy.id,
        regid: schema.additionalChargesLegacy.regid,
        randId: schema.additionalChargesLegacy.randId,
        name: schema.additionalChargesLegacy.additionalName,
        amount: schema.additionalChargesLegacy.additionalPrice,
        createdAt: schema.additionalChargesLegacy.createdAt,
      })
      .from(schema.additionalChargesLegacy)
      .where(eq(schema.additionalChargesLegacy.regid, regid))
      .orderBy(desc(schema.additionalChargesLegacy.createdAt));
    return rows as any[];
  }

  async saveAdditionalCharge(data: Partial<any>) {
    if (data.id) {
      await this.db.update(schema.additionalChargesLegacy).set(data).where(eq(schema.additionalChargesLegacy.id, data.id));
    } else {
      await this.db.insert(schema.additionalChargesLegacy).values({
        regid: data.regid!,
        randId: data.randId,
        additionalName: data.name!,
        additionalPrice: data.amount!,
      });
    }
  }

  async deleteAdditionalCharge(id: number) {
    await this.db.delete(schema.additionalChargesLegacy).where(eq(schema.additionalChargesLegacy.id, id));
  }
}
