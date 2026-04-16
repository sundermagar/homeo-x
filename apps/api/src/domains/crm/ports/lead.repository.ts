import type { 
  Lead, LeadFollowup, Referral, CaseReminder,
  CreateLeadDto, UpdateLeadDto, 
  CreateFollowupDto, UpdateFollowupDto,
  CreateReferralDto, CreateReminderDto, UpdateReminderDto
} from '@mmc/types';

export interface ILeadRepository {
  // Leads
  findManyLeads(filters: { search?: string; status?: string; page: number; limit: number }): Promise<{ data: any[]; total: number }>;
  findLeadById(id: number): Promise<any | null>;
  createLead(dto: any): Promise<number>;
  updateLead(id: number, dto: any): Promise<void>;
  deleteLead(id: number): Promise<void>;

  // Followups
  findFollowupsByLeadId(leadId: number): Promise<any[]>;
  createFollowup(leadId: number, dto: any): Promise<number>;
  updateFollowup(id: number, dto: any): Promise<void>;
  deleteFollowup(id: number): Promise<void>;

  // Referrals
  findReferralSummary(): Promise<any[]>;
  findReferralDetails(referralId: number): Promise<any[]>;
  createReferral(dto: any): Promise<number>;
  deleteReferral(id: number): Promise<void>;

  // Reminders
  findReminders(filters: { status?: string; page: number; limit: number; date?: string }): Promise<{ data: any[]; total: number }>;
  findReminderById(id: number): Promise<any | null>;
  createReminder(dto: any): Promise<number>;
  updateReminder(id: number, dto: any): Promise<void>;
  markReminderDone(id: number): Promise<void>;
  deleteReminder(id: number): Promise<void>;
}
