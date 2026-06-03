import { useState } from 'react';
import {
  Bell,
  CheckCheck,
  Calendar,
  CalendarX,
  Users,
  ClipboardCheck,
  Pill,
  FileText,
  CreditCard,
  FlaskConical,
  Clock,
  Info,
  MessageSquare,
  Trash2,
  X,
} from 'lucide-react';
import {
  useNotifications,
  useUnreadCount,
  useMarkAsRead,
  useMarkAllAsRead,
  useDeleteNotification,
  useDeleteAllNotifications,
} from '../../hooks/use-notifications';
import { useNotificationSocket } from '@/hooks/use-notification-socket';
import { timeAgo } from '../../lib/format';
import type { NotificationType } from '../../types/notification';

import './notification-bell.css';

const WhatsAppIcon = ({ size = 14, ...props }: { size?: number; [key: string]: any }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" {...props}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.458 5.704 1.459h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

/** Map notification types to icons and colors */
function getTypeIcon(type: NotificationType) {
  switch (type) {
    case 'APPOINTMENT_REMINDER': return { Icon: Calendar, color: 'notif-icon-blue' };
    case 'APPOINTMENT_CANCELLED': return { Icon: CalendarX, color: 'notif-icon-red' };
    case 'QUEUE_CALLED': return { Icon: Users, color: 'notif-icon-green' };
    case 'VISIT_COMPLETED': return { Icon: ClipboardCheck, color: 'notif-icon-emerald' };
    case 'PRESCRIPTION_READY': return { Icon: Pill, color: 'notif-icon-purple' };
    case 'INVOICE_GENERATED': return { Icon: FileText, color: 'notif-icon-orange' };
    case 'PAYMENT_RECEIVED': return { Icon: CreditCard, color: 'notif-icon-green' };
    case 'LAB_RESULT_READY': return { Icon: FlaskConical, color: 'notif-icon-cyan' };
    case 'WAITLIST_OFFER': return { Icon: Clock, color: 'notif-icon-yellow' };
    case 'SYSTEM': return { Icon: Info, color: 'notif-icon-gray' };
    case 'WHATSAPP': return { Icon: WhatsAppIcon, color: 'notif-icon-whatsapp' };
    case 'GENERAL':
    default: return { Icon: MessageSquare, color: 'notif-icon-gray' };
  }
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  useNotificationSocket(); // Subscribes to real-time socket events
  const { data: unreadData } = useUnreadCount();
  const { data: notificationsData, isLoading } = useNotifications();
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();
  const deleteNotification = useDeleteNotification();
  const deleteAllNotifications = useDeleteAllNotifications();

  const unreadCount = unreadData?.unreadCount ?? 0;
  const notifications = notificationsData?.notifications ?? [];
  console.log('[NotificationBell] data:', notificationsData, 'count:', notifications.length);

  const handleNotificationClick = async (id: string | number, isRead: boolean) => {
    if (!isRead) {
      try { await markAsRead.mutateAsync(id); } catch { /* silent */ }
    }
  };

  const handleMarkAllAsRead = async () => {
    try { await markAllAsRead.mutateAsync(); } catch { /* silent */ }
  };

  const handleDeleteAll = async () => {
    if (!window.confirm('Are you sure you want to delete all notifications?')) return;
    try { await deleteAllNotifications.mutateAsync(); } catch { /* silent */ }
  };

  const handleDelete = async (e: React.MouseEvent, id: string | number) => {
    e.stopPropagation();
    try { await deleteNotification.mutateAsync(id); } catch { /* silent */ }
  };

  return (
    <div className="notif-bell-wrapper">
      {/* Bell Trigger Button */}
      <button
        className="notif-bell-btn"
        onClick={() => setOpen((o) => !o)}
        aria-label="Notifications"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="notif-badge">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {open && (
        <>
          {/* Backdrop to close on outside click */}
          <div className="notif-backdrop" onClick={() => setOpen(false)} />

          <div className="notif-panel">
            {/* Header */}
            <div className="notif-panel-header">
              <span className="notif-panel-title">Notifications</span>
              <div className="notif-header-actions">
                {unreadCount > 0 && (
                  <button className="notif-mark-all-btn" onClick={handleMarkAllAsRead}>
                    <CheckCheck size={13} />
                    Mark all read
                  </button>
                )}
                {notifications.length > 0 && (
                  <button className="notif-mark-all-btn notif-delete-all-btn" onClick={handleDeleteAll} style={{ color: 'var(--pp-danger-fg)' }}>
                    <Trash2 size={13} />
                    Delete all
                  </button>
                )}
                <button className="notif-close-btn" onClick={() => setOpen(false)} title="Close">
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="notif-list">
              {isLoading ? (
                <div className="notif-empty">
                  <div className="notif-spinner" />
                  <p>Loading...</p>
                </div>
              ) : notifications.length === 0 ? (
                <div className="notif-empty">
                  <Bell size={32} className="notif-empty-icon" />
                  <p className="notif-empty-title">No notifications</p>
                  <p className="notif-empty-sub">You're all caught up!</p>
                </div>
              ) : (
                notifications.slice(0, 15).map((notification) => {
                  const { Icon, color } = getTypeIcon(notification.type);
                  return (
                    <button
                      key={notification.id}
                      className={`notif-item${!notification.isRead ? ' notif-item--unread' : ''}`}
                      onClick={() => handleNotificationClick(notification.id, notification.isRead)}
                    >
                      {/* Icon */}
                      <div className={`notif-item-icon ${color}`}>
                        <Icon size={14} />
                      </div>

                      {/* Content */}
                      <div className="notif-item-body">
                        <div className="notif-item-top">
                          <p className={`notif-item-title${!notification.isRead ? ' notif-item-title--bold' : ''}`}>
                            {notification.title}
                          </p>
                          {!notification.isRead && <span className="notif-unread-dot" />}
                        </div>
                        <p className="notif-item-msg">{notification.message}</p>
                        <div className="notif-item-footer">
                          <span className="notif-item-time">{timeAgo(notification.createdAt)}</span>
                          <button
                            className="notif-delete-btn"
                            onClick={(e) => handleDelete(e, notification.id)}
                            title="Delete"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="notif-panel-footer">
                Showing {Math.min(notifications.length, 15)} of{' '}
                {notificationsData?.pagination?.total ?? notifications.length}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
