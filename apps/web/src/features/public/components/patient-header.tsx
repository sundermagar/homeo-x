import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Bell, CalendarDays, Pill, X } from 'lucide-react';
import { useLocation } from 'react-router-dom';

export interface Notification {
  id: string;
  type: 'appointment' | 'prescription' | 'system';
  title: string;
  message: string;
  time: string;
  read: boolean;
}

interface PatientHeaderProps {
  patientName: string;
  notifications?: Notification[];
  onMarkAllRead?: () => void;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

export const PatientHeader: React.FC<PatientHeaderProps> = ({ 
  patientName, 
  notifications = [],
  onMarkAllRead 
}) => {
  const [showNotifs, setShowNotifs] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  // The home dashboard is either /patient/:phone exactly, or /patient/:phone/dashboard
  const isHomePage = location.pathname.endsWith('/dashboard') || /^\/patient\/[^\/]+$/.test(location.pathname);

  const unreadCount = notifications.filter(n => !n.read).length;

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowNotifs(false);
      }
    }
    if (showNotifs) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showNotifs]);

  const getNotifIcon = (type: string) => {
    switch (type) {
      case 'appointment': return <CalendarDays size={16} />;
      case 'prescription': return <Pill size={16} />;
      default: return <Bell size={16} />;
    }
  };

  return (
    <header className="patient-header" id="patient-header">
      <div className="patient-header-left">
        <div className="patient-header-icon">
          <Sparkles size={22} />
        </div>
        <div>
          <div className="patient-header-greeting">{getGreeting()}</div>
          <div className="patient-header-name">{patientName}</div>
        </div>
      </div>

      {isHomePage && (
        <div className="patient-header-right" ref={dropdownRef}>
          <button 
            className="patient-notif-btn" 
            id="patient-notif-btn"
            onClick={() => setShowNotifs(!showNotifs)}
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="patient-notif-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
            )}
          </button>

          {/* Notification Dropdown */}
          {showNotifs && (
            <div className="patient-notif-dropdown" id="patient-notif-dropdown">
              <div className="patient-notif-dropdown-header">
                <span className="patient-notif-dropdown-title">Notifications</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {unreadCount > 0 && onMarkAllRead && (
                    <button 
                      className="patient-notif-mark-read"
                      onClick={() => { onMarkAllRead(); }}
                    >
                      Mark all read
                    </button>
                  )}
                  <button 
                    className="patient-notif-close"
                    onClick={() => setShowNotifs(false)}
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              <div className="patient-notif-list">
                {notifications.length > 0 ? (
                  notifications.map(notif => (
                    <div 
                      key={notif.id} 
                      className={`patient-notif-item ${!notif.read ? 'unread' : ''}`}
                    >
                      <div className={`patient-notif-item-icon ${notif.type}`}>
                        {getNotifIcon(notif.type)}
                      </div>
                      <div className="patient-notif-item-content">
                        <div className="patient-notif-item-title">{notif.title}</div>
                        <div className="patient-notif-item-message">{notif.message}</div>
                        <div className="patient-notif-item-time">{notif.time}</div>
                      </div>
                      {!notif.read && <div className="patient-notif-dot" />}
                    </div>
                  ))
                ) : (
                  <div className="patient-notif-empty">
                    <Bell size={24} style={{ color: 'var(--text-disabled)', marginBottom: 8 }} />
                    <p>No notifications yet</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </header>
  );
};
