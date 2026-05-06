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
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationResponse {
  success: boolean;
  data?: {
    notifications: Notification[];
    pagination: {
      total: number;
      limit: number;
      offset: number;
    };
  };
  error?: string;
}

export interface UnreadCountResponse {
  success: boolean;
  data?: {
    unreadCount: number;
  };
  error?: string;
}
