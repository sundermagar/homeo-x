export interface ConsentRecord {
  id: number;
  patientRegid: number;
  consentType: string;
  purpose: string;
  granted: boolean;
  grantedAt?: Date | null;
  revokedAt?: Date | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  consentVersion?: number | null;
  createdAt?: Date | null;
  updatedAt?: Date | null;
}

export interface GrantConsentDto {
  patientRegid: number;
  consentType: string;
  purpose: string;
  granted: boolean;
  ipAddress?: string;
  userAgent?: string;
  consentVersion?: number;
}

export interface ConsentRepository {
  grant(data: GrantConsentDto): Promise<ConsentRecord>;
  revoke(patientRegid: number, consentType: string): Promise<void>;
  findByPatient(patientRegid: number): Promise<ConsentRecord[]>;
  check(patientRegid: number, consentType: string): Promise<boolean>;
}
