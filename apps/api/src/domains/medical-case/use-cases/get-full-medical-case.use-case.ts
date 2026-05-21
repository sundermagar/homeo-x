import { type Result, ok, fail } from '../../../shared/result.js';
import type {
  MedicalCaseRepository,
  FullCaseData
} from '../ports/medical-case.repository.js';

export class GetFullMedicalCaseUseCase {
  constructor(private readonly repository: MedicalCaseRepository) {}

  async execute(regid: number): Promise<Result<FullCaseData>> {
    const data = await this.repository.getUnifiedCaseData(regid);

    if (!data) {
      return fail(`Clinical record for patient ${regid} not found`, 'NOT_FOUND');
    }

    return ok(data);
  }
}
