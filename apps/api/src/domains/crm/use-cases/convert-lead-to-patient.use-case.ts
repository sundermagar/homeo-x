import { type Result, ok, fail } from '../../../shared/result';
import type { ILeadRepository } from '../ports/lead.repository';
import type { PatientRepository } from '../../patient/ports/patient.repository';

export class ConvertLeadToPatientUseCase {
  constructor(
    private readonly leadRepo: ILeadRepository,
    private readonly patientRepo: PatientRepository
  ) { }

  async execute(leadId: number): Promise<Result<{ regid: number }>> {
    const lead = await this.leadRepo.findLeadById(leadId);
    if (!lead) return fail('Lead not found', 'NOT_FOUND');
    if (lead.status === 'converted') return fail('Lead already converted', 'CONFLICT');

    // Split name into first and surname
    const names = (lead.name || 'Converted Lead').trim().split(' ');
    const firstName = names[0] || 'Converted';
    const surname = names.slice(1).join(' ') || 'Lead';

    const patient = await this.patientRepo.create({
      firstName,
      surname,
      mobile1: lead.mobile || lead.phone || '',
      email: lead.email || '',
      address: lead.address || '',
      referenceType: lead.source || 'Lead Conversion',
      title: 'Mr.', // Default
      gender: 'M',  // Default
    });

    // Update lead status
    await this.leadRepo.updateLead(leadId, { 
      status: 'converted',
      notes: (lead.notes || '') + `\nConverted to patient: regid ${patient.regid}`
    });

    // Add conversion followup
    await this.leadRepo.createFollowup(leadId, {
      name: `Lead converted to patient with regid ${patient.regid}`,
      task: 'Lead Conversion',
      taskstatus: 'done'
    });

    return ok({ regid: patient.regid });
  }
}
