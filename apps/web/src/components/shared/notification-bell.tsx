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
} from '../../hooks/use-notifications';
import { useNotificationSocket } from '@/hooks/use-notification-socket';
import { timeAgo } from '../../lib/format';
import type { NotificationType } from '../../types/notification';

import './notification-bell.css';

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
