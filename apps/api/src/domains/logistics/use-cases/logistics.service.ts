import type { ILogisticsRepository } from '../ports/logistics.repository';
import type { Courier, CourierMedicine } from '@mmc/types';
import type { CreateCourierInput, CreateCourierMedicineInput } from '@mmc/validation';

export class LogisticsService {
  constructor(private readonly logisticsRepo: ILogisticsRepository) {}

  async createTracking(tenantId: string, input: CreateCourierInput): Promise<Courier> {
    return this.logisticsRepo.createCourier(tenantId, input);
  }

  async assignMedicineToCourier(tenantId: string, input: CreateCourierMedicineInput): Promise<CourierMedicine> {
    // Legacy app checks if SMS notification should be sent here
    return this.logisticsRepo.createCourierMedicine(tenantId, input);
  }

  async updateMedicineTracking(tenantId: string, id: number, status: string, trackingNo?: string): Promise<boolean> {
    return this.logisticsRepo.updateCourierMedicineStatus(tenantId, id, status, trackingNo);
  }

  async getDashboard(tenantId: string): Promise<CourierMedicine[]> {
    const list = await this.logisticsRepo.listCourierMedicines(tenantId);
    return list.data;
  }
}
