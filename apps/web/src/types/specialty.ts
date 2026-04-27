export interface SoapFieldConfig {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'multiselect' | 'number';
  required: boolean;
  options?: string[];
  section: 'subjective' | 'objective' | 'assessment' | 'plan';
}

export interface PrescriptionFieldConfig {
  key: string;
  label: string;
  type: 'text' | 'select' | 'number';
  required: boolean;
  options?: string[];
}

export interface SpecialtyConfig {
  name: string;
  displayName: string;
  soapFields: SoapFieldConfig[];
  prescriptionFields: PrescriptionFieldConfig[];
}
