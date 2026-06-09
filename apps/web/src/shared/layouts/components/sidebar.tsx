import { NavLink, useLocation } from 'react-router-dom';
import { useState } from 'react';
import {
  LayoutDashboard, Users, UsersRound, Calendar, FileText,
  LogOut, X, Briefcase, ChevronDown, ChevronRight, Circle,
  BarChart3, Stethoscope, Receipt, Settings, MessageCircle, Truck,
  Bot, MessageSquare, Send, Zap, Globe
} from 'lucide-react';
import { useAuthStore } from '@/shared/stores/auth-store';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/infrastructure/api-client';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

type UserRole = 'SuperAdmin' | 'Admin' | 'Clinicadmin' | 'Doctor' | 'Receptionist' | string;

interface NavSubItem {
  label: string;
  path: string;
  icon?: React.ReactNode;
  badge?: number;
  roles?: UserRole[];
}

interface NavItem {
  label: string;
  icon: React.ReactNode;
  path?: string;
  subItems?: NavSubItem[];
  /** Roles allowed to see this item. If undefined, visible to all. */
  roles?: UserRole[];
  badge?: number;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);
  const location = useLocation();
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({
    'Operations Hub': location.pathname.includes('/operations'),
    'WhatsApp Pro': location.pathname.includes('/communications/whatsapp')
  });

  const { data: unreadResponse } = useQuery({
    queryKey: ['courier-unread-count'],
    queryFn: async () => {
      const { data } = await apiClient.get('/courier/unread-count');
      return data.data as { count: number };
    },
    refetchInterval: 5 * 60_000, // Refresh every 5 min (remote DB is slow)
    enabled: !!user
  });
  const unreadCount = unreadResponse?.count || 0;

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
      label: 'Courier Queue',
      icon: <Truck size={20} />,
      path: '/courier-queue',
      roles: ALL_ROLES,
      badge: unreadCount > 0 ? unreadCount : undefined,
    },
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
        { label: 'AI Analysis', path: '/clinical/ai-analysis' },
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
      roles: [...ADMIN_ROLES, 'Doctor', 'Receptionist'],
    },

    {
      label: 'Staff & Admin',
      icon: <Briefcase size={20} />,
      path: '/staff',
      roles: ['SuperAdmin', 'Admin'],
    },
    {
      label: 'Analytics',
      icon: <BarChart3 size={20} />,
      path: '/analytics',
      roles: [...ADMIN_ROLES, 'Doctor'],
    },
    {
      label: 'WhatsApp Pro',
      icon: <MessageCircle size={20} className="text-pp-blue" />,
      roles: [...ADMIN_ROLES, 'Doctor', 'Receptionist'],
      subItems: [
        { label: 'Dashboard', path: '/communications/whatsapp/overview', icon: <LayoutDashboard size={14} />, roles: ADMIN_ROLES },
        { label: 'Team Inbox', path: '/communications/whatsapp/inbox', icon: <MessageSquare size={14} /> },
        { label: 'Contacts', path: '/communications/whatsapp/contacts', icon: <Users size={14} /> },
        { label: 'Campaigns', path: '/communications/whatsapp/campaigns', icon: <Send size={14} />, roles: ADMIN_ROLES },
        { label: 'Templates', path: '/communications/whatsapp/templates', icon: <FileText size={14} />, roles: ADMIN_ROLES },
        { label: 'Automations', path: '/communications/whatsapp/automations', icon: <Zap size={14} />, roles: ADMIN_ROLES },
        { label: 'AI Chatbot', path: '/communications/whatsapp/chatbots', icon: <Bot size={14} />, roles: ADMIN_ROLES },
        { label: 'Analytics', path: '/communications/whatsapp/analytics', icon: <BarChart3 size={14} />, roles: ADMIN_ROLES },
        { label: 'Widget Builder', path: '/communications/whatsapp/widget-builder', icon: <Bot size={14} />, roles: ADMIN_ROLES },
      ]
    },
    {
      label: 'Communications',
      icon: <Globe size={20} />,
      roles: ADMIN_ROLES,
      subItems: [
        { label: 'Birthday Greetings', path: '/communications/birthdays' },
        { label: 'SMS Reports', path: '/communications/reports' },
      ]
    },
    {
      label: 'Operations Hub',
      icon: <Settings size={20} />,
      roles: ADMIN_ROLES,
      subItems: [
        { label: 'Logistics & Couriers', path: '/operations?tab=logistics' },
        { label: 'Lead CRM & Promos', path: '/operations?tab=crm' },
        { label: 'Medical Knowledge base', path: '/operations?tab=knowledge' },
        // { label: 'Global Data Tools', path: '/operations?tab=tools' },
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
          <span className="sb-brand-name">MMC</span>
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
                      {item.subItems
                         .filter(sub => !sub.roles || sub.roles.includes(normalizedRole))
                         .map(subItem => (
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
                          {subItem.icon || <Circle size={6} fill="currentColor" />}
                          <span style={{ flex: 1 }}>{subItem.label}</span>
                          {subItem.badge !== undefined && subItem.badge > 0 && (
                            <span className="nav-badge">{subItem.badge}</span>
                          )}
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
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="nav-badge">{item.badge}</span>
                  )}
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
