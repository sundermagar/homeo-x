import { eq, and, sql, desc } from 'drizzle-orm';
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
  FullCaseData
} from '../../domains/medical-case/ports/medical-case.repository';

export class MedicalCaseRepositoryPg implements MedicalCaseRepository {
  constructor(private readonly db: DbClient) {}

  async findById(id: number): Promise<MedicalCase | null> {
    const [row] = await this.db
      .select()
      .from(schema.medicalCases)
      .where(eq(schema.medicalCases.id, id))
      .limit(1);

    return (row as MedicalCase) || null;
  }

  async findByRegId(regid: number): Promise<MedicalCase[]> {
    const rows = await this.db
      .select()
      .from(schema.medicalCases)
      .where(eq(schema.medicalCases.regid, regid))
      .orderBy(desc(schema.medicalCases.createdAt));

    return rows as MedicalCase[];
  }

  async findMany(filters: { search?: string; page?: number; limit?: number }) {
    const { search, page = 1, limit = 50 } = filters;
    const offset = (page - 1) * limit;

    const query = this.db
      .select({
        id: schema.medicalCases.id,
        regid: schema.medicalCases.regid,
        status: schema.medicalCases.status,
        condition: schema.medicalCases.condition,
        createdAt: schema.medicalCases.createdAt,
        first_name: schema.patients.firstName,
        surname: schema.patients.surname,
        gender: schema.patients.gender,
        age: schema.patients.age,
        phone: schema.patients.phone,
        city: schema.patients.city,
      })
      .from(schema.medicalCases)
      .leftJoin(schema.patients, eq(schema.medicalCases.regid, schema.patients.regid))
      .where(sql`1=1`); // TODO: Add search conditions if provided

    if (search) {
      // Basic search logic for name/phone
      const searchTerms = `%${search}%`;
      query.where(sql`(${schema.patients.firstName} ILIKE ${searchTerms} OR ${schema.patients.surname} ILIKE ${searchTerms} OR ${schema.patients.phone} ILIKE ${searchTerms})`);
    }

    const rows = await query
      .orderBy(desc(schema.medicalCases.createdAt))
      .limit(limit)
      .offset(offset);

    const [countRes] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.medicalCases);

    return { data: rows, total: countRes?.count ?? 0 };
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
    const medicalCases = await this.findByRegId(regid);
    const activeCase = medicalCases.find(c => c.status === 'Active') || medicalCases[0];

    if (!activeCase) return null;

    const [
      vitals,
      soap,
      homeo,
      notes,
      examination,
      images,
      investigations,
      prescriptions
    ] = await Promise.all([
      this.db.select().from(schema.vitals).where(eq(schema.vitals.visitId, activeCase.id)), // Should be visitId or regid? Usually visitId in MMC
      this.db.select().from(schema.soapNotes).where(eq(schema.soapNotes.visitId, activeCase.id)),
      this.getHomeoDetails(regid),
      this.db.select().from(schema.caseNotes).where(eq(schema.caseNotes.regid, regid)).orderBy(desc(schema.caseNotes.createdAt)),
      this.db.select().from(schema.caseExamination).where(eq(schema.caseExamination.regid, regid)),
      this.db.select().from(schema.caseImages).where(eq(schema.caseImages.regid, regid)),
      this.db.select().from(schema.investigations).where(eq(schema.investigations.regid, regid)),
      this.db.select().from(schema.prescriptions).where(eq(schema.prescriptions.regid, regid)),
    ]);

    return {
      medicalCase: activeCase,
      vitals: vitals as Vitals[],
      soap: soap as SoapNotes[],
      homeo,
      notes: notes as CaseNote[],
      examination: examination as CaseExamination[],
      images: images as CaseImage[],
      investigations: investigations as Investigation[],
      prescriptions: prescriptions as Prescription[],
    };
  }

  async saveVitals(data: Partial<Vitals>): Promise<void> {
    await this.db
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
          ...data,
          updatedAt: new Date(),
        },
      });
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
    await this.db
      .insert(schema.soapNotes)
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
        target: schema.soapNotes.visitId,
        set: {
          ...data,
          updatedAt: new Date(),
        },
      });
  }

  async getSoapNotes(visitId: number): Promise<SoapNotes | null> {
    const [row] = await this.db
      .select()
      .from(schema.soapNotes)
      .where(eq(schema.soapNotes.visitId, visitId))
      .limit(1);

    return (row as SoapNotes) || null;
  }

  async saveHomeoDetails(data: Partial<HomeoDetails>): Promise<void> {
    await this.db
      .insert(schema.homeoDetails)
      .values({
        regid: data.regid!,
        thermal: data.thermal,
        constitutional: data.constitutional,
        miasm: data.miasm,
      })
      .onConflictDoUpdate({
        target: schema.homeoDetails.regid,
        set: {
          ...data,
          updatedAt: new Date(),
        },
      });
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
    return row.id;
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
      await this.db.update(schema.prescriptions).set(data).where(eq(schema.prescriptions.id, data.id));
    } else {
      await this.db.insert(schema.prescriptions).values({
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
    await this.db.update(schema.prescriptions).set({ deletedAt: new Date() }).where(eq(schema.prescriptions.id, id));
  }
}
