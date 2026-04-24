export interface PublicRepository {
  createOtp(phone: string, otp: string, expiresAt: Date): Promise<void>;
  verifyOtp(phone: string, otp: string, validUntil: Date): Promise<boolean>;
  getStaticPage(slug: string): Promise<any | null>;
  getActiveFaqs(): Promise<any[]>;
  getLatestClinicalData(phone: string): Promise<any>;
  getPatientAppointments(phone: string): Promise<any[]>;
  bookAppointment(input: {
    phone: string;
    patientName: string;
    bookingDate: string;
    bookingTime: string;
    notes: string;
  }): Promise<any>;
  updatePatientProfile(phone: string, updates: Record<string, any>): Promise<any>;
  getNotificationPreferences(phone: string): Promise<any>;
  upsertNotificationPreferences(phone: string, prefs: any): Promise<void>;
}
