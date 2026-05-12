import { type Result, ok } from '../../../shared/result.js';
import type { MedicalCaseRepository, SoapNotes } from '../ports/medical-case.repository.js';

export class ManageSoapNotesUseCase {
  constructor(private readonly repository: MedicalCaseRepository) {}

  async execute(dto: Partial<SoapNotes>): Promise<Result<void>> {
    await this.repository.saveSoapNotes(dto);
    return ok(undefined);
  }

  async get(visitId: number): Promise<Result<SoapNotes | null>> {
    const notes = await this.repository.getSoapNotes(visitId);
    return ok(notes);
  }
}
