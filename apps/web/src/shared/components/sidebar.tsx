import React, { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  CalendarClock,
  Calendar,
  Ticket,
  Stethoscope,
  Receipt,
  Banknote,
  Building,
  Building2,
  UserCog,
  Settings,
  LogOut,
  Infinity,
  X,
  Package,
  CalendarCheck,
  Layers,
  Pill,
  Hospital,
  UserPlus,
  StickyNote,
  Globe,
  FileText,
  UserCircle,
  Wallet,
  MessageSquare,
  Database,
  User,
  Phone,
  Shield,
  Briefcase,
  Box,
  HelpCircle,
  FileJson,
  UserCheck,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Clock,
  Send,
  BarChart2,
  Activity,
  Gift,
  MessageCircle,
  PieChart,
  Scale,
  BookOpen,
  DollarSign,
  PlusCircle,
  BrainCircuit,
  BellDot,
  type LucideIcon,
  Truck,
  CreditCard,
  Sun,
  Moon,
} from 'lucide-react';
import { useAuthStore } from '../stores/auth-store';
import { useUiStore } from '../stores/ui-store';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../infrastructure/api-client';
import '../styles/sidebar.css';

// ─── Role Definitions ────────────────────────────────────────────────────────

type UserRole = 'SuperAdmin' | 'Admin' | 'Clinicadmin' | 'Doctor' | 'Receptionist';

const ALL: UserRole[] = ['SuperAdmin', 'Admin', 'Clinicadmin', 'Doctor', 'Receptionist'];
const ADMIN: UserRole[] = ['SuperAdmin', 'Admin', 'Clinicadmin'];
const CLINICAL: UserRole[] = ['SuperAdmin', 'Admin', 'Clinicadmin', 'Doctor'];

// ─── Navigation Structure ────────────────────────────────────────────────────

interface NavChild {
  path: string;
  label: string;
  icon: LucideIcon;
  roles?: UserRole[];
  children?: NavChild[];
}

interface NavGroup {
  id: string;
  label: string;
  icon: LucideIcon;
  children: NavChild[];
  roles?: UserRole[];
  defaultPath?: string;
}

type NavItem =
  | { type: 'link'; path: string; label: string; icon: LucideIcon; roles?: UserRole[]; badge?: number }
  | { type: 'group'; group: NavGroup };

// ... existing helper functions ...

function normalizeRole(raw: string | undefined | null): UserRole | null {
  if (!raw) return null;
  const r = raw.toLowerCase().replace(/\s/g, '');
  if (r === 'superadmin') return 'SuperAdmin';
  if (r === 'admin' || r === 'hmis_admin') return 'Admin';
  if (r === 'clinicadmin') return 'Clinicadmin';
  if (r === 'doctor' || r === 'hmis_doctor') return 'Doctor';
  if (r === 'receptionist') return 'Receptionist';
  return null;
}

function getRoleLabel(role: UserRole | null): string {
  if (!role) return '';
  const labels: Record<UserRole, string> = {
    SuperAdmin: '⚡ Super Admin',
    Admin: '🛡 Admin',
    Clinicadmin: '🏥 Clinic Admin',
    Doctor: '🩺 Doctor',
    Receptionist: '📋 Receptionist',
  };
  return labels[role];
}

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

function normalizeNavPath(path: string): { pathname: string; search: string } {
  const [pathname = '', search = ''] = path.split('?');
  return { pathname, search: search ? `?${search}` : '' };
}

