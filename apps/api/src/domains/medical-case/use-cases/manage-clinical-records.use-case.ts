import { type Result, ok } from '../../../shared/result';
import type { 
  MedicalCaseRepository, 
  CaseNote, 
  CaseExamination, 
  CaseImage, 
  Investigation, 
  Prescription 
} from '../ports/medical-case.repository';

export class ManageClinicalRecordsUseCase {
  constructor(private readonly repository: MedicalCaseRepository) {}

  // ─── Notes ───
  async saveNote(dto: Partial<CaseNote>): Promise<Result<void>> {
    await this.repository.saveNote(dto);
    return ok(undefined);
  }
  async deleteNote(id: number): Promise<Result<void>> {
    await this.repository.deleteNote(id);
    return ok(undefined);
  }

  // ─── Examination ───
  async saveExamination(dto: Partial<CaseExamination>): Promise<Result<void>> {
    await this.repository.saveExamination(dto);
    return ok(undefined);
  }
  async deleteExamination(id: number): Promise<Result<void>> {
    await this.repository.deleteExamination(id);
    return ok(undefined);
  }

  // ─── Images ───
  async saveImage(dto: Partial<CaseImage>): Promise<Result<number>> {
    const id = await this.repository.saveImage(dto);
    return ok(id);
  }
  async deleteImage(id: number): Promise<Result<void>> {
    await this.repository.deleteImage(id);
    return ok(undefined);
  }

  // ─── Investigations (Labs) ───
  async saveInvestigation(dto: Partial<Investigation>): Promise<Result<void>> {
    await this.repository.saveInvestigation(dto);
    return ok(undefined);
  }
  async deleteInvestigation(id: number, type: string): Promise<Result<void>> {
    await this.repository.deleteInvestigation(id, type);
    return ok(undefined);
  }

  // ─── SOAP / Diagnosis ───
  async deleteSoapNote(id: number): Promise<Result<void>> {
    await this.repository.deleteSoapNote(id);
    return ok(undefined);
  }

  // ─── Prescriptions ───
  async savePrescription(dto: Partial<Prescription>): Promise<Result<void>> {
    await this.repository.savePrescription(dto);
    return ok(undefined);
  }
  async deletePrescription(id: number): Promise<Result<void>> {
    await this.repository.deletePrescription(id);
    return ok(undefined);
  }


  // ─── Homeo Details ───
  async saveHomeoDetails(dto: Partial<any>): Promise<Result<void>> {
    await this.repository.saveHomeoDetails(dto);
    return ok(undefined);
  }

  // ─── Vaccines ───
  async getVaccines(regid: number): Promise<Result<any[]>> {
    const data = await this.repository.getVaccines(regid);
    return ok(data);
  }
  async getMasterVaccines(): Promise<Result<any[]>> {
    const data = await this.repository.getMasterVaccines();
    return ok(data);
  }
  async saveVaccine(dto: Partial<any>): Promise<Result<void>> {
    await this.repository.saveVaccine(dto);
    return ok(undefined);
  }

  // ─── Reminders ───
  async getReminders(regid: number): Promise<Result<any[]>> {
    const data = await this.repository.getReminders(regid);
    return ok(data);
  }
  async saveReminder(dto: Partial<any>): Promise<Result<void>> {
    await this.repository.saveReminder(dto);
    return ok(undefined);
  }
  async deleteReminder(id: number): Promise<Result<void>> {
    await this.repository.deleteReminder(id);
    return ok(undefined);
  }
}
