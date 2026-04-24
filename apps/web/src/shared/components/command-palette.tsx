import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, Calendar, FileText, UsersRound,
  Briefcase, CreditCard, BarChart2, MessageSquare, Package,
  Settings, ChevronRight, Plus, Clock, ArrowRight, Brain, 
  BrainCircuit, Activity, ClipboardList, Wallet, Receipt, 
  UserCog, Bell, Mail, ShieldCheck, Database, Pill, Truck
} from 'lucide-react';

// ─── Command / Navigation Item ────────────────────────────────────────────────
interface CommandItem {
  id: string;
  label: string;
  sublabel?: string;
  icon: React.ReactNode;
  category: 'navigation' | 'action';
  keywords?: string[];
  onSelect: () => void;
}

// ─── All Available Commands ────────────────────────────────────────────────────
function buildCommands(navigate: ReturnType<typeof useNavigate>): CommandItem[] {
  const nav = (label: string, path: string, icon: React.ReactNode, keywords?: string[]) => ({
    id: `nav-${path}`,
    label,
    icon,
    category: 'navigation' as const,
    keywords,
    onSelect: () => navigate(path),
  });

  return [
    // ── Navigation ──────────────────────────────────────────────────────────
    nav('Dashboard', '/', <LayoutDashboard size={16} />, ['home', 'overview', 'main']),
    nav('Patients', '/patients', <Users size={16} />, ['patient', 'registry', 'people', 'contacts']),
    nav('Family Groups', '/family-groups', <UsersRound size={16} />, ['family', 'group', 'members']),
    nav('Appointments', '/appointments', <Calendar size={16} />, ['appointment', 'schedule', 'booking', 'visit']),
    nav('Token Queue', '/appointments/queue', <ClipboardList size={16} />, ['token', 'queue', 'waitlist', 'running']),
    nav('Medical Cases', '/medical-cases', <FileText size={16} />, ['case', 'consultation', 'history', 'folder']),
    nav('Vitals Check', '/vitals-check', <Activity size={16} />, ['vital', 'bp', 'weight', 'pulse', 'checkup']),
    nav('AI Remedy Chart', '/ai-remedy-chart', <Brain size={16} />, ['ai', 'remedy', 'chart', 'suggestion', 'drug', 'prescription']),
    nav('AI Analysis', '/ai-analysis', <BrainCircuit size={16} />, ['ai', 'consultant', 'advisor', 'bot', 'assistant', 'analysis']),
    nav('Billing', '/billing', <CreditCard size={16} />, ['bill', 'invoice', 'payment', 'finance']),
    nav('Payments', '/payments', <Wallet size={16} />, ['payment', 'transaction', 'collection', 'ledger']),
    nav('Expenses', '/billing/expenses', <Receipt size={16} />, ['expense', 'outflow', 'cost', 'spend']),
    nav('Deposits', '/billing/deposits', <Wallet size={16} />, ['deposit', 'advance', 'prepaid']),
    nav('Packages', '/packages', <Package size={16} />, ['package', 'membership', 'subscription', 'plan']),
    nav('Analytics', '/analytics', <BarChart2 size={16} />, ['report', 'chart', 'stats', 'analytics', 'performance']),
    nav('Operations Hub', '/operations', <LayoutDashboard size={16} />, ['operation', 'crm', 'leads', 'task']),
    nav('SMS & Communications', '/communications', <MessageSquare size={16} />, ['sms', 'whatsapp', 'message', 'broadcast']),
    nav('SMS Templates', '/communications/templates', <Mail size={16} />, ['sms', 'template', 'canned']),
    nav('Clinics', '/platform/clinics', <Settings size={16} />, ['clinic', 'organisation', 'branch']),
    nav('Staff Base', '/staff', <UserCog size={16} />, ['staff', 'employee', 'user', 'team']),
    
    // ── Settings ────────────────────────────────────────────────────────────
    nav('Settings: Medicines', '/settings/medicines', <Pill size={16} />, ['medicine', 'drug', 'drugstore', 'pharmacy']),
    nav('Settings: Referrals (Leads)', '/settings/referrals', <Briefcase size={16} />, ['referral', 'lead', 'source', 'marketing']),
    nav('Settings: Departments', '/settings/departments', <Settings size={16} />, ['department', 'unit']),
    nav('Settings: Roles & Access', '/settings/roles', <ShieldCheck size={16} />, ['role', 'permission', 'security', 'access']),
    nav('Settings: PDF & Branding', '/settings/pdf', <FileText size={16} />, ['pdf', 'print', 'header', 'brand']),
    nav('Settings: Dispensaries', '/settings/dispensaries', <Database size={16} />, ['dispensary', 'inventory', 'stock']),
    nav('Settings: Couriers', '/settings/couriers', <Truck size={16} />, ['courier', 'shipping', 'delivery']),

    // ── Quick Actions ───────────────────────────────────────────────────────
    {
      id: 'action-new-patient',
      label: 'Add New Patient',
      sublabel: 'Create a new patient record',
      icon: <Plus size={16} />,
      category: 'action',
      keywords: ['new', 'create', 'patient', 'add'],
      onSelect: () => navigate('/patients/add'),
    },
    {
      id: 'action-new-appointment',
      label: 'New Appointment',
      sublabel: 'Book a new appointment',
      icon: <Plus size={16} />,
      category: 'action',
      keywords: ['new', 'book', 'appointment', 'schedule'],
      onSelect: () => navigate('/appointments'),
    },
    {
      id: 'action-new-sms',
      label: 'Send Group SMS',
      sublabel: 'Broadcast a message to patients',
      icon: <Bell size={16} />,
      category: 'action',
      keywords: ['sms', 'group', 'broadcast', 'send', 'message'],
      onSelect: () => navigate('/communications/sms'),
    },
    {
      id: 'action-add-staff',
      label: 'Add Staff Member',
      sublabel: 'Register a new employee',
      icon: <Plus size={16} />,
      category: 'action',
      keywords: ['new', 'staff', 'add', 'employee', 'user'],
      onSelect: () => navigate('/staff/add'),
    },
  ];
}

