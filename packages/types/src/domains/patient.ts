export interface Patient {
  id: number;
  regid: number;
  tenantId: string;
  // Name
  title: string | null;
  firstName: string;
  middleName: string | null;
  surname: string;
  gender: 'M' | 'F' | 'Other';
  dateOfBirth: Date | null;
  age: number | null;
  // Contact
  phone: string | null;
  mobile1: string | null;
  mobile2: string | null;
  email: string | null;
  // Address
  pin: string | null;
  address: string | null;
  road: string | null;
  area: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  altAddress: string | null;
  // Personal
  religion: string | null;
  occupation: string | null;
  maritalStatus: string | null;
  bloodGroup: string | null;
  // Clinical
  referenceType: string | null;
  referredBy: string | null;
  assistantDoctor: string | null;
  consultationFee: number | null;
  courierOutstation: boolean;
  // Meta
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
  dob: Date | string | null;
  city: string | null;
  lastVisit: Date | null;
  totalVisits: number;
  createdAt: Date;
}

export interface FamilyMember {
  id: number;
  regid: number;
  memberRegid: number;
  relation: string;
  memberName: string | null;
  memberMobile: string | null;
}

export interface PatientFormMeta {
  doctors: Array<{ id: number; name: string; consultationFee: number | null }>;
  references: string[];
  religions: string[];
  occupations: string[];
  statuses: string[];
  titles: string[];
}

export interface FamilyGroupSummary {
  id: number;
  regid: number;
  familyRegid: number | null;
  name: string;
  surname: string;
  totalMembers: number;
}
