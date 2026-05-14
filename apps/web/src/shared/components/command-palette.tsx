import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, Calendar, FileText, UsersRound,
  Briefcase, CreditCard, BarChart2, MessageSquare, Package,
  Settings, ChevronRight, Plus, ArrowRight, Brain,
  BrainCircuit, Activity, ClipboardList, Wallet, Receipt,
  UserCog, Bell, Mail, ShieldCheck, Database, Pill, Truck,
  Stethoscope, PackageCheck, MessageCircle, PieChart,
  Building2, Users2, UserCheck, UserPlus, Contact,
  FileBarChart, Download, Boxes, HelpCircle,
  BookOpen, Tags, Bike, LayoutList, Sticker, Cpu, Clock
} from 'lucide-react';
import { useAuthStore } from '@/shared/stores/auth-store';

type Role = 'SuperAdmin' | 'Admin' | 'Clinicadmin' | 'Doctor' | 'Receptionist';

function normalizeRole(): Role {
  const raw =
    (useAuthStore.getState().user as any)?.type ||
    (useAuthStore.getState().user as any)?.role ||
    '';
  const r = raw.toLowerCase().replace(/\s/g, '');
  if (r === 'superadmin') return 'SuperAdmin';
  if (r === 'admin' || r === 'hmis_admin') return 'Admin';
  if (r === 'clinicadmin') return 'Clinicadmin';
  if (r === 'doctor' || r === 'hmis_doctor') return 'Doctor';
  if (r === 'receptionist') return 'Receptionist';
  return 'Receptionist';
}

