/**
 * Staff domain types — unified across all staff categories.
 * Maps to legacy tables: doctors, employees, receptionists, clinicadmins, accounts.
 */

export type StaffCategory = 'doctor' | 'employee' | 'receptionist' | 'clinicadmin' | 'account';

export interface StaffMember {
  id: number;
  category: StaffCategory;
  name: string;
  email: string;
  mobile: string;
  mobile2: string;
  gender: string;
  designation: string;
  department: number;
  city: string;
  address: string;
  about: string;
  dateBirth: string | null;
  dateLeft: string | null;
  salary: number;
  isActive: boolean;
  createdAt: string | null;
  updatedAt: string | null;

  // Doctor-specific fields (null for other categories)
  title: string | null;
  firstname: string | null;
  middlename: string | null;
  surname: string | null;
  qualification: string | null;
  institute: string | null;
  passedOut: string | null;
  registrationId: string | null;
  consultationFee: number | null;
  permanentAddress: string | null;
  aadharnumber: string | null;
  pannumber: string | null;
  joiningdate: string | null;
  registrationCertificate: string | null;
  aadharCard: string | null;
  panCard: string | null;
  appointmentLetter: string | null;
  profilepic: string | null;
  col10Document: string | null;
  col12Document: string | null;
  bhmsDocument: string | null;
  mdDocument: string | null;
  clinicId: number | null;
}

export interface StaffSummary {
  id: number;
  category: StaffCategory;
  name: string;
  email: string;
  mobile: string;
  gender: string;
  designation: string;
  isActive: boolean;
  createdAt: string | null;
  city: string | null;
  clinicId: number | null;
  // Doctor extras
  title: string | null;
  qualification: string | null;
  consultationFee: number | null;
}