// ─── Fuzzy match helper ───────────────────────────────────────────────────────
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
  const commands = buildCommands(navigate);

  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = commands.filter((c) => matches(query, c));
  const grouped: { navigation: CommandItem[]; action: CommandItem[] } = {
    navigation: filtered.filter((c) => c.category === 'navigation'),
    action: filtered.filter((c) => c.category === 'action'),
  };

  // Reset on open
  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Scroll active item into view
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

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filtered[activeIndex]) selectItem(filtered[activeIndex]);
      } else if (e.key === 'Escape') {
        onClose();
      }
    },
    [filtered, activeIndex, selectItem, onClose]
  );

  if (!open) return null;

  // Build flat ordered list for active index tracking
  const flatItems = [...grouped.navigation, ...grouped.action];

  return (
    <>
      {/* Backdrop */}
      <div className="cp-backdrop" onClick={onClose} />

      {/* Modal */}
      <div className="cp-modal" role="dialog" aria-modal="true" aria-label="Command palette">
        {/* Search input */}
        <div className="cp-search-wrap">
          <input
            ref={inputRef}
            className="cp-search-input"
            placeholder="Search pages, actions..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={handleKeyDown}
            autoComplete="off"
            spellCheck={false}
          />
          <kbd className="cp-esc-hint">ESC</kbd>
        </div>

        {/* Results */}
        <div className="cp-results" ref={listRef}>
          {filtered.length === 0 && (
            <div className="cp-empty">No results for &ldquo;{query}&rdquo;</div>
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
        </div>

        {/* Footer hint */}
        <div className="cp-footer">
          <span><kbd>↑↓</kbd> navigate</span>
          <span><kbd>↵</kbd> open</span>
          <span><kbd>esc</kbd> close</span>
        </div>
      </div>
    </>
  );
}
