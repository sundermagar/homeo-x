// ─── Package Plan Blueprint ───────────────────────────────────────────────────
export interface PackagePlan {
  id:           number;
  name:         string;
  description?: string;
  price:        number;
  durationDays: number;
  colorCode:    string;
  isActive:     boolean;
  createdAt?:   Date;
  updatedAt?:   Date;
}

// ─── Patient Package Subscription ────────────────────────────────────────────
export interface PatientPackage {
  id:          number;
  patientId:   number;
  regid:       number;
  packageId:   number;
  startDate:   string;  // YYYY-MM-DD
  expiryDate:  string;  // YYYY-MM-DD
  status:      'Active' | 'Expired' | 'Cancelled';
  billId?:     number;
  notes?:      string;
  createdAt?:  Date;
  // Joined fields
  packageName?:  string;
  packagePrice?: number;
  colorCode?:    string;
}

// ─── Analytics / Expiry Tracking ─────────────────────────────────────────────
export interface PackageExpiryRecord {
  patientId:       number;
  regid:           number;
  firstName:       string;
  surname:         string;
  phone?:          string;
  packageName:     string;
  packagePrice:    number;
  startDate:       string;
  expiryDate:      string;
  daysRemaining:   number;
  status:          'Active' | 'Expired' | 'ExpiringSoon';
}

// ─── DTOs ─────────────────────────────────────────────────────────────────────
export interface CreatePackagePlanDto {
  name:         string;
  description?: string;
  price:        number;
  durationDays: number;
  colorCode?:   string;
}

export interface UpdatePackagePlanDto extends Partial<CreatePackagePlanDto> {
  isActive?: boolean;
}

export interface AssignPackageDto {
  regid:      number;
  packageId:  number;
  startDate?: string; // defaults to today
  notes?:     string;
}
