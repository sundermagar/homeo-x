import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  CalendarClock, 
  Calendar,
  Ticket,
  Stethoscope, 
  CreditCard, 
  Settings, 
  LogOut,
  Infinity,
  X,
  Package,
  CalendarCheck
} from 'lucide-react';
import { useAuthStore } from '../stores/auth-store';
import '../styles/sidebar.css';

const NAV_ITEMS = [
  { path: '/',                    label: 'Dashboard',    icon: LayoutDashboard },
  { path: '/appointments',        label: 'Appointments', icon: CalendarClock },
  { path: '/appointments/calendar', label: 'Calendar',  icon: Calendar },
  { path: '/appointments/queue',  label: 'Token Queue',  icon: Ticket },
  { path: '/patients',            label: 'Patients',     icon: Users },
  { path: '/medical-cases',       label: 'Medical Cases', icon: Stethoscope },
  { path: '/packages',            label: 'Packages',     icon: Package },
  { path: '/packages/tracking',   label: 'Pkg Tracking', icon: CalendarCheck },
  { path: '/billing',             label: 'Billing',      icon: CreditCard },
  { path: '/settings',            label: 'Settings',     icon: Settings },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user, logout } = useAuthStore();

  return (
    <>
      <div 
        className={`sidebar-overlay ${isOpen ? 'active' : ''}`} 
        onClick={onClose}
      />
      
      <aside className={`sidebar ${isOpen ? 'is-open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo-group">
            <div className="sidebar-logo">
              <Infinity size={20} strokeWidth={2.5} />
            </div>
            <span className="sidebar-brand">HomeoX</span>
          </div>
          <button className="mh-menu-btn sidebar-header-close" onClick={onClose}>
            <X size={20} strokeWidth={1.6} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
              onClick={() => {
                // Auto-close on mobile when a link is clicked
                if (window.innerWidth < 1024) onClose();
              }}
            >
              <item.icon className="sidebar-item-icon" strokeWidth={2} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-profile">
            <div className="user-avatar">
              <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>
                {user?.name?.substring(0, 2).toUpperCase() || 'UX'}
              </span>
            </div>
            <div className="user-info">
              <div className="user-name">{user?.name || 'Practitioner'}</div>
              <div className="user-role">{user?.type || 'Doctor'}</div>
            </div>
            <button className="logout-btn" onClick={logout} title="Logout">
              <LogOut size={16} strokeWidth={2} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
