import { type Result, ok, fail } from '../../../shared/result';
import type { ILeadRepository } from '../ports/lead.repository';

export class ManageRemindersUseCase {
  constructor(private readonly repo: ILeadRepository) {}

  async list(filters: { status?: string; page: number; limit: number; date?: string }): Promise<Result<{ data: any[]; total: number }>> {
    const res = await this.repo.findReminders(filters);
    return ok(res);
  }

  async getById(id: number): Promise<Result<any>> {
    const reminder = await this.repo.findReminderById(id);
    if (!reminder) return fail('Reminder not found', 'NOT_FOUND');
    return ok(reminder);
  }

  async create(dto: any): Promise<Result<number>> {
    const id = await this.repo.createReminder(dto);
    return ok(id);
  }

  async update(id: number, dto: any): Promise<Result<void>> {
    await this.repo.updateReminder(id, dto);
    return ok();
  }

  async markDone(id: number): Promise<Result<void>> {
    await this.repo.markReminderDone(id);
    return ok();
  }

  async delete(id: number): Promise<Result<void>> {
    await this.repo.deleteReminder(id);
    return ok();
  }
}
