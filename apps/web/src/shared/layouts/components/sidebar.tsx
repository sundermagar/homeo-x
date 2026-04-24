import { NavLink, useLocation } from 'react-router-dom';
import { useState } from 'react';
import {
  LayoutDashboard, Users, UsersRound, Calendar, FileText,
  LogOut, X, Briefcase, ChevronDown, ChevronRight, Circle,
  BarChart3, Stethoscope, Receipt, Settings
} from 'lucide-react';
import { useAuthStore } from '@/shared/stores/auth-store';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

type UserRole = 'SuperAdmin' | 'Admin' | 'Clinicadmin' | 'Doctor' | 'Receptionist' | string;

interface NavSubItem {
  label: string;
  path: string;
}

interface NavItem {
  label: string;
  icon: React.ReactNode;
  path?: string;
  subItems?: NavSubItem[];
  /** Roles allowed to see this item. If undefined, visible to all. */
  roles?: UserRole[];
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);
  const location = useLocation();
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({
    'Operations Hub': location.pathname.includes('/operations'),
    'Clinical Hub': ['/consultation-history', '/vitals-check', '/medical-cases'].some(p => location.pathname.includes(p))
  });

  const toggleFolder = (label: string) => {
    setExpandedFolders(prev => ({ ...prev, [label]: !prev[label] }));
  };

  // Normalize the user's role — demo tokens may use uppercase or camelCase
  const rawRole: string = (user as any)?.type || (user as any)?.role || '';
  const normalizedRole = (() => {
    const r = rawRole.toLowerCase();
    if (r === 'superadmin') return 'SuperAdmin';
    if (r === 'admin') return 'Admin';
    if (r === 'clinicadmin') return 'Clinicadmin';
    if (r === 'doctor') return 'Doctor';
    if (r === 'receptionist') return 'Receptionist';
    return rawRole; // fall-through for unknown roles
  })();

  const ALL_ROLES: UserRole[] = ['SuperAdmin', 'Admin', 'Clinicadmin', 'Doctor', 'Receptionist'];
  const ADMIN_ROLES: UserRole[] = ['SuperAdmin', 'Admin', 'Clinicadmin'];
  const CLINICAL_ROLES: UserRole[] = ['SuperAdmin', 'Admin', 'Clinicadmin', 'Doctor'];

  const menuItems: NavItem[] = [
    {
      label: 'Dashboard',
      icon: <LayoutDashboard size={20} />,
      path: '/',
      roles: ALL_ROLES,
    },
    {
      label: 'Patients',
      icon: <Users size={20} />,
      path: '/patients',
      roles: ALL_ROLES,
    },
    {
      label: 'Clinical Hub',
      icon: <Stethoscope size={20} />,
      roles: CLINICAL_ROLES,
      subItems: [
        { label: 'Case History', path: '/consultation-history' },
        { label: 'Height & Weight Check', path: '/vitals-check' },
        { label: 'Medical Case List', path: '/medical-cases' },
      ]
    },
    {
      label: 'Appointments',
      icon: <Calendar size={20} />,
      path: '/appointments',
      roles: ALL_ROLES,
    },
    {
      label: 'Billing',
      icon: <Receipt size={20} />,
      path: '/billing',
      roles: [...ADMIN_ROLES, 'Doctor'],
    },
    {
      label: 'Family Groups',
      icon: <UsersRound size={20} />,
      path: '/family-groups',
      roles: CLINICAL_ROLES,
    },
    {
      label: 'Staff & Admin',
      icon: <Briefcase size={20} />,
      path: '/staff',
      roles: ['SuperAdmin', 'Admin', 'Clinicadmin'],
    },
    {
      label: 'Analytics',
      icon: <BarChart3 size={20} />,
      path: '/analytics',
      roles: [...ADMIN_ROLES, 'Doctor'],
    },
    {
      label: 'Operations Hub',
      icon: <Settings size={20} />,
      roles: ['SuperAdmin', 'Admin', 'Clinicadmin', 'Doctor'],
      subItems: [
        { label: 'Logistics & Couriers', path: '/operations?tab=logistics' },
        { label: 'Lead CRM & Promos', path: '/operations?tab=crm' },
        { label: 'Medical Knowledge base', path: '/operations?tab=knowledge' },
        { label: 'Global Data Tools', path: '/operations?tab=tools' },
      ]
    },
  ];

  // Filter items by role
  const visibleItems = menuItems.filter(item =>
    !item.roles || item.roles.includes(normalizedRole)
  );

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div className="sb-backdrop" onClick={onClose} />
      )}

      <div className="sb-container" data-open={isOpen}>
        {/* Brand & Close Button (Mobile) */}
        <div className="sb-brand">
          <div className="sb-logo">KH</div>
          <span className="sb-brand-name">Kreed.health</span>
          <button onClick={onClose} className="sb-close-btn mobile-only" aria-label="Close menu">
            <X size={20} />
          </button>
        </div>

        {/* Role Badge */}
        {normalizedRole && (
          <div className="sb-role-badge">
            <span>{getRoleLabel(normalizedRole)}</span>
          </div>
        )}

        {/* Nav */}
        <nav className="sb-nav">
          {visibleItems.map((item) => (
            <div key={item.label}>
              {item.subItems ? (
                <>
                  <button
                    onClick={() => toggleFolder(item.label)}
                    className="sb-folder-btn"
                  >
                    <div className="sb-nav-item-inner">
                      {item.icon}
                      <span>{item.label}</span>
                    </div>
                    {expandedFolders[item.label] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </button>
                  {expandedFolders[item.label] && (
                    <div className="sb-sub-nav">
                      {item.subItems.map(subItem => (
                        <NavLink
                          key={subItem.label}
                          to={subItem.path}
                          onClick={onClose}
                          className={({ isActive }) => {
                            // For paths with query params (like /operations?tab=), 
                            // we need a strict match of path + search.
                            const currentFull = location.pathname + location.search;
                            const isMatch = subItem.path.includes('?') 
                              ? currentFull === subItem.path
                              : isActive;
                            return `sb-sub-item${isMatch ? ' active' : ''}`;
                          }}
                        >
                          <Circle size={6} fill="currentColor" />
                          {subItem.label}
                        </NavLink>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <NavLink
                  to={item.path!}
                  end={item.path === '/'}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `sb-nav-link${isActive ? ' sb-nav-link--active' : ''}`
                  }
                >
                  {item.icon}
                  {item.label}
                </NavLink>
              )}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="sb-footer">
          <button onClick={logout} className="sb-logout-btn">
            <LogOut size={20} />
            Sign Out
          </button>
        </div>
      </div>
    </>
  );
}

function getRoleLabel(role: string): string {
  const labels: Record<string, string> = {
    SuperAdmin: '⚡ Super Admin',
    Admin: '🛡 Admin',
    Clinicadmin: '🏥 Clinic Admin',
    Doctor: '🩺 Doctor',
    Receptionist: '📋 Reception',
  };
  return labels[role] ?? role;
}
