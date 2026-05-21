import { type Result, ok } from '../../../shared/result.js';
import type { MedicalCaseRepository, Vitals } from '../ports/medical-case.repository.js';

export class ManageVitalsUseCase {
  constructor(private readonly repository: MedicalCaseRepository) {}

  async execute(dto: Partial<Vitals>): Promise<Result<void>> {
    await this.repository.saveVitals(dto);
    return ok(undefined);
  }

  async get(visitId: number): Promise<Result<Vitals | null>> {
    const vitals = await this.repository.getVitals(visitId);
    return ok(vitals);
  }

  async delete(id: number): Promise<Result<void>> {
    await this.repository.deleteVitals(id);
    return ok(undefined);
  }
}
