import { Result, ok, fail } from '../../../shared/result.js';
import type { ICommunicationRepository } from '../ports/communication.repository.js';
import type { CreateSmsTemplateDto, UpdateSmsTemplateDto, SmsTemplate } from '@mmc/types';

function errMsg(e: unknown) {
  return e instanceof Error ? e.message : String(e);
}

export class ManageSmsTemplatesUseCase {
  constructor(private repo: ICommunicationRepository) {}

  async list(): Promise<Result<SmsTemplate[]>> {
    try {
      const templates = await this.repo.listTemplates();
      return ok(templates);
    } catch (err) {
      return fail(errMsg(err));
    }
  }

  async getById(id: number): Promise<Result<SmsTemplate>> {
    try {
      const template = await this.repo.getTemplateById(id);
      if (!template) return fail('Template not found', 'NOT_FOUND');
      return ok(template);
    } catch (err) {
      return fail(errMsg(err));
    }
  }

  async create(dto: CreateSmsTemplateDto): Promise<Result<SmsTemplate>> {
    try {
      if (!dto.name?.trim()) return fail('Template name is required', 'VALIDATION');
      if (!dto.message?.trim()) return fail('Message body is required', 'VALIDATION');
      const template = await this.repo.createTemplate(dto);
      return ok(template);
    } catch (err) {
      return fail(errMsg(err));
    }
  }

  async update(id: number, dto: UpdateSmsTemplateDto): Promise<Result<SmsTemplate>> {
    try {
      const updated = await this.repo.updateTemplate(id, dto);
      return ok(updated);
    } catch (err) {
      return fail(errMsg(err));
    }
  }

  async delete(id: number): Promise<Result<void>> {
    try {
      await this.repo.deleteTemplate(id);
      return ok(undefined as void);
    } catch (err) {
      return fail(errMsg(err));
    }
  }
}
