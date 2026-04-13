import type { Lead, Referral, CaseReminder } from '@mmc/types';
import type { CreateLeadInput, CreateReferralInput, CreateReminderInput } from '@mmc/validation';

export interface ICrmRepository {
  createLead(tenantId: string, data: CreateLeadInput): Promise<Lead>;
  listLeads(tenantId: string): Promise<Lead[]>;
  createReferral(tenantId: string, data: CreateReferralInput): Promise<Referral>;
  listReferrals(tenantId: string): Promise<Referral[]>;
  createReminder(tenantId: string, data: CreateReminderInput): Promise<CaseReminder>;
  listReminders(tenantId: string): Promise<CaseReminder[]>;
}
