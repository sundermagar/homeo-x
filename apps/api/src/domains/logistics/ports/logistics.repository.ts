import type { Courier, CourierMedicine } from '@mmc/types';
import type { CreateCourierInput, CreateCourierMedicineInput } from '@mmc/validation';

export interface ILogisticsRepository {
  createCourier(tenantId: string, data: CreateCourierInput): Promise<Courier>;
  listCouriers(tenantId: string, limit?: number, offset?: number): Promise<Courier[]>;
  createCourierMedicine(tenantId: string, data: CreateCourierMedicineInput): Promise<CourierMedicine>;
  updateCourierMedicineStatus(tenantId: string, id: number, status: string, trackingNo?: string): Promise<boolean>;
  listCourierMedicines(tenantId: string, limit?: number, offset?: number): Promise<{ data: CourierMedicine[], total: number }>;
}
