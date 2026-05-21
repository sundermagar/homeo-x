export type ShipmentStatus = 'PENDING' | 'DISPATCHED' | 'DELIVERED' | 'COLLECTED';
export type ShipmentType = 'COURIER' | 'PICKUP';

export interface Shipment {
  id: number;
  regid: number;
  type: ShipmentType;
  status: ShipmentStatus;
  carrierName?: string;
  trackingNumber?: string;
  dispatchDate?: Date;
  pickupDate?: Date;
  notes?: string;
  createdAt: Date;
}

export interface RegisterShipmentInput {
  regid: number;
  type: ShipmentType;
  notes?: string;
}

export interface UpdateShipmentInput {
  id: number;
  status?: ShipmentStatus;
  carrierName?: string;
  trackingNumber?: string;
  dispatchDate?: Date;
  pickupDate?: Date;
  notes?: string;
}

export interface LogisticsRepository {
  findById(id: number): Promise<Shipment | null>;
  findByRegid(regid: number): Promise<Shipment[]>;
  findPending(clinicId?: number): Promise<Shipment[]>;
  create(data: RegisterShipmentInput): Promise<Shipment>;
  update(data: UpdateShipmentInput): Promise<Shipment>;
  delete(id: number): Promise<boolean>;
}
