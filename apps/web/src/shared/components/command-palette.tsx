import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, Calendar, FileText, UsersRound,
  Briefcase, CreditCard, BarChart2, MessageSquare, Package,
  Settings, ChevronRight, Plus, Clock, ArrowRight
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
    nav('Dashboard', '/', <LayoutDashboard size={16} />, ['home']),
    nav('Patients', '/patients', <Users size={16} />, ['patient', 'registry']),
    nav('Family Groups', '/family-groups', <UsersRound size={16} />, ['family']),
    nav('Appointments', '/appointments', <Calendar size={16} />, ['appointment', 'schedule']),
    nav('Medical Cases', '/medical-cases', <FileText size={16} />, ['case', 'consultation']),
    nav('Billing', '/billing', <CreditCard size={16} />, ['bill', 'invoice', 'payment']),
    nav('Payments', '/payments', <CreditCard size={16} />, ['payment', 'transaction']),
    nav('Packages', '/packages', <Package size={16} />, ['package', 'membership']),
    nav('Analytics', '/analytics', <BarChart2 size={16} />, ['report', 'chart', 'stats']),
    nav('SMS & Communications', '/communications', <MessageSquare size={16} />, ['sms', 'whatsapp', 'message']),
    nav('SMS Templates', '/communications/templates', <MessageSquare size={16} />, ['sms', 'template']),
    nav('SMS Reports', '/communications/reports', <MessageSquare size={16} />, ['sms', 'report']),
    nav('WhatsApp', '/communications/whatsapp', <MessageSquare size={16} />, ['whatsapp', 'message']),
    nav('Clinics', '/platform/clinics', <Settings size={16} />, ['clinic', 'organisation']),
    nav('Accounts', '/platform/accounts', <Briefcase size={16} />, ['account', 'staff', 'admin']),

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
      id: 'action-new-billing',
      label: 'Create Billing Record',
      sublabel: 'Add a new bill or invoice',
      icon: <Plus size={16} />,
      category: 'action',
      keywords: ['new', 'create', 'bill', 'invoice', 'billing'],
      onSelect: () => navigate('/billing/create'),
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
  const grouped: Record<string, CommandItem[]> = {
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
