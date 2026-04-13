import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  CalendarClock,
  Calendar,
  Ticket,
  Stethoscope,
  CreditCard,
  Receipt,
  Banknote,
  Building2,
  UserCog,
  Settings,
  LogOut,
  Infinity,
  X,
  Package,
  CalendarCheck,
  MessageSquare,
  Send,
  BarChart2,
  ChevronDown,
  ChevronRight,
  type LucideIcon,
  Layers,
  MessageCircle,
  PieChart,
} from 'lucide-react';
import { useAuthStore } from '../stores/auth-store';
import '../styles/sidebar.css';


// ─── Navigation Structure ────────────────────────────────────────────────────

interface NavChild {
  path: string;
  label: string;
  icon: LucideIcon;
}

interface NavGroup {
  id: string;
  label: string;
  icon: LucideIcon;
  children: NavChild[];
}

type NavItem = { type: 'link'; path: string; label: string; icon: LucideIcon }
             | { type: 'group'; group: NavGroup };

const NAV_STRUCTURE: NavItem[] = [
  {
    type: 'link',
    path: '/',
    label: 'Dashboard',
    icon: LayoutDashboard,
  },
  {
    type: 'link',
    path: '/patients',
    label: 'Patients',
    icon: Users,
  },
  {
    type: 'group',
    group: {
      id: 'appointments',
      label: 'Appointments',
      icon: CalendarClock,
      children: [
        { path: '/appointments',          label: 'List View',    icon: CalendarClock },
        { path: '/appointments/calendar', label: 'Calendar',     icon: Calendar },
        { path: '/appointments/queue',    label: 'Token Queue',  icon: Ticket },
      ],
    },
  },
  {
    type: 'group',
    group: {
      id: 'clinical',
      label: 'Clinical',
      icon: Stethoscope,
      children: [
        { path: '/medical-cases', label: 'Medical Cases', icon: Stethoscope },
      ],
    },
  },
  {
    type: 'group',
    group: {
      id: 'memberships',
      label: 'Memberships',
      icon: Package,
      children: [
        { path: '/packages',          label: 'Package Plans', icon: Layers },
        { path: '/packages/tracking', label: 'Tracking',      icon: CalendarCheck },
      ],
    },
  },
  {
    type: 'group',
    group: {
      id: 'communications',
      label: 'Communications',
      icon: MessageSquare,
      children: [
        { path: '/communications/sms',       label: 'Send SMS',      icon: Send },
        { path: '/communications/templates', label: 'Templates',     icon: MessageCircle },
        { path: '/communications/reports',   label: 'SMS Reports',   icon: BarChart2 },
        { path: '/communications/whatsapp',  label: 'WhatsApp',     icon: MessageSquare },
      ],
    },
  },
  {
    type: 'group',
    group: {
      id: 'analytics',
      label: 'Analytics',
      icon: PieChart,
      children: [
        { path: '/analytics',         label: 'Dashboard', icon: BarChart2 },
        { path: '/analytics/reports', label: 'Reports',   icon: PieChart },
      ],
    },
  },
  {
    type: 'group',
    group: {
      id: 'finance',
      label: 'Finance',
      icon: Receipt,
      children: [
        { path: '/billing',   label: 'Billing & Finance', icon: Receipt },
        { path: '/payments',  label: 'Payment Ledger',    icon: Banknote },
      ],
    },
  },
  {
    type: 'group',
    group: {
      id: 'platform',
      label: 'Platform',
      icon: Building2,
      children: [
        { path: '/platform/clinics',   label: 'Clinics',   icon: Building2 },
        { path: '/platform/accounts',  label: 'Accounts',  icon: UserCog },
      ],
    },
  },
  {
    type: 'link',
    path: '/settings',
    label: 'Settings',
    icon: Settings,
  },
];

// ─── Component Logic ─────────────────────────────────────────────────────────

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

function isGroupActive(group: NavGroup, pathname: string): boolean {
  return group.children.some(c => {
    if (c.path === '/') return pathname === '/';
    return pathname.startsWith(c.path);
  });
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user, logout } = useAuthStore();
  const location = useLocation();

  // Auto-expand the active group by default
  const defaultOpen = NAV_STRUCTURE
    .filter((item): item is { type: 'group'; group: NavGroup } => item.type === 'group')
    .filter(item => isGroupActive(item.group, location.pathname))
    .map(item => item.group.id);

  const [openGroups, setOpenGroups] = useState<string[]>(defaultOpen);

  const toggleGroup = (id: string) => {
    setOpenGroups(prev =>
      prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]
    );
  };

  const handleNavClick = () => {
    if (window.innerWidth < 1024) onClose();
  };

  return (
    <>
      <div
        className={`sidebar-overlay ${isOpen ? 'active' : ''}`}
        onClick={onClose}
      />

      <aside className={`sidebar ${isOpen ? 'is-open' : ''}`}>
        {/* ── Logo ── */}
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

        {/* ── Navigation ── */}
        <nav className="sidebar-nav">
          {NAV_STRUCTURE.map((item) => {
            if (item.type === 'link') {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/'}
                  className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
                  onClick={handleNavClick}
                >
                  <Icon className="sidebar-item-icon" strokeWidth={1.8} />
                  <span>{item.label}</span>
                </NavLink>
              );
            }

            // Grouped section
            const { group } = item;
            const isOpen_ = openGroups.includes(group.id);
            const groupActive = isGroupActive(group, location.pathname);
            const GroupIcon = group.icon;

            return (
              <div key={group.id} className="sidebar-group">
                <button
                  className={`sidebar-group-trigger ${groupActive ? 'group-active' : ''}`}
                  onClick={() => toggleGroup(group.id)}
                >
                  <div className="sidebar-group-trigger-left">
                    <GroupIcon className="sidebar-item-icon" strokeWidth={1.8} />
                    <span>{group.label}</span>
                  </div>
                  <span className={`sidebar-chevron ${isOpen_ ? 'open' : ''}`}>
                    <ChevronDown size={14} strokeWidth={2} />
                  </span>
                </button>

                <div className={`sidebar-group-children ${isOpen_ ? 'expanded' : ''}`}>
                  <div className="sidebar-group-children-inner">
                    {group.children.map(child => {
                      const ChildIcon = child.icon;
                      return (
                        <NavLink
                          key={child.path}
                          to={child.path}
                          end
                          className={({ isActive }) =>
                            `sidebar-child-item ${isActive ? 'active' : ''}`
                          }
                          onClick={handleNavClick}
                        >
                          <span className="sidebar-child-dot" />
                          <ChildIcon className="sidebar-child-icon" strokeWidth={1.8} />
                          <span>{child.label}</span>
                        </NavLink>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </nav>

        {/* ── Footer ── */}
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
