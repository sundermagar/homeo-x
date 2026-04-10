import { type Result, ok } from '../../../shared/result';
import type { 
  MedicalCaseRepository, 
  FullCaseData
} from '../ports/medical-case.repository';
import { NotFoundError } from '../../../shared/errors';

export class GetFullMedicalCaseUseCase {
  constructor(private readonly repository: MedicalCaseRepository) {}

  async execute(regid: number): Promise<Result<FullCaseData>> {
    const data = await this.repository.getUnifiedCaseData(regid);
    
    if (!data) {
      throw new NotFoundError(`Clinical record for patient ${regid} not found`);
    }

    return ok(data);
  }
}
