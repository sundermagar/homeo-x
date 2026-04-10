export enum Role {
  SuperAdmin = 'SuperAdmin',
  Admin = 'Admin',
  Clinicadmin = 'Clinicadmin',
  Doctor = 'Doctor',
  Receptionist = 'Receptionist',
  Account = 'Account',
  Dispensary = 'Dispensary',
  Employee = 'Employee',
  Patient = 'Patient',
}

export enum CaseStatus {
  Active = 'Active',
  Inactive = 'Inactive',
  FollowUp = 'FollowUp',
  Completed = 'Completed',
}

export enum AppointmentStatus {
  Pending      = 'Pending',
  Confirmed    = 'Confirmed',
  Consultation = 'Consultation',
  Done         = 'Done',
  Visited      = 'Visited',
  Absent       = 'Absent',
  Cancelled    = 'Cancelled',
  Rescheduled  = 'Rescheduled',
  Waitlist     = 'Waitlist',
  Arrived      = 'Arrived',
  InProgress   = 'InProgress',
  Completed    = 'Completed',
}

export enum VisitType {
  New      = 'New',
  FollowUp = 'FollowUp',
}

export enum TokenStatus {
  Queued = 'queued',
  Called = 'called',
  Done   = 'done',
}

export enum ConsultationStage {
  Consult = 'CONSULTATION',
  Totality = 'TOTALITY',
  Repertory = 'REPERTORY',
  Prescribe = 'PRESCRIPTION',
}

export enum VisitStatus {
  Waiting = 'WAITING',
  Called = 'CALLED',
  InConsultation = 'IN_CONSULTATION',
  Completed = 'COMPLETED',
  Skipped = 'SKIPPED',
}

export enum ScribingStatus {
  Active = 'ACTIVE',
  Paused = 'PAUSED',
  Completed = 'COMPLETED',
  Failed = 'FAILED',
}

export enum Speaker {
  Doctor = 'DOCTOR',
  Patient = 'PATIENT',
  System = 'SYSTEM',
}

export enum AiProvider {
  Gemini = 'gemini',
  Groq = 'groq',
  Azure = 'azure',
}

export enum LabPriority {
  Stat = 'STAT',
  Urgent = 'URGENT',
  Routine = 'ROUTINE',
}

export enum ThermalReaction {
  Warm = 'WARM',
  Cold = 'COLD',
  Mixed = 'MIXED',
}

export enum Miasm {
  Psoric = 'PSORIC',
  Sycotic = 'SYCOTIC',
  Syphilitic = 'SYPHILITIC',
  Tubercular = 'TUBERCULAR',
}
