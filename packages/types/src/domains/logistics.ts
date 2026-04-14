export interface Courier {
  id: number;
  packageId?: number | null;
  totalNoPackage: number;
  createdAt: string;
  updatedAt: string;
  // JOINed fields
  package_name?: string;
  package_color?: string;
}

export type CourierMedicineStatus = 'Pending' | 'Packed' | 'Dispatched' | 'Delivered' | 'Returned';

export interface CourierMedicine {
  id: number;
  courierId?: number | null;
  regid?: number | null;
  medicineIds?: { medicine_id: number; quantity: number }[] | null;
  dispatchDate?: string | null;
  trackingNo?: string | null;
  status: CourierMedicineStatus;
  notified: boolean;
  createdAt: string;
  updatedAt: string;
  // JOINed fields
  first_name?: string;
  surname?: string;
  mobile1?: string;
  area?: string;
  city?: string;
  package_name?: string;
  package_color?: string;
}
