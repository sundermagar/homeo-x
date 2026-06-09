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
  PhoneCall,
  type LucideIcon,
  Truck,
  CreditCard,
  Sun,
  Bot,
  Zap,
  Moon,
} from 'lucide-react';
import mmcIconOrange from '../../assets/mmc-icon-orange-transparent.png';
import { useAuthStore } from '../stores/auth-store';
import { useUiStore } from '../stores/ui-store';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../infrastructure/api-client';
import '../styles/sidebar.css';

// ─── Role Definitions ────────────────────────────────────────────────────────

type UserRole = 'SuperAdmin' | 'Admin' | 'Clinicadmin' | 'Doctor' | 'Receptionist' | 'Dispensary';

const ALL: UserRole[] = ['Admin', 'Clinicadmin', 'Doctor', 'Receptionist'];
const ADMIN: UserRole[] = ['Admin', 'Clinicadmin'];
const CLINICAL: UserRole[] = ['Admin', 'Clinicadmin', 'Doctor'];

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
  if (r === 'dispensary' || r === 'dispensarymanager') return 'Dispensary';
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
    Dispensary: '💊 Dispensary',
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

  const userRole = normalizeRole((user as any)?.type || (user as any)?.role);
  const isSuperAdmin = userRole === 'SuperAdmin';

  const { data: unreadResponse } = useQuery({
    queryKey: ['courier-unread-count'],
    queryFn: async () => {
      const { data } = await apiClient.get('/courier/unread-count');
      return data.data as { count: number };
    },
    refetchInterval: 5 * 60_000, // 5 min — remote DB is slow
    // SuperAdmin has no courier tenant context — skip this query to avoid a pending XHR
    enabled: !!user && !isSuperAdmin,
  });
  const unreadCount = unreadResponse?.count || 0;


  const NAV_STRUCTURE: NavItem[] = [
    {
      type: 'link',
      path: '/',
      label: 'Dashboard',
      icon: LayoutDashboard,
      roles: ['SuperAdmin', ...ALL, 'Dispensary'],
    },
    {
      type: 'link',
      path: '/platform/clinics',
      label: 'Clinics',
      icon: Building2,
      roles: ['SuperAdmin'],
    },
    {
      type: 'link',
      path: '/platform/accounts',
      label: 'Users (Accounts)',
      icon: Users,
      roles: ['SuperAdmin'],
    },
    {
      type: 'link',
      path: '/platform/audit',
      label: 'Audit Logs',
      icon: FileText,
      roles: ['SuperAdmin'],
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
      type: 'link',
      path: '/appointments',
      label: 'Appointments',
      icon: CalendarClock,
      roles: ALL,
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
          { path: '/clinical/ai-analysis', label: 'AI Analysis', icon: BrainCircuit },
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
        roles: [...ADMIN, 'Receptionist'],
        children: [
          { path: '/packages', label: 'Package Plans', icon: Layers, roles: ADMIN },
          { path: '/packages/tracking', label: 'Tracking', icon: CalendarCheck, roles: [...ADMIN, 'Receptionist'] },
        ],
      },
    },
    /*
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
          { path: '/communications/birthdays', label: 'Birthday Broadcast', icon: Gift },
        ],
      },
    },
    */
    {
      type: 'group',
      group: {
        id: 'whatsapp-module',
        label: 'WhatsApp Pro',
        icon: MessageCircle,
        roles: ALL,
        children: [
          { path: '/communications/whatsapp/overview', label: 'Overview', icon: LayoutDashboard, roles: ADMIN },
          { path: '/communications/whatsapp/inbox', label: 'Team Inbox', icon: MessageSquare },
          { path: '/communications/whatsapp/contacts', label: 'Contacts', icon: Users },
          { path: '/communications/whatsapp/campaigns', label: 'Campaigns', icon: Send, roles: ADMIN },
          { path: '/communications/whatsapp/templates', label: 'Templates', icon: FileText, roles: ADMIN },
          { path: '/communications/whatsapp/automations', label: 'Automations', icon: Zap, roles: ADMIN },
          { path: '/communications/whatsapp/chatbots', label: 'AI Chatbot', icon: Bot, roles: ADMIN },
          { path: '/communications/whatsapp/analytics', label: 'Analytics', icon: BarChart2, roles: ADMIN },
          { path: '/communications/whatsapp/widget-builder', label: 'Widget Builder', icon: Bot, roles: ADMIN },
          { path: '/communications/whatsapp/channels', label: 'WABA Channels', icon: Globe, roles: ADMIN },
        ],
      },
    },
    {
      type: 'group',
      group: {
        id: 'analytics',
        label: 'Analytics',
        icon: PieChart,
        roles: CLINICAL,
        defaultPath: '/analytics',
        children: [
          { path: '/analytics', label: 'Overview', icon: BarChart2 },
          {
            path: '/analytics/reports',
            label: 'Reports',
            icon: PieChart,
            children: [
              { path: '/analytics/reports/monthly-report', label: 'Monthly Report', icon: Activity },
              { path: '/analytics/reports/monthly-dues', label: 'Monthly Dues', icon: CreditCard },
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
        roles: ALL,
        children: [
          {
            path: '/billing', label: 'Billing', icon: Receipt, roles: ALL,
            children: [
              { path: '/billing', label: 'Bill List', icon: Receipt, roles: ALL },
              { path: '/billing/collection', label: 'View Collection', icon: DollarSign, roles: ALL },
              { path: '/billing/balance', label: 'View Balance', icon: Wallet, roles: ALL },
              { path: '/billing/additional-charges', label: 'Additional Charges', icon: Receipt, roles: ADMIN },
              { path: '/billing/day-charges', label: 'Day Charges', icon: Calendar, roles: ADMIN },
              { path: '/billing/deposits', label: 'Deposits', icon: Building, roles: ['SuperAdmin', 'Admin', 'Clinicadmin', 'Receptionist'] },
              { path: '/billing/expenses', label: 'Expenses', icon: DollarSign, roles: ['SuperAdmin', 'Admin', 'Clinicadmin', 'Receptionist'] },
            ]
          },
          { path: '/payments', label: 'Payment Ledger', icon: Banknote, roles: ALL },
          { path: '/settings/expenses', label: 'Expense Categories', icon: Wallet, roles: ADMIN },
        ],
      },
    },
    {
      type: 'link',
      path: '/platform/staff',
      label: 'Staff Management',
      icon: Users,
      roles: ['Admin', 'Clinicadmin']
    },
    {
      type: 'group',
      group: {
        id: 'platform-admin',
        label: 'Platform Admin',
        icon: Globe,
        roles: ['Admin'],
        children: [
          { path: '/platform/clinics', label: 'Clinics', icon: Building2 },
          { path: '/platform/accounts', label: 'Users', icon: UserCog },
        ],
      },
    },
    {
      type: 'group',
      group: {
        id: 'operations-hub',
        label: 'Operations Hub',
        icon: Briefcase,
        roles: [...ALL, 'Dispensary'],
        children: [
          { path: '/dispensary', label: 'Stickers Workspace', icon: StickyNote, roles: ['SuperAdmin', 'Admin', 'Clinicadmin', 'Dispensary'] },
          { path: '/courier-queue', label: 'Dispatch Queue', icon: Truck, roles: [...ALL, 'Dispensary'] },
          { path: '/operations?tab=crm', label: 'Lead CRM & Promos', icon: Users, roles: ADMIN },
          { path: '/operations?tab=knowledge', label: 'Knowledge Base', icon: BookOpen, roles: ADMIN },
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
          { path: '/settings/timings', label: 'Clinic Timings', icon: Clock },
          { path: '/settings/departments', label: 'Departments', icon: Layers },
          { path: '/settings/medicines', label: 'Medicine Catalog', icon: Pill },
          { path: '/settings/stocks', label: 'Stock Management', icon: Package },
          { path: '/settings/stock-logs', label: 'Stock Logs', icon: Database },
          { path: '/settings/potencies', label: 'Potencies', icon: Sparkles },
          { path: '/settings/frequencies', label: 'Dosage Frequencies', icon: Clock },
          { path: '/settings/periods', label: 'Package Periods', icon: Clock },
          { path: '/settings/dispensaries', label: 'Dispensaries', icon: Hospital },
          { path: '/settings/referrals', label: 'Referral Sources', icon: UserPlus },
          { path: '/settings/stickers', label: 'Medicine Stickers', icon: StickyNote },
          { path: '/settings/call-statuses', label: 'Call Statuses', icon: PhoneCall },
          { path: '/settings/cms', label: 'Content (CMS)', icon: Globe },
          { path: '/settings/pdf', label: 'PDF & Reports', icon: FileText },
          { path: '/settings/faqs', label: 'Help & FAQs', icon: HelpCircle },
          { path: '/settings/vaccines', label: 'Vaccines', icon: Shield },
          { path: '/settings/roles', label: 'Roles & Access', icon: UserCheck },
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
              {effectiveCollapsed && <span className="sidebar-hover-label">{child.label}</span>}
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
        {effectiveCollapsed && <span className="sidebar-hover-label">{child.label}</span>}
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
            <div
              className="sidebar-logo"
              style={{
                background: 'transparent',
                padding: '0',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <img src={mmcIconOrange} alt="MMC Icon" style={{ width: '100%', height: '100%', objectFit: 'contain', transform: 'scale(1.6)' }} />
            </div>
            {!effectiveCollapsed && <span className="sidebar-brand">{user?.clinicName || 'MMC'}</span>}
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
              const TopIcon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/'}
                  className={({ isActive }) => `sidebar-top-link ${isActive ? 'active' : ''}`}
                  onClick={handleNavClick}
                  style={{ 
                    fontSize: effectiveCollapsed ? 'inherit' : '0.7rem', 
                    fontWeight: effectiveCollapsed ? 'normal' : 700, 
                    letterSpacing: effectiveCollapsed ? 'normal' : '0.08em', 
                    textTransform: effectiveCollapsed ? 'none' : 'uppercase', 
                    color: effectiveCollapsed ? 'inherit' : '#64748b', 
                    padding: effectiveCollapsed ? '10px 16px' : '8px 16px',
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: effectiveCollapsed ? 'center' : 'flex-start',
                    marginTop: '16px',
                    marginBottom: '8px',
                    position: 'relative',
                    outline: 'none'
                  }}
                >
                  {effectiveCollapsed && <TopIcon className="sidebar-child-icon" strokeWidth={1.8} style={{ margin: 0 }} />}
                  {!effectiveCollapsed && <span>{item.label}</span>}
                  {effectiveCollapsed && <span className="sidebar-hover-label">{item.label}</span>}
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
              <div key={group.id} className="sidebar-group-flat" style={{ marginTop: '16px', marginBottom: '8px' }}>
                {!effectiveCollapsed && (
                  <button 
                    className="sidebar-section-label" 
                    onClick={() => toggleGroup(group.id)}
                    style={{ 
                      fontSize: '0.7rem', 
                      fontWeight: 700, 
                      letterSpacing: '0.08em', 
                      textTransform: 'uppercase', 
                      color: '#64748b', 
                      padding: '8px 16px',
                      background: 'transparent',
                      border: 'none',
                      width: '100%',
                      textAlign: 'left',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      outline: 'none'
                  }}>
                    {group.label}
                    <ChevronDown size={14} style={{ opacity: 0.5, transform: isOpen_ ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.2s' }} />
                  </button>
                )}
                {(isOpen_ || effectiveCollapsed) && (
                  <div className="sidebar-group-children-flat">
                    {group.children.map(child => renderNavChild(child))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className="sidebar-footer" style={{ 
            display: 'flex', 
            flexDirection: effectiveCollapsed ? 'column-reverse' : 'row',
            alignItems: 'center', 
            justifyContent: effectiveCollapsed ? 'center' : 'flex-start',
            padding: effectiveCollapsed ? '16px 0' : '16px', 
            background: '#f8fafc',
            borderTop: '1px solid #e2e8f0',
            gap: effectiveCollapsed ? '12px' : '0'
          }}>
          <div className="user-profile" style={{ flex: effectiveCollapsed ? 'none' : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', minWidth: 0 }}>
            <div className="user-avatar" style={{ 
              width: '36px', height: '36px', borderRadius: '10px', 
              background: '#2563eb', color: 'white', display: 'flex', 
              alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.85rem', flexShrink: 0 
            }}>
              {user?.name?.substring(0, 2).toUpperCase() || 'UX'}
            </div>
            {!effectiveCollapsed && (
              <div className="user-info" style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                <div className="user-name" style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user?.name || 'Aman Verma'}
                </div>
                <div className="user-role" style={{ fontSize: '0.7rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '1px' }}>
                  <span>{getRoleLabel(userRole) || (user as any)?.type || 'Doctor'}</span>
                </div>
              </div>
            )}
          </div>
          
          <div style={{ display: 'flex', flexDirection: effectiveCollapsed ? 'column' : 'row', gap: effectiveCollapsed ? '8px' : '2px', flexShrink: 0 }}>
            <button 
              className="sidebar-action-btn" 
              onClick={toggleDarkMode} 
              title="Toggle Theme"
              style={{
                background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '6px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s'
              }}
              onMouseEnter={e => { e.currentTarget.style.color = '#0f172a'; e.currentTarget.style.background = '#e2e8f0' }}
              onMouseLeave={e => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.background = 'transparent' }}
            >
              {darkMode ? <Sun size={16} strokeWidth={1.5} /> : <Moon size={16} strokeWidth={1.5} />}
            </button>
            <button 
              className="sidebar-action-btn" 
              onClick={logout} 
              title="Sign Out"
              style={{
                background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '6px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s'
              }}
              onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = '#fee2e2' }}
              onMouseLeave={e => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.background = 'transparent' }}
            >
              <LogOut size={16} strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