function canAccess(roles: Role[], userRole: Role): boolean {
  return roles.includes(userRole);
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface CommandItem {
  id: string;
  label: string;
  sublabel?: string;
  icon: React.ReactNode;
  category: 'navigation' | 'action';
  roles: Role[];
  keywords?: string[];
  onSelect: () => void;
}

// ─── Command Builder ──────────────────────────────────────────────────────────
function buildCommands(
  navigate: ReturnType<typeof useNavigate>,
  userRole: Role
): CommandItem[] {
  const ALL: Role[] = ['SuperAdmin', 'Admin', 'Clinicadmin', 'Doctor', 'Receptionist'];
  const CLINICAL: Role[] = ['SuperAdmin', 'Admin', 'Clinicadmin', 'Doctor'];
  const ADMIN_CLINIC: Role[] = ['SuperAdmin', 'Admin', 'Clinicadmin'];
  const ADMIN_ONLY: Role[] = ['SuperAdmin', 'Admin'];
  const BILLING: Role[] = ['SuperAdmin', 'Admin', 'Clinicadmin', 'Doctor', 'Receptionist'];
  const BILLING_ADMIN: Role[] = ['SuperAdmin', 'Admin', 'Clinicadmin', 'Receptionist'];

  const nav = (
    label: string,
    path: string,
    icon: React.ReactNode,
    roles: Role[],
    keywords?: string[]
  ) => ({
    id: `nav-${path}`,
    label,
    icon,
    category: 'navigation' as const,
    roles,
    keywords,
    onSelect: () => navigate(path),
  });

  const action = (
    id: string,
    label: string,
    sublabel: string,
    icon: React.ReactNode,
    roles: Role[],
    navigateTo: string,
    keywords?: string[]
  ) => ({
    id,
    label,
    sublabel,
    icon,
    category: 'action' as const,
    roles,
    keywords,
    onSelect: () => navigate(navigateTo),
  });

  return [
    // ── Quick Actions ────────────────────────────────────────────────────────
    action(
      'action-new-patient', 'Add New Patient', 'Create a new patient record',
      <Plus size={16} />, ALL, '/patients/add',
      ['new', 'create', 'patient', 'add']
    ),
    action(
      'action-new-appointment', 'New Appointment', 'Book a new appointment',
      <Plus size={16} />, ALL, '/appointments',
      ['new', 'book', 'appointment', 'schedule']
    ),
    action(
      'action-new-clinic', 'Add Clinic', 'Register a new clinic or branch',
      <Plus size={16} />, ADMIN_ONLY, '/platform/clinics?add=true',
      ['new', 'clinic', 'add', 'branch', 'organisation']
    ),

    // ── Patient Module ────────────────────────────────────────────────────────
    nav('Patients', '/patients', <Users size={16} />, ALL,
      ['patient', 'registry', 'people', 'contacts']),
    nav('Patient Queue', '/patients/queue', <ClipboardList size={16} />, ALL,
      ['queue', 'patient queue', 'waitlist']),
    nav('Family Groups', '/family-groups', <UsersRound size={16} />, ALL,
      ['family', 'group', 'members']),

    // ── Appointments ──────────────────────────────────────────────────────────
    nav('Appointments', '/appointments', <Calendar size={16} />, ALL,
      ['appointment', 'schedule', 'booking', 'visit']),
    nav('Calendar', '/appointments/calendar', <Calendar size={16} />, ALL,
      ['calendar', 'schedule', 'view']),
    nav('Token Queue', '/appointments/queue', <ClipboardList size={16} />, CLINICAL,
      ['token', 'queue', 'waitlist', 'running']),

    // ── Medical Cases ─────────────────────────────────────────────────────────
    nav('Vitals Check', '/vitals-check', <Activity size={16} />, CLINICAL,
      ['vital', 'bp', 'weight', 'pulse', 'checkup']),
    // nav('AI Analysis', '/ai-analysis', <BrainCircuit size={16} />, CLINICAL,
    //   ['ai', 'consultant', 'advisor', 'bot', 'assistant', 'analysis']),
    nav('Remedy Chart', '/clinical/remedy-chart', <Brain size={16} />, CLINICAL,
      ['remedy', 'chart', 'tree', 'medicine', 'drug']),

    // ── Packages ─────────────────────────────────────────────────────────────
    nav('Packages', '/packages', <Package size={16} />, ADMIN_CLINIC,
      ['package', 'membership', 'subscription', 'plan']),
    nav('Package Tracking', '/packages/tracking', <PackageCheck size={16} />, ADMIN_CLINIC,
      ['tracking', 'package', 'membership']),

    // ── Billing & Payments ────────────────────────────────────────────────────
    nav('Billing', '/billing', <CreditCard size={16} />, BILLING,
      ['bill', 'invoice', 'payment', 'finance']),
    nav('Payments', '/payments', <Wallet size={16} />, BILLING,
      ['payment', 'transaction', 'collection', 'ledger']),
    nav('Custom Bill', '/billing/custom', <Receipt size={16} />, BILLING,
      ['custom', 'bill', 'invoice']),
    nav('Additional Charges', '/billing/additional-charges', <Plus size={16} />, BILLING_ADMIN,
      ['additional', 'charges', 'extra']),
    nav('Day Charges', '/billing/day-charges', <Calendar size={16} />, BILLING_ADMIN,
      ['day', 'charges', 'daily']),
    nav('Deposits', '/billing/deposits', <Wallet size={16} />, BILLING_ADMIN,
      ['deposit', 'advance', 'prepaid']),
    nav('Expenses', '/billing/expenses', <Receipt size={16} />, BILLING_ADMIN,
      ['expense', 'outflow', 'cost', 'spend']),

    // ── Analytics & Reports ─────────────────────────────────────────────────
    nav('Analytics', '/analytics', <BarChart2 size={16} />, CLINICAL,
      ['report', 'chart', 'stats', 'analytics', 'performance']),
    nav('Reports', '/analytics/reports', <PieChart size={16} />, CLINICAL,
      ['report', 'reports', 'financial', 'dues', 'birthdays']),
    nav('Export Data', '/analytics/export', <Download size={16} />, CLINICAL,
      ['export', 'data', 'download', 'csv']),
    nav('Inventory Logs', '/analytics/stocks', <Boxes size={16} />, CLINICAL,
      ['stock', 'inventory', 'logs']),

    // ── Operations & CRM ─────────────────────────────────────────────────────
    nav('Operations Hub', '/operations', <LayoutDashboard size={16} />, ADMIN_CLINIC,
      ['operation', 'crm', 'leads', 'task', 'logistics']),

    // ── Communications ────────────────────────────────────────────────────────
    nav('Group SMS', '/communications/sms', <MessageSquare size={16} />, ADMIN_CLINIC,
      ['sms', 'group', 'broadcast', 'send', 'message']),
    nav('SMS Templates', '/communications/templates', <Mail size={16} />, ADMIN_CLINIC,
      ['sms', 'template', 'canned']),
    nav('SMS Reports', '/communications/reports', <FileBarChart size={16} />, ADMIN_CLINIC,
      ['sms', 'report', 'reports']),
    nav('WhatsApp', '/communications/whatsapp', <MessageCircle size={16} />, ADMIN_CLINIC,
      ['whatsapp', 'message', 'chat']),

    // ── Staff & Platform ─────────────────────────────────────────────────────
    nav('Staff Base', '/staff', <UserCog size={16} />, ADMIN_ONLY,
      ['staff', 'employee', 'user', 'team']),
    nav('Doctors', '/platform/doctors', <UserCog size={16} />, ADMIN_CLINIC,
      ['doctor', 'doctors', 'physician']),
    nav('Employees', '/platform/employees', <Users2 size={16} />, ADMIN_CLINIC,
      ['employee', 'employees', 'staff']),
    nav('Receptionists', '/platform/receptionists', <UserCheck size={16} />, ADMIN_CLINIC,
      ['receptionist', 'receptionists', 'front desk']),
    nav('Clinic Admins', '/platform/clinicadmins', <Contact size={16} />, ADMIN_CLINIC,
      ['clinic', 'admin', 'clinicadmin']),

    nav('Clinics', '/platform/clinics', <Building2 size={16} />, ADMIN_ONLY,
      ['clinic', 'organisation', 'branch']),
    nav('Clinic Accounts', '/platform/accounts', <Building2 size={16} />, ADMIN_ONLY,
      ['account', 'accounts', 'organisation']),

    // ── Settings ────────────────────────────────────────────────────────────
    nav('Settings: Departments', '/settings/departments', <LayoutList size={16} />, ADMIN_CLINIC,
      ['department', 'unit']),
    nav('Settings: Medicines', '/settings/medicines', <Pill size={16} />, ADMIN_CLINIC,
      ['medicine', 'drug', 'drugstore', 'pharmacy']),
    nav('Settings: Dispensaries', '/settings/dispensaries', <Database size={16} />, ADMIN_CLINIC,
      ['dispensary', 'inventory', 'stock']),
    nav('Settings: Referrals', '/settings/referrals', <Briefcase size={16} />, ADMIN_CLINIC,
      ['referral', 'lead', 'source', 'marketing']),
    nav('Settings: Stickers', '/settings/stickers', <Sticker size={16} />, ADMIN_CLINIC,
      ['sticker', 'sticker', 'label']),
    nav('Settings: CMS', '/settings/cms', <Cpu size={16} />, ADMIN_CLINIC,
      ['cms', 'content', 'manage']),
    nav('Settings: PDF & Branding', '/settings/pdf', <FileText size={16} />, ADMIN_CLINIC,
      ['pdf', 'print', 'header', 'brand']),
    nav('Settings: Expenses', '/settings/expenses', <Receipt size={16} />, ADMIN_CLINIC,
      ['expense', 'head', 'category']),
    nav('Settings: Messages', '/settings/messages', <Mail size={16} />, ADMIN_CLINIC,
      ['message', 'template', 'sms', 'email']),
    nav('Settings: Stocks', '/settings/stocks', <Boxes size={16} />, ADMIN_CLINIC,
      ['stock', 'inventory', 'manage']),
    nav('Settings: Stock Logs', '/settings/stock-logs', <Boxes size={16} />, ADMIN_CLINIC,
      ['stock', 'log', 'logs', 'history']),
    nav('Settings: Packages', '/settings/packages', <Package size={16} />, ADMIN_CLINIC,
      ['package', 'plan', 'membership']),
    nav('Settings: Potencies', '/settings/potencies', <Tags size={16} />, ADMIN_CLINIC,
      ['potency', 'potencies', 'dilution']),
    nav('Settings: Frequencies', '/settings/frequencies', <BookOpen size={16} />, ADMIN_CLINIC,
      ['frequency', 'frequencies', 'dosing']),
    nav('Settings: Couriers', '/settings/couriers', <Bike size={16} />, ADMIN_CLINIC,
      ['courier', 'shipping', 'delivery']),
    nav('Settings: FAQs', '/settings/faqs', <HelpCircle size={16} />, ADMIN_CLINIC,
      ['faq', 'faqs', 'help']),
    nav('Settings: Staff', '/settings/staff', <Users2 size={16} />, ADMIN_CLINIC,
      ['staff', 'manage', 'employee']),
    nav('Settings: Roles & Access', '/settings/roles', <ShieldCheck size={16} />, ADMIN_ONLY,
      ['role', 'permission', 'security', 'access']),
  ];
}

// ─── Fuzzy Match ──────────────────────────────────────────────────────────────
function matches(query: string, item: CommandItem): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  return (
    item.label.toLowerCase().includes(q) ||
    (item.sublabel?.toLowerCase().includes(q) ?? false) ||
    item.keywords?.some((k) => k.includes(q)) ||
    item.category.includes(q)
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────
export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const navigate = useNavigate();
  const userRole = normalizeRole();
  const allCommands = buildCommands(navigate, userRole);
  const commands = allCommands.filter((c) => canAccess(c.roles, userRole));

  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = commands.filter((c) => matches(query, c));
  const grouped: { navigation: CommandItem[]; action: CommandItem[] } = {
    navigation: filtered.filter((c) => c.category === 'navigation'),
    action: filtered.filter((c) => c.category === 'action'),
  };

  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    const el = listRef.current?.querySelector('[data-active="true"]') as HTMLElement;
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  const selectItem = useCallback(
    (item: CommandItem) => {
      item.onSelect();
      onClose();
    },
    [onClose]
  );

  const flatItems = [...grouped.action, ...grouped.navigation];

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, flatItems.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (flatItems[activeIndex]) selectItem(flatItems[activeIndex]);
      } else if (e.key === 'Escape') {
        onClose();
      }
    },
    [flatItems, activeIndex, selectItem, onClose]
  );

  if (!open) return null;



  return (
    <>
      <div className="cp-backdrop" onClick={onClose} />
      <div className="cp-modal" role="dialog" aria-modal="true" aria-label="Command palette">
        <div className="cp-search-wrap">
          <input
            ref={inputRef}
            className="cp-search-input"
            placeholder="Search pages, actions..."
            value={query}
            onChange={(e) => { setQuery(e.target.value); setActiveIndex(0); }}
            onKeyDown={handleKeyDown}
            autoComplete="off"
            spellCheck={false}
          />
          <kbd className="cp-esc-hint">ESC</kbd>
        </div>

        <div className="cp-results" ref={listRef}>
          {filtered.length === 0 && (
            <div className="cp-empty">No results for &ldquo;{query}&rdquo;</div>
          )}

          {grouped.action.length > 0 && (
            <div className="cp-group">
              <div className="cp-group-label">Quick Actions</div>
              {grouped.action.map((item) => {
                const flatIdx = flatItems.indexOf(item);
                return (
                  <button
                    key={item.id}
                    data-active={flatIdx === activeIndex}
                    className="cp-item"
                    onClick={() => selectItem(item)}
                    onMouseEnter={() => setActiveIndex(flatIdx)}
                  >
                    <span className="cp-item-icon">{item.icon}</span>
                    <span>
                      <span className="cp-item-label">{item.label}</span>
                      {item.sublabel && (
                        <span className="cp-item-sublabel">{item.sublabel}</span>
                      )}
                    </span>
                    <ArrowRight size={12} className="cp-item-arrow" />
                  </button>
                );
              })}
            </div>
          )}

          {grouped.navigation.length > 0 && (
            <div className="cp-group">
              <div className="cp-group-label">Pages</div>
              {grouped.navigation.map((item) => {
                const flatIdx = flatItems.indexOf(item);
                return (
                  <button
                    key={item.id}
                    data-active={flatIdx === activeIndex}
                    className="cp-item"
                    onClick={() => selectItem(item)}
                    onMouseEnter={() => setActiveIndex(flatIdx)}
                  >
                    <span className="cp-item-icon">{item.icon}</span>
                    <span className="cp-item-label">{item.label}</span>
                    <ChevronRight size={12} className="cp-item-arrow" />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="cp-footer">
          <span><kbd>↑↓</kbd> navigate</span>
          <span><kbd>↵</kbd> open</span>
          <span><kbd>esc</kbd> close</span>
        </div>
      </div>
    </>
  );
}
