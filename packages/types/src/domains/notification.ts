export type NotificationType =
  | 'APPOINTMENT_REMINDER'
  | 'APPOINTMENT_CANCELLED'
  | 'QUEUE_CALLED'
  | 'VISIT_COMPLETED'
  | 'PRESCRIPTION_READY'
  | 'INVOICE_GENERATED'
  | 'PAYMENT_RECEIVED'
  | 'LAB_RESULT_READY'
  | 'WAITLIST_OFFER'
  | 'SYSTEM'
  | 'GENERAL';

export interface Notification {
  id: string | number;
  userId: number;
  clinicId?: number;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}
