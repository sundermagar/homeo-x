import { type Result, ok } from '../../../shared/result';
import type { 
  MedicalCaseRepository, 
  MedicalCase, 
  Vitals, 
  SoapNotes, 
  HomeoDetails 
} from '../ports/medical-case.repository';
import { NotFoundError } from '../../../shared/errors';

export interface FullMedicalCase extends MedicalCase {
  vitals?: Vitals | null;
  soap?: SoapNotes | null;
  homeo?: HomeoDetails | null;
}

export class GetMedicalCaseUseCase {
  constructor(private readonly repository: MedicalCaseRepository) {}

  async execute(id: number): Promise<Result<FullMedicalCase>> {
    const caseRecord = await this.repository.findById(id);
    if (!caseRecord) {
      throw new NotFoundError(`Medical case with ID ${id} not found`);
    }

    // Attempt to fetch latest vitals and soap notes if linked (this might need visitId resolution)
    // For now, we return based on what the repository provides for the case
    const homeo = await this.repository.getHomeoDetails(caseRecord.regid);

    return ok({
      ...caseRecord,
      homeo,
    });
  }

  async executeByVisit(visitId: number, regid: number): Promise<Result<FullMedicalCase>> {
    // Helper to get everything relevant to a specific visit
    const cases = await this.repository.findByRegId(regid);
    const activeCase = cases.find(c => c.status === 'Active') || cases[0];
    
    if (!activeCase) {
        throw new NotFoundError(`No medical case found for patient ${regid}`);
    }

    const vitals = await this.repository.getVitals(visitId);
    const soap = await this.repository.getSoapNotes(visitId);
    const homeo = await this.repository.getHomeoDetails(regid);

    return ok({
      ...activeCase,
      vitals,
      soap,
      homeo,
    });
  }
}
