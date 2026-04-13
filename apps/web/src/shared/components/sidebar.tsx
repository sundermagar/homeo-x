import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  CalendarClock,
  Calendar,
  Ticket,
  Stethoscope,
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
  Box,
  Tags,
  Truck,
  HelpCircle,
  FileJson,
  UserCheck,
  ChevronRight,
  ChevronDown,
  Sparkles,
  Clock,
} from 'lucide-react';
import { useAuthStore } from '../stores/auth-store';
import '../styles/sidebar.css';

type NavNode = {
  label: string;
  icon: any;
  path?: string;
  children?: { label: string; icon: any; path: string }[];
};

const NAV_ITEMS: NavNode[] = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
  { label: 'Patients', icon: Users, path: '/patients' },
  {
    label: 'Appointments',
    icon: CalendarClock,
    children: [
      { path: '/appointments',         label: 'Appointments',  icon: CalendarClock },
      { path: '/appointments/calendar',label: 'Calendar',      icon: Calendar },
      { path: '/appointments/queue',   label: 'Token Queue',   icon: Ticket },
    ],
  },
  {
    label: 'Clinical',
    icon: Stethoscope,
    children: [
      { path: '/medical-cases', label: 'Medical Cases', icon: Stethoscope },
    ],
  },
  {
    label: 'Memberships',
    icon: Package,
    children: [
      { path: '/packages',          label: 'Packages',     icon: Package },
      { path: '/packages/tracking', label: 'Pkg Tracking', icon: CalendarCheck },
    ]
  },
  {
    label: 'Communications',
    icon: MessageSquare,
    children: [
      { path: '/settings/messages', label: 'Msg Templates', icon: MessageSquare },
    ]
  },
  {
    label: 'Analytics',
    icon: FileJson,
    children: [
      { path: '/settings/export', label: 'Export Data',    icon: FileJson },
      { path: '/settings/stocks', label: 'Inventory Logs', icon: Database },
    ]
  },
  {
    label: 'Finance',
    icon: Banknote,
    children: [
      { path: '/billing',           label: 'Billing & Finance', icon: Receipt },
      { path: '/payments',          label: 'Payment Ledger',    icon: Banknote },
      { path: '/settings/expenses', label: 'Expenses Head',     icon: Wallet },
    ]
  },
  {
    label: 'Platform',
    icon: Building2,
    children: [
      { path: '/platform/clinics',  label: 'Clinics',  icon: Building2 },
      { path: '/platform/accounts', label: 'Accounts', icon: UserCog },
    ]
  },
  {
    label: 'Settings',
    icon: Settings,
    children: [
      { path: '/settings/departments', label: 'Departments',        icon: Layers },
      { path: '/settings/medicines',   label: 'Medicine Catalog',   icon: Pill },
      { path: '/settings/potencies',   label: 'Potencies',          icon: Sparkles },
      { path: '/settings/frequencies', label: 'Dosage Frequencies', icon: Clock },
      { path: '/settings/dispensaries',label: 'Dispensaries',       icon: Hospital },
      { path: '/settings/packages',    label: 'Package Plans',      icon: Box },
      { path: '/settings/couriers',    label: 'Courier Services',   icon: Truck },
      { path: '/settings/referrals',   label: 'Referral Sources',   icon: UserPlus },
      { path: '/settings/stickers',    label: 'Medicine Stickers',  icon: StickyNote },
      { path: '/settings/doctors',     label: 'Doctors/Clinicians', icon: UserCircle },
      { path: '/settings/staff',       label: 'Staff Management',   icon: UserCheck },
      { path: '/settings/cms',         label: 'Content (CMS)',      icon: Globe },
      { path: '/settings/pdf',         label: 'PDF & Reports',      icon: FileText },
      { path: '/settings/faqs',        label: 'Help & FAQs',        icon: HelpCircle },
    ]
  }
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user, logout } = useAuthStore();
  const location = useLocation();

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    NAV_ITEMS.forEach(node => {
      if (node.children) {
        initial[node.label] = node.children.some(
          child => location.pathname === child.path || location.pathname.startsWith(`${child.path}/`)
        );
      }
    });
    return initial;
  });

  const toggleSection = (label: string) => {
    setExpandedSections(prev => ({ ...prev, [label]: !prev[label] }));
  };

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
          {NAV_ITEMS.map((node) => {
            if (!node.children) {
              return (
                <NavLink
                  key={node.path}
                  to={node.path!}
                  end={node.path === '/'}
                  className={({ isActive }) => `sidebar-item top-level ${isActive ? 'active' : ''}`}
                  onClick={() => {
                    if (window.innerWidth < 1024) onClose();
                  }}
                >
                  <node.icon className="sidebar-item-icon" strokeWidth={2} />
                  <span>{node.label}</span>
                </NavLink>
              );
            }

            const isExpanded = expandedSections[node.label];
            const isChildActive = node.children.some(child => location.pathname === child.path || location.pathname.startsWith(`${child.path}/`));
            
            return (
              <div key={node.label} className="sidebar-section">
                <div 
                  className={`sidebar-item sidebar-folder ${isChildActive && !isExpanded ? 'active-folder' : ''}`}
                  onClick={() => toggleSection(node.label)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <node.icon className="sidebar-item-icon" strokeWidth={2} />
                    <span>{node.label}</span>
                  </div>
                  <span className="sidebar-folder-toggle">
                    {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </span>
                </div>
                
                {isExpanded && (
                  <div className="sidebar-folder-items animate-expand">
                    {node.children.map((child) => (
                      <NavLink
                        key={child.path}
                        to={child.path}
                        end={child.path === '/'}
                        className={({ isActive }) => `sidebar-child-item ${isActive ? 'active' : ''}`}
                        onClick={() => {
                          if (window.innerWidth < 1024) onClose();
                        }}
                      >
                        <span className="sidebar-bullet" />
                        <child.icon className="sidebar-child-icon" strokeWidth={2} />
                        <span>{child.label}</span>
                      </NavLink>
                    ))}
                  </div>
                )}
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
