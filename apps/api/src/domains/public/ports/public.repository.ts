export interface PublicRepository {
  createOtp(phone: string, otp: string, expiresAt: Date): Promise<void>;
  verifyOtp(phone: string, otp: string, validUntil: Date): Promise<boolean>;
  getStaticPage(slug: string): Promise<any | null>;
  getActiveFaqs(): Promise<any[]>;
  getLatestClinicalData(phone: string): Promise<any>;
}
