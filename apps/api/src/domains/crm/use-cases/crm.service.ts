import type { ICrmRepository } from '../ports/crm.repository';
import type { Lead, Referral, CaseReminder } from '@mmc/types';
import type { CreateLeadInput, CreateReferralInput, CreateReminderInput } from '@mmc/validation';

export class CrmService {
  constructor(private readonly crmRepo: ICrmRepository) {}

  async ingestLead(tenantId: string, input: CreateLeadInput): Promise<Lead> {
    return this.crmRepo.createLead(tenantId, input);
  }

  async getLeadsPipeline(tenantId: string): Promise<Lead[]> {
    return this.crmRepo.listLeads(tenantId);
  }

  async logReferral(tenantId: string, input: CreateReferralInput): Promise<Referral> {
    return this.crmRepo.createReferral(tenantId, input);
  }

  async scheduleReminder(tenantId: string, input: CreateReminderInput): Promise<CaseReminder> {
    return this.crmRepo.createReminder(tenantId, input);
  }
}