function isGroupActive(group: NavGroup, currentLocation: string): boolean {
  return group.children.some(c => {
    const target = normalizeNavPath(c.path);
    if (target.pathname === '/') return currentLocation === '/';
    return currentLocation.startsWith(target.pathname + target.search);
  });
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user, logout } = useAuthStore();
  const { darkMode, toggleDarkMode, sidebarCollapsed, toggleSidebarCollapse } = useUiStore();
  const navigate = useNavigate();
  const location = useLocation();

  const { data: unreadResponse } = useQuery({
    queryKey: ['courier-unread-count'],
    queryFn: async () => {
      const { data } = await apiClient.get('/courier/unread-count');
      return data.data as { count: number };
    },
    refetchInterval: 60000,
    enabled: !!user
  });
  const unreadCount = unreadResponse?.count || 0;

  const NAV_STRUCTURE: NavItem[] = [
    {
      type: 'link',
      path: '/',
      label: 'Dashboard',
      icon: LayoutDashboard,
      roles: ALL,
    },

    {
      type: 'group',
      group: {
        id: 'patients-group',
        label: 'Patients',
        icon: Users,
        roles: ALL,
        children: [
          { path: '/patients', label: 'Patient List', icon: Users },
          { path: '/patients/queue', label: 'Patient Queue', icon: Clock },
          { path: '/family-groups', label: 'Family Groups', icon: Layers },
        ],
      },
    },
    {
      type: 'group',
      group: {
        id: 'appointments',
        label: 'Appointments',
        icon: CalendarClock,
        roles: ALL,
        children: [
          { path: '/appointments', label: 'List View', icon: CalendarClock },
          { path: '/appointments/calendar', label: 'Calendar', icon: Calendar },
          { path: '/appointments/queue', label: 'Token Queue', icon: Ticket },
        ],
      },
    },
    {
      type: 'group',
      group: {
        id: 'clinical',
        label: 'Clinical Hub',
        icon: Stethoscope,
        roles: CLINICAL,
        children: [
          { path: '/vitals-check', label: 'Height & Weight Check', icon: Scale },
          // { path: '/medical-cases', label: 'Medical Cases', icon: Stethoscope },
          // { path: '/ai-remedy-chart', label: 'Materia Medica', icon: BookOpen },
          // { path: '/ai-analysis', label: 'AI Analysis', icon: BrainCircuit },
          { path: '/clinical/remedy-chart', label: 'Remedy Chart', icon: Activity },
          { path: '/medical-cases/followups', label: 'Follow-up Dues', icon: BellDot },
        ],
      },
    },
    {
      type: 'group',
      group: {
        id: 'memberships',
        label: 'Memberships',
        icon: Package,
        roles: ADMIN,
        children: [
          { path: '/packages', label: 'Package Plans', icon: Layers },
          { path: '/packages/tracking', label: 'Tracking', icon: CalendarCheck },
        ],
      },
    },
    {
      type: 'group',
      group: {
        id: 'communications',
        label: 'Communications',
        icon: MessageSquare,
        roles: ADMIN,
        children: [
          { path: '/communications/sms', label: 'Send SMS', icon: Send },
          { path: '/communications/templates', label: 'Templates', icon: MessageCircle },
          { path: '/communications/reports', label: 'SMS Reports', icon: BarChart2 },
          { path: '/communications/whatsapp', label: 'WhatsApp', icon: MessageSquare },
        ],
      },
    },
    {
      type: 'group',
      group: {
        id: 'analytics',
        label: 'Analytics',
        icon: PieChart,
        roles: ADMIN,
        defaultPath: '/analytics',
        children: [
          { path: '/analytics', label: 'Dashboard', icon: BarChart2 },
          {
            path: '/analytics/reports',
            label: 'Reports',
            icon: PieChart,
            children: [
              { path: '/analytics/reports/financial', label: 'Financial Grid', icon: Activity },
              { path: '/analytics/reports/dues', label: 'Outstanding Dues', icon: CreditCard },
              { path: '/analytics/reports/birthdays', label: 'Birthday List', icon: Gift },
              { path: '/analytics/reports/references', label: 'Referrals & Sources', icon: Users },
            ]
          },
          { path: '/analytics/export', label: 'Export Data', icon: FileJson },
          { path: '/analytics/stocks', label: 'Inventory Logs', icon: Database },
        ],
      },
    },
    {
      type: 'group',
      group: {
        id: 'finance',
        label: 'Finance',
        icon: Receipt,
        roles: ['SuperAdmin', 'Admin', 'Clinicadmin', 'Receptionist'],
        children: [
          {
            path: '/billing', label: 'Billing', icon: Receipt,
            children: [
              { path: '/billing', label: 'Bill List', icon: Receipt },
              { path: '/billing/predefined-charges', label: 'Additional Charges', icon: Receipt },
              { path: '/billing/day-charges', label: 'Day Charges', icon: Calendar },
              { path: '/billing/deposits', label: 'Deposits', icon: Building },
              { path: '/billing/expenses', label: 'Expenses', icon: DollarSign },
            ]
          },
          { path: '/payments', label: 'Payment Ledger', icon: Banknote },
          { path: '/settings/expenses', label: 'Expense Categories', icon: Wallet },
        ],
      },
    },
    {
      type: 'group',
      group: {
        id: 'platform',
        label: 'Staff & Platform',
        icon: Building2,
        roles: ['SuperAdmin', 'Admin', 'Clinicadmin'],
        children: [
          { path: '/platform/doctors', label: 'Doctors', icon: Stethoscope },
          { path: '/platform/employees', label: 'Employees', icon: User },
          { path: '/platform/receptionists', label: 'Receptionists', icon: Phone },
          { path: '/platform/clinicadmins', label: 'Clinic Admins', icon: Shield },
          { path: '/platform/account-managers', label: 'Account Mgrs', icon: Briefcase },
          { path: '/platform/clinics', label: 'Clinics', icon: Building2, roles: ['SuperAdmin', 'Admin'] },
          { path: '/platform/accounts', label: 'Accounts', icon: UserCog },
          { path: '/settings/roles', label: 'Roles & Access', icon: UserCheck, roles: ['SuperAdmin', 'Admin'] },
        ],
      },
    },
    {
      type: 'group',
      group: {
        id: 'operations-hub',
        label: 'Operations Hub',
        icon: Settings,
        roles: ['SuperAdmin', 'Admin', 'Clinicadmin', 'Doctor', 'Receptionist'],
        children: [
          { path: '/courier-queue', label: 'Dispatch Queue', icon: Truck },
          { path: '/operations?tab=logistics', label: 'Logistics Tracking', icon: Layers },
          { path: '/operations?tab=crm', label: 'Lead CRM & Promos', icon: Users },
          { path: '/operations?tab=knowledge', label: 'Knowledge Base', icon: BookOpen },
        ],
      },
    },
    {
      type: 'group',
      group: {
        id: 'settings',
        label: 'System Settings',
        icon: Settings,
        roles: ADMIN,
        children: [
          { path: '/settings/departments', label: 'Departments', icon: Layers },
          { path: '/settings/medicines', label: 'Medicine Catalog', icon: Pill },
          { path: '/settings/stocks', label: 'Stock Management', icon: Package },
          { path: '/settings/stock-logs', label: 'Stock Logs', icon: Database },
          { path: '/settings/potencies', label: 'Potencies', icon: Sparkles },
          { path: '/settings/frequencies', label: 'Dosage Frequencies', icon: Clock },
          { path: '/settings/dispensaries', label: 'Dispensaries', icon: Hospital },
          { path: '/settings/referrals', label: 'Referral Sources', icon: UserPlus },
          { path: '/settings/stickers', label: 'Medicine Stickers', icon: StickyNote },
          { path: '/settings/cms', label: 'Content (CMS)', icon: Globe },
          { path: '/settings/pdf', label: 'PDF & Reports', icon: FileText },
          { path: '/settings/faqs', label: 'Help & FAQs', icon: HelpCircle },
          { path: '/settings/staff', label: 'Staff Management', icon: UserCircle },
          { path: '/settings/vaccines', label: 'Vaccines', icon: Shield },
        ],
      },
    },
  ];

  const [isMobile, setIsMobile] = React.useState(window.innerWidth < 1024);
  React.useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const effectiveCollapsed = sidebarCollapsed && !isMobile;

  const userRole = normalizeRole((user as any)?.type || (user as any)?.role);

  const visibleNav = NAV_STRUCTURE.filter(item => {
    if (item.type === 'link') {
      return !item.roles || (userRole && item.roles.includes(userRole));
    }
    return !item.group.roles || (userRole && item.group.roles.includes(userRole));
  });

  const currentLocation = location.pathname + location.search;
  const defaultOpen = visibleNav
    .filter((item): item is { type: 'group'; group: NavGroup } => item.type === 'group')
    .filter(item => isGroupActive(item.group, currentLocation))
    .map(item => item.group.id);

  const defaultOpenSub = visibleNav
    .filter((item): item is { type: 'group'; group: NavGroup } => item.type === 'group')
    .flatMap(item => item.group.children)
    .filter(child => child.children?.some(sc => location.pathname.startsWith(sc.path)))
    .map(child => child.path);

  const [openGroups, setOpenGroups] = useState<string[]>(defaultOpen);
  const [openSubGroups, setOpenSubGroups] = useState<string[]>(defaultOpenSub);

  const isChildVisible = (child: NavChild) => {
    return !child.roles || (userRole && child.roles.includes(userRole));
  };

  const toggleGroup = (id: string, isSubGroup = false) => {
    if (isSubGroup) {
      setOpenSubGroups(prev =>
        prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]
      );
    } else {
      setOpenGroups(prev =>
        prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]
      );
    }
  };

  const handleNavClick = () => {
    if (window.innerWidth < 1024) onClose();
  };

  const renderNavChild = (child: NavChild, isSubItem = false) => {
    if (!isChildVisible(child)) return null;

    const ChildIcon = child.icon;
    const hasChildren = child.children && child.children.length > 0;
    const isSubOpen = openSubGroups.includes(child.path);
    const subActive = child.children?.some(sc => location.pathname.startsWith(sc.path));

    if (hasChildren) {
      return (
        <div key={child.path} className="sidebar-subgroup">
          <button
            className={`sidebar-child-item ${subActive ? 'active' : ''}`}
            onClick={() => toggleGroup(child.path, true)}
            style={{ width: '100%', justifyContent: 'space-between' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
              <span className="sidebar-child-dot" />
              <ChildIcon className="sidebar-child-icon" strokeWidth={1.8} />
              {!effectiveCollapsed && <span>{child.label}</span>}
            </div>
            {!effectiveCollapsed && (
              <ChevronDown
                size={14}
                strokeWidth={2.5}
                className={`sidebar-chevron ${isSubOpen ? 'open' : ''}`}
                style={{ opacity: 0.5 }}
              />
            )}
          </button>

          {isSubOpen && (
            <div className="sidebar-sub-children" style={{ paddingLeft: '24px' }}>
              {child.children?.map(subChild => renderNavChild(subChild, true))}
            </div>
          )}
        </div>
      );
    }

    return (
      <NavLink
        key={child.path}
        to={child.path}
        end={['/', '/analytics', '/billing', '/patients', '/packages', '/appointments'].includes(child.path)}
        className={({ isActive }) => {
          const currentFull = location.pathname + location.search;
          const isMatch = child.path.includes('?')
            ? currentFull === child.path
            : isActive;
          return `sidebar-child-item ${isMatch ? 'active' : ''} ${isSubItem ? 'sub-item' : ''}`;
        }}
        onClick={handleNavClick}
      >
        <span className="sidebar-child-dot" />
        <ChildIcon className="sidebar-child-icon" strokeWidth={1.8} />
        {!effectiveCollapsed && <span>{child.label}</span>}
      </NavLink>
    );
  };

  return (
    <>
      <div
        className={`sidebar-overlay ${isOpen ? 'active' : ''}`}
        onClick={onClose}
      />

      <aside className={`sidebar ${isOpen ? 'is-open' : ''} ${effectiveCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo-group">
            <div className="sidebar-logo">
              <Infinity size={20} strokeWidth={2.5} />
            </div>
            {!effectiveCollapsed && <span className="sidebar-brand">{user?.clinicName || 'Kreed.health'}</span>}
          </div>
          <div className="sidebar-header-actions">
            {!isMobile && (
              <button className="collapse-toggle-btn" onClick={toggleSidebarCollapse}>
                {effectiveCollapsed ? <ChevronRight size={18} strokeWidth={2} /> : <ChevronRight size={18} strokeWidth={2} className="rotate-180" />}
              </button>
            )}
            <button className="mh-menu-btn sidebar-header-close" onClick={onClose}>
              <X size={20} strokeWidth={1.6} />
            </button>
          </div>
        </div>

        <nav className="sidebar-nav">
          {visibleNav.map((item) => {
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
                  {!effectiveCollapsed && <span>{item.label}</span>}
                  {item.badge !== undefined && item.badge > 0 && !effectiveCollapsed && (
                    <span className="nav-badge" style={{ marginLeft: 'auto' }}>{item.badge}</span>
                  )}
                </NavLink>
              );
            }

            const { group } = item;
            const isOpen_ = openGroups.includes(group.id);
            const groupActive = isGroupActive(group, location.pathname);
            const GroupIcon = group.icon;

            return (
              <div key={group.id} className="sidebar-group">
                <button
                  className={`sidebar-group-trigger ${groupActive ? 'group-active' : ''}`}
                  onClick={() => {
                    toggleGroup(group.id);
                    if (group.defaultPath) navigate(group.defaultPath);
                  }}
                >
                  <div className="sidebar-group-trigger-left">
                    <GroupIcon className="sidebar-item-icon" strokeWidth={1.8} />
                    {!effectiveCollapsed && <span>{group.label}</span>}
                  </div>
                  {!effectiveCollapsed && (
                    <span className={`sidebar-chevron ${isOpen_ ? 'open' : ''}`}>
                      <ChevronDown size={14} strokeWidth={2} />
                    </span>
                  )}
                </button>

                <div className={`sidebar-group-children ${isOpen_ ? 'expanded' : ''}`}>
                  <div className="sidebar-group-children-inner">
                    {group.children.map(child => renderNavChild(child))}
                  </div>
                </div>
              </div>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="user-profile">
            <div className="user-avatar">
              <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>
                {user?.name?.substring(0, 2).toUpperCase() || 'UX'}
              </span>
            </div>
            {!effectiveCollapsed && (
              <div className="user-info">
                <div className="user-name">{user?.name || 'Practitioner'}</div>
                <div className="user-role">{getRoleLabel(userRole) || (user as any)?.type || 'Doctor'}</div>
              </div>
            )}

            <button className="theme-toggle-btn" onClick={toggleDarkMode}>
              {darkMode ? <Sun size={16} strokeWidth={2} /> : <Moon size={16} strokeWidth={2} />}
            </button>

            <button className="logout-btn" onClick={logout}>
              <LogOut size={16} strokeWidth={2} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
