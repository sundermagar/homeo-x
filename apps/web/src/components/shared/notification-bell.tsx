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
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '../ui/dropdown-menu';
import { Button } from '../ui/button';
import {
  useNotifications,
  useUnreadCount,
  useMarkAsRead,
  useMarkAllAsRead,
  useDeleteNotification,
} from '../../hooks/use-notifications';
import { timeAgo } from '../../lib/format';
import type { NotificationType } from '../../types/notification';

/** Map notification types to icons and colors */
function getTypeIcon(type: NotificationType) {
  switch (type) {
    case 'APPOINTMENT_REMINDER':
      return { Icon: Calendar, color: 'text-blue-500' };
    case 'APPOINTMENT_CANCELLED':
      return { Icon: CalendarX, color: 'text-red-500' };
    case 'QUEUE_CALLED':
      return { Icon: Users, color: 'text-green-500' };
    case 'VISIT_COMPLETED':
      return { Icon: ClipboardCheck, color: 'text-emerald-500' };
    case 'PRESCRIPTION_READY':
      return { Icon: Pill, color: 'text-purple-500' };
    case 'INVOICE_GENERATED':
      return { Icon: FileText, color: 'text-orange-500' };
    case 'PAYMENT_RECEIVED':
      return { Icon: CreditCard, color: 'text-green-600' };
    case 'LAB_RESULT_READY':
      return { Icon: FlaskConical, color: 'text-cyan-500' };
    case 'WAITLIST_OFFER':
      return { Icon: Clock, color: 'text-yellow-500' };
    case 'SYSTEM':
      return { Icon: Info, color: 'text-gray-500' };
    case 'GENERAL':
    default:
      return { Icon: MessageSquare, color: 'text-gray-400' };
  }
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const { data: unreadData } = useUnreadCount();
  const { data: notificationsData, isLoading } = useNotifications();
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();
  const deleteNotification = useDeleteNotification();

  const unreadCount = unreadData?.unreadCount ?? 0;
  const notifications = notificationsData?.notifications ?? [];

  const handleNotificationClick = async (id: string, isRead: boolean) => {
    if (!isRead) {
      try {
        await markAsRead.mutateAsync(id);
      } catch {
        // Silently handle mark-as-read errors
      }
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead.mutateAsync();
    } catch {
      // Silently handle mark-all-as-read errors
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await deleteNotification.mutateAsync(id);
    } catch {
      // Silently handle delete errors
    }
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="h-5 w-5 text-gray-600 dark:text-gray-300" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-96 p-0">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Notifications
          </h3>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-medium"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Mark all read
            </button>
          )}
        </div>

        {/* Notification list */}
        <div className="max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="flex flex-col items-center gap-2">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-primary-600" />
                <p className="text-sm text-gray-400 dark:text-gray-500">
                  Loading...
                </p>
              </div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10">
              <Bell className="h-10 w-10 text-gray-200 dark:text-gray-700 mb-3" />
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                No notifications
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                You're all caught up!
              </p>
            </div>
          ) : (
            <div>
              {notifications.slice(0, 15).map((notification, index) => {
                const { Icon, color } = getTypeIcon(notification.type);
                return (
                  <div key={notification.id}>
                    <button
                      className={`w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex gap-3 group ${
                        !notification.isRead
                          ? 'bg-blue-50/50 dark:bg-blue-950/20'
                          : ''
                      }`}
                      onClick={() =>
                        handleNotificationClick(
                          notification.id,
                          notification.isRead,
                        )
                      }
                    >
                      {/* Type icon */}
                      <div className="flex-shrink-0 mt-0.5">
                        <div
                          className={`flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 ${color}`}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p
                            className={`text-sm leading-tight ${
                              notification.isRead
                                ? 'text-gray-600 dark:text-gray-400'
                                : 'font-semibold text-gray-900 dark:text-gray-100'
                            }`}
                          >
                            {notification.title}
                          </p>
                          {!notification.isRead && (
                            <span className="mt-1.5 flex-shrink-0 h-2 w-2 rounded-full bg-blue-500" />
                          )}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                          {notification.message}
                        </p>
                        <div className="flex items-center justify-between mt-1.5">
                          <p className="text-xs text-gray-400 dark:text-gray-500">
                            {timeAgo(notification.createdAt)}
                          </p>
                          <button
                            onClick={(e) => handleDelete(e, notification.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                            title="Delete notification"
                          >
                            <Trash2 className="h-3 w-3 text-gray-400 dark:text-gray-500" />
                          </button>
                        </div>
                      </div>
                    </button>
                    {index < notifications.slice(0, 15).length - 1 && (
                      <DropdownMenuSeparator className="my-0" />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="border-t border-gray-100 dark:border-gray-700 px-4 py-2">
            <p className="text-xs text-center text-gray-400 dark:text-gray-500">
              Showing latest {Math.min(notifications.length, 15)} of{' '}
              {notificationsData?.pagination?.total ?? notifications.length}{' '}
              notifications
            </p>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
