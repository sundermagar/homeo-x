export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface CreatePatientRequest {
  firstName: string;
  surname: string;
  gender: 'M' | 'F' | 'Other';
  dateOfBirth?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  bloodGroup?: string;
  referenceType?: string;
}

export interface StartConsultationRequest {
  visitId: string;
}

export interface CompleteConsultationRequest {
  visitId: string;
  soap?: {
    subjective?: string;
    objective?: string;
    assessment?: string;
    plan?: string;
    advice?: string;
    followUp?: string;
    icdCodes?: string[];
  };
  prescription?: {
    notes?: string;
    items: Array<{
      medicationName: string;
      dosage: string;
      frequency: string;
      duration: string;
      route?: string;
      instructions?: string;
    }>;
  };
  labOrders?: Array<{
    testName: string;
    testCode?: string;
    category?: string;
    priority?: 'STAT' | 'URGENT' | 'ROUTINE';
  }>;
  autoApprove?: boolean;
}

export interface ConsultHomeopathyRequest {
  visitId: string;
  transcript: string;
  age?: string;
  gender?: string;
  thermalReaction?: string;
  miasm?: string;
  specialty?: string;
  isBackground?: boolean;
}
