import { type Result, ok } from '../../../shared/result';
import type { MedicalCaseRepository, Vitals } from '../ports/medical-case.repository';

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
}
