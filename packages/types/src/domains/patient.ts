export interface Patient {
  id: number;
  regid: number;
  tenantId: string;
  firstName: string;
  surname: string;
  gender: 'M' | 'F' | 'Other';
  dateOfBirth: Date | null;
  age: number | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  bloodGroup: string | null;
  referenceType: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface PatientSummary {
  regid: number;
  fullName: string;
  gender: string;
  age: number | null;
  phone: string | null;
  mobile1: string | null;
  lastVisit: Date | null;
  totalVisits: number;
}
