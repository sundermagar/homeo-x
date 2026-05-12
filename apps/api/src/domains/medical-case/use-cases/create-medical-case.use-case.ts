import { type Result, ok } from '../../../shared/result.js';
import type { MedicalCaseRepository } from '../ports/medical-case.repository.js';

export interface CreateMedicalCaseDto {
  regid: number;
  clinicId?: number;
  doctorId?: number;
  condition?: string;
  status?: string;
}

export class CreateMedicalCaseUseCase {
  constructor(private readonly repository: MedicalCaseRepository) {}

  async execute(dto: CreateMedicalCaseDto): Promise<Result<number>> {
    const id = await this.repository.create(dto);
    return ok(id);
  }
}
