import { type Result, ok, fail } from '../../../shared/result';
import type {
  MedicalCaseRepository,
  MedicalCase,
  Vitals,
  SoapNotes,
  HomeoDetails
} from '../ports/medical-case.repository';

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
      return fail(`Medical case with ID ${id} not found`, 'NOT_FOUND');
    }

    const homeo = await this.repository.getHomeoDetails(caseRecord.regid);

    return ok({
      ...caseRecord,
      homeo,
    });
  }

  async executeByVisit(visitId: number, regid: number): Promise<Result<FullMedicalCase>> {
    const cases = await this.repository.findByRegId(regid);
    const activeCase = cases.find(c => c.status === 'Active') || cases[0];

    if (!activeCase) {
      return fail(`No medical case found for patient ${regid}`, 'NOT_FOUND');
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
