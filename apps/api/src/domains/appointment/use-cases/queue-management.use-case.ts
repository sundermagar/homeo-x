import type { AppointmentRepository } from '../ports/appointment.repository';
import type { WaitlistEntry } from '@mmc/types';
import { type Result, ok } from '../../../shared/result';

export class QueueManagementUseCase {
  constructor(private readonly repo: AppointmentRepository) {}

  async getWaitlist(date: string, doctorId?: number): Promise<Result<WaitlistEntry[]>> {
    const list = await this.repo.getWaitlist(date, doctorId);
    return ok(list);
  }

  async addToWaitlist(dto: { patientId?: number; appointmentId?: number; doctorId?: number; consultationFee?: number }): Promise<Result<{ waitingNumber: number }>> {
    const waitingNumber = await this.repo.addToWaitlist(dto);
    return ok({ waitingNumber });
  }

  async callNext(waitlistId: number): Promise<Result<void>> {
    await this.repo.callNextInWaitlist(waitlistId);
    return ok(undefined);
  }

  async completeVisit(waitlistId: number): Promise<Result<void>> {
    await this.repo.completeWaitlistEntry(waitlistId);
    return ok(undefined);
  }

  async skipWaitlist(waitlistId: number): Promise<Result<void>> {
    await this.repo.skipWaitlistEntry(waitlistId);
    return ok(undefined);
  }
}
